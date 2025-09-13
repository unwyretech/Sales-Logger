import React, { useState } from 'react';
import { Users, Plus, Edit, Trash2, MessageSquare, Save, X } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AgentNote {
  id: string;
  agent_id: string;
  note: string;
  created_by: string;
  created_at: string;
}

export function AgentManagement() {
  const { campaigns, campaignTeams, agents, createAgent, updateAgent, deleteAgent } = useDatabase();
  const { profile } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agentNotes, setAgentNotes] = useState<AgentNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [newAgent, setNewAgent] = useState({
    name: '',
    email: '',
    campaign_team_id: '',
    is_active: true
  });
  const [showAddAgent, setShowAddAgent] = useState(false);

  // Fetch notes for selected agent
  const fetchAgentNotes = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from('agent_notes')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgentNotes(data || []);
    } catch (error) {
      console.error('Error fetching agent notes:', error);
    }
  };

  const addNote = async () => {
    if (!selectedAgent || !newNote.trim()) return;

    try {
      const { error } = await supabase
        .from('agent_notes')
        .insert({
          agent_id: selectedAgent,
          note: newNote.trim(),
          created_by: profile?.user_id
        });

      if (error) throw error;
      
      setNewNote('');
      fetchAgentNotes(selectedAgent);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleAddAgent = async () => {
    if (!newAgent.name || !newAgent.email || !newAgent.campaign_team_id) return;

    try {
      await createAgent(newAgent);
      setNewAgent({ name: '', email: '', campaign_team_id: '', is_active: true });
      setShowAddAgent(false);
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const handleUpdateAgent = async (agentId: string, updates: any) => {
    try {
      await updateAgent(agentId, updates);
      setEditingAgent(null);
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await deleteAgent(agentId);
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const getTeamName = (teamId: string | null) => {
    const team = campaignTeams.find(t => t.id === teamId);
    const campaign = campaigns.find(c => c.id === team?.campaign_id);
    return team ? `${campaign?.name || 'Unknown'} - ${team.name}` : 'No Team';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              Agent Management
            </h2>
            <p className="text-gray-600 mt-1">Manage agents, teams, and notes</p>
          </div>
          <button
            onClick={() => setShowAddAgent(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Agent</span>
          </button>
        </div>
      </div>

      {/* Add Agent Modal */}
      {showAddAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Agent</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newAgent.email}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                <select
                  value={newAgent.campaign_team_id}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, campaign_team_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Team</option>
                  {campaignTeams.map(team => {
                    const campaign = campaigns.find(c => c.id === team.campaign_id);
                    return (
                      <option key={team.id} value={team.id}>
                        {campaign?.name} - {team.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newAgent.is_active}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddAgent}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Agent
              </button>
              <button
                onClick={() => setShowAddAgent(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agents List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Agent</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Team</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {editingAgent === agent.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          defaultValue={agent.name}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          onBlur={(e) => handleUpdateAgent(agent.id, { name: e.target.value })}
                        />
                        <input
                          type="email"
                          defaultValue={agent.email}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          onBlur={(e) => handleUpdateAgent(agent.id, { email: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-gray-900">{agent.name}</div>
                        <div className="text-sm text-gray-600">{agent.email}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingAgent === agent.id ? (
                      <select
                        defaultValue={agent.campaign_team_id || ''}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                        onBlur={(e) => handleUpdateAgent(agent.id, { campaign_team_id: e.target.value || null })}
                      >
                        <option value="">No Team</option>
                        {campaignTeams.map(team => {
                          const campaign = campaigns.find(c => c.id === team.campaign_id);
                          return (
                            <option key={team.id} value={team.id}>
                              {campaign?.name} - {team.name}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-600">{getTeamName(agent.campaign_team_id)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingAgent === agent.id ? (
                      <input
                        type="checkbox"
                        defaultChecked={agent.is_active}
                        className="rounded border-gray-300"
                        onChange={(e) => handleUpdateAgent(agent.id, { is_active: e.target.checked })}
                      />
                    ) : (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        agent.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {editingAgent === agent.id ? (
                        <button
                          onClick={() => setEditingAgent(null)}
                          className="text-green-600 hover:text-green-800"
                          title="Save"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingAgent(agent.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          setSelectedAgent(agent.id);
                          fetchAgentNotes(agent.id);
                        }}
                        className="text-purple-600 hover:text-purple-800"
                        title="View Notes"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Notes Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Agent Notes - {agents.find(a => a.id === selectedAgent)?.name}
              </h3>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Add Note */}
            <div className="mb-6">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <button
                onClick={addNote}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Note
              </button>
            </div>
            
            {/* Notes List */}
            <div className="space-y-4">
              {agentNotes.map((note) => (
                <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-900 mb-2">{note.note}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
              
              {agentNotes.length === 0 && (
                <p className="text-gray-500 text-center py-4">No notes yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}