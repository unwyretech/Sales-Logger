import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Users, Phone, Clock, TrendingUp, Maximize, Minimize } from 'lucide-react';
import { formatTime } from '../utils/dataUtils';
import { cookieUtils } from '../utils/cookieUtils';
import type { Database } from '../lib/supabase';

type Tables = Database['public']['Tables'];
type Campaign = Tables['campaigns']['Row'];
type CampaignTeam = Tables['campaign_teams']['Row'];
type Agent = Tables['agents']['Row'];
type CallData = Tables['call_data']['Row'];

interface RotatingDashboardProps {
  campaigns: Campaign[];
  campaignTeams: CampaignTeam[];
  agents: Agent[];
  callData: CallData[];
  date: string;
}

export function RotatingDashboard({ campaigns, campaignTeams, agents, callData, date }: RotatingDashboardProps) {
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [interval, setInterval] = useState(() => cookieUtils.getDashboardSetting('rotatingInterval', 10));

  // Filter teams that have agents
  const teamsWithAgents = campaignTeams.filter(team => 
    agents.some(agent => agent.campaign_team_id === team.id)
  );

  const currentTeam = teamsWithAgents[currentTeamIndex];

  // Auto-rotate every 10 seconds
  useEffect(() => {
    if (!isPlaying || teamsWithAgents.length === 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCurrentTeamIndex(prev => (prev + 1) % teamsWithAgents.length);
          return interval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isPlaying, teamsWithAgents.length, interval]);

  const nextTeam = () => {
    setCurrentTeamIndex(prev => (prev + 1) % teamsWithAgents.length);
    setTimeLeft(interval);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setTimeLeft(interval);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const updateInterval = (newInterval: number) => {
    setInterval(newInterval);
    setTimeLeft(newInterval);
    cookieUtils.setDashboardSetting('rotatingInterval', newInterval);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (teamsWithAgents.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teams Available</h3>
          <p className="text-gray-600">Create teams and add agents to see the rotating dashboard.</p>
        </div>
      </div>
    );
  }

  // Get current team data
  const teamAgents = agents.filter(agent => agent.campaign_team_id === currentTeam.id);
  const teamCallData = callData.filter(call => {
    const agent = agents.find(a => a.id === call.agent_id);
    return agent?.campaign_team_id === currentTeam.id && call.date === date;
  });

  // Calculate agent performance
  const agentPerformance = teamAgents.map(agent => {
    const agentCalls = teamCallData.filter(call => call.agent_id === agent.id);
    const totalCalls = agentCalls.reduce((sum, call) => sum + call.calls_made, 0);
    const totalCallTime = agentCalls.reduce((sum, call) => sum + call.total_call_time, 0);
    const totalSales = agentCalls.reduce((sum, call) => sum + call.sales_made, 0);

    return {
      agent,
      totalCalls,
      totalCallTime,
      totalSales,
      averageCallTime: totalCalls > 0 ? totalCallTime / totalCalls : 0
    };
  });

  const campaign = campaigns.find(c => c.id === currentTeam.campaign_id);

  const dashboardContent = (
    <div className="space-y-6">
      {/* Controls */}
      <div className={`bg-white rounded-xl shadow-sm p-4 border border-gray-100 ${isFullscreen ? 'fixed top-4 left-4 right-4 z-50' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlayPause}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            
            <button
              onClick={nextTeam}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              <span>Next</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Interval:</label>
              <select
                value={interval}
                onChange={(e) => updateInterval(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
              </select>
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Team {currentTeamIndex + 1} of {teamsWithAgents.length}
            </div>
            {isPlaying && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Next in {timeLeft}s</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Dashboard */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${isFullscreen ? 'mt-20' : ''}`}>
        {/* Team Header */}
        <div 
          className="h-3"
          style={{ backgroundColor: currentTeam.color }}
        />
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{currentTeam.name}</h2>
              <p className="text-gray-600">{campaign?.name} • {teamAgents.length} agents • {new Date(date).toLocaleDateString()}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {agentPerformance.reduce((sum, agent) => sum + agent.totalCalls, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Calls</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {agentPerformance.reduce((sum, agent) => sum + agent.totalSales, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Sales</div>
              </div>
            </div>
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agentPerformance.map(({ agent, totalCalls, totalCallTime, totalSales, averageCallTime }) => (
              <div key={agent.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
                  <div className={`w-3 h-3 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-gray-600">Calls</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{totalCalls}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-purple-500" />
                      <span className="text-xs text-gray-600">Time</span>
                    </div>
                    <span className="text-sm font-bold text-purple-600">{formatTime(totalCallTime)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-gray-600">Sales</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">{totalSales}</span>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Avg Call</span>
                      <span className="font-medium">{formatTime(averageCallTime)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {agentPerformance.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No agents in this team</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-40 overflow-y-auto">
        <div className="min-h-screen p-4">
          {dashboardContent}
        </div>
      </div>
    );
  }

  return dashboardContent;
}