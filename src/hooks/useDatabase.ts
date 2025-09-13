import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/supabase';

type Tables = Database['public']['Tables'];
type Campaign = Tables['campaigns']['Row'];
type CampaignTeam = Tables['campaign_teams']['Row'];
type Agent = Tables['agents']['Row'];
type CallData = Tables['call_data']['Row'];

export function useDatabase() {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignTeams, setCampaignTeams] = useState<CampaignTeam[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [callData, setCallData] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!profile?.is_approved) return;

    const interval = setInterval(() => {
      fetchData();
    }, 300000);

    return () => clearInterval(interval);
  }, [profile?.is_approved]);

  // Fetch all data
  const fetchData = async () => {
    if (!profile?.is_approved) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [campaignsResult, campaignTeamsResult, agentsResult, callDataResult] = await Promise.all([
        supabase.from('campaigns').select('*').order('name'),
        supabase.from('campaign_teams').select('*').order('name'),
        supabase.from('agents').select('*').order('name'),
        supabase.from('call_data').select('*').order('date', { ascending: false })
      ]);

      if (campaignsResult.error) throw campaignsResult.error;
      if (campaignTeamsResult.error) throw campaignTeamsResult.error;
      if (agentsResult.error) throw agentsResult.error;
      if (callDataResult.error) throw callDataResult.error;

      setCampaigns(campaignsResult.data || []);
      setCampaignTeams(campaignTeamsResult.data || []);
      setAgents(agentsResult.data || []);
      setCallData(callDataResult.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!profile?.is_approved) return;

    // Campaigns subscription
    const campaignsSubscription = supabase
      .channel('campaigns-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'campaigns' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCampaigns(prev => [...prev, payload.new as Campaign].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setCampaigns(prev => prev.map(campaign => 
              campaign.id === payload.new.id ? payload.new as Campaign : campaign
            ).sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'DELETE') {
            setCampaigns(prev => prev.filter(campaign => campaign.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Campaign teams subscription
    const campaignTeamsSubscription = supabase
      .channel('campaign-teams-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_teams' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCampaignTeams(prev => [...prev, payload.new as CampaignTeam].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setCampaignTeams(prev => prev.map(team => 
              team.id === payload.new.id ? payload.new as CampaignTeam : team
            ).sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'DELETE') {
            setCampaignTeams(prev => prev.filter(team => team.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Agents subscription
    const agentsSubscription = supabase
      .channel('agents-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAgents(prev => [...prev, payload.new as Agent].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setAgents(prev => prev.map(agent => 
              agent.id === payload.new.id ? payload.new as Agent : agent
            ).sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'DELETE') {
            setAgents(prev => prev.filter(agent => agent.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Call data subscription
    const callDataSubscription = supabase
      .channel('call-data-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'call_data' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCallData(prev => [payload.new as CallData, ...prev].sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            ));
          } else if (payload.eventType === 'UPDATE') {
            setCallData(prev => prev.map(call => 
              call.id === payload.new.id ? payload.new as CallData : call
            ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          } else if (payload.eventType === 'DELETE') {
            setCallData(prev => prev.filter(call => call.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      campaignsSubscription.unsubscribe();
      campaignTeamsSubscription.unsubscribe();
      agentsSubscription.unsubscribe();
      callDataSubscription.unsubscribe();
    };
  }, [profile?.is_approved]);

  // Campaign operations
  const createCampaign = async (campaign: Tables['campaigns']['Insert']) => {
    const { data, error } = await supabase.from('campaigns').insert(campaign).select().single();
    if (error) throw error;
    return data;
  };

  const updateCampaign = async (id: string, updates: Tables['campaigns']['Update']) => {
    const { data, error } = await supabase.from('campaigns').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) throw error;
  };

  // Campaign team operations
  const createCampaignTeam = async (team: Tables['campaign_teams']['Insert']) => {
    const { data, error } = await supabase.from('campaign_teams').insert(team).select().single();
    if (error) throw error;
    return data;
  };

  const updateCampaignTeam = async (id: string, updates: Tables['campaign_teams']['Update']) => {
    const { data, error } = await supabase.from('campaign_teams').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  };

  const deleteCampaignTeam = async (id: string) => {
    const { error } = await supabase.from('campaign_teams').delete().eq('id', id);
    if (error) throw error;
  };

  // Agent operations
  const createAgent = async (agent: Tables['agents']['Insert']) => {
    const { data, error } = await supabase.from('agents').insert(agent).select().single();
    if (error) throw error;
    return data;
  };

  const createAgents = async (agentsList: Tables['agents']['Insert'][]) => {
    const { data, error } = await supabase.from('agents').insert(agentsList).select();
    if (error) throw error;
    return data;
  };

  const updateAgent = async (id: string, updates: Tables['agents']['Update']) => {
    const { data, error } = await supabase.from('agents').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) throw error;
  };

  // Call data operations
  const upsertCallData = async (callDataList: Tables['call_data']['Insert'][]) => {
    const { data, error } = await supabase.from('call_data').upsert(callDataList, {
      onConflict: 'agent_id,date,hour'
    }).select();
    if (error) throw error;
    return data;
  };

  const clearAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        supabase.from('call_data').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('agent_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('agents').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('campaign_teams').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.is_approved]);

  return {
    campaigns,
    campaignTeams,
    agents,
    callData,
    loading,
    error,
    fetchData,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    createCampaignTeam,
    updateCampaignTeam,
    deleteCampaignTeam,
    createAgent,
    createAgents,
    updateAgent,
    deleteAgent,
    upsertCallData,
    clearAllData
  };
}