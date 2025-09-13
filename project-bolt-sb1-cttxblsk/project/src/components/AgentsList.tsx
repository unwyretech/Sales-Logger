import React, { useState } from 'react';
import { Search, Filter, Phone, Clock, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { formatTime } from '../utils/dataUtils';
import type { Database } from '../lib/supabase';

type Tables = Database['public']['Tables'];
type Campaign = Tables['campaigns']['Row'];
type CampaignTeam = Tables['campaign_teams']['Row'];
type Agent = Tables['agents']['Row'];
type CallData = Tables['call_data']['Row'];

interface AgentsListProps {
  campaigns: Campaign[];
  agents: Agent[];
  campaignTeams: CampaignTeam[];
  callData: CallData[];
  date: string;
}

export function AgentsList({ campaigns, agents, campaignTeams, callData, date }: AgentsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [historyStartDate, setHistoryStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [historyEndDate, setHistoryEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Calculate daily summaries
  const dailySummaries = agents.map(agent => {
    const agentCalls = callData.filter(call => call.agent_id === agent.id && call.date === date);
    const totalCalls = agentCalls.reduce((sum, call) => sum + call.calls_made, 0);
    const totalCallTime = agentCalls.reduce((sum, call) => sum + call.total_call_time, 0);
    const totalSales = agentCalls.reduce((sum, call) => sum + call.sales_made, 0);
    
    return {
      agentId: agent.id,
      date,
      totalCalls,
      totalCallTime,
      totalSales,
      averageCallTime: totalCalls > 0 ? totalCallTime / totalCalls : 0,
    };
  });
  
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = !selectedTeam || agent.campaign_team_id === selectedTeam;
    return matchesSearch && matchesTeam;
  });

  const getTeamName = (teamId: string | null) => campaignTeams.find(team => team.id === teamId)?.name || 'No Team';
  const getTeamColor = (teamId: string | null) => campaignTeams.find(team => team.id === teamId)?.color || '#6b7280';
  const getCampaignName = (teamId: string | null) => {
    const team = campaignTeams.find(t => t.id === teamId);
    return campaigns.find(c => c.id === team?.campaign_id)?.name || 'No Campaign';
  };

  // Get agent history data
  const getAgentHistory = (agentId: string) => {
    const agentCalls = callData.filter(call => 
      call.agent_id === agentId && 
      call.date >= historyStartDate && 
      call.date <= historyEndDate
    );
    
    // Group by date
    const dailyData = new Map();
    agentCalls.forEach(call => {
      const existing = dailyData.get(call.date) || { calls: 0, callTime: 0, sales: 0 };
      dailyData.set(call.date, {
        calls: existing.calls + call.calls_made,
        callTime: existing.callTime + call.total_call_time,
        sales: existing.sales + call.sales_made
      });
    });
    
    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Teams</option>
              {campaignTeams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map(agent => {
          const summary = dailySummaries.find(s => s.agentId === agent.id);
          const teamColor = getTeamColor(agent.team_id);
          
          return (
            <div key={agent.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-600">{agent.email}</p>
                    <div className="flex items-center mt-2">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: teamColor }}
                      />
                      <div className="text-xs">
                        <div className="font-medium text-gray-700">{getCampaignName(agent.campaign_team_id)}</div>
                        <div className="text-gray-500">{getTeamName(agent.campaign_team_id)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <button
                      onClick={() => setSelectedAgent(agent)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="View History"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {summary && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Calls</span>
                      </div>
                      <span className="text-lg font-bold">{summary.totalCalls}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Call Time</span>
                      </div>
                      <span className="text-lg font-bold">{formatTime(summary.totalCallTime)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">Sales</span>
                      </div>
                      <span className="text-lg font-bold">{summary.totalSales}</span>
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Call Time</span>
                        <span className="font-medium">{formatTime(summary.averageCallTime)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {!summary && (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No data for today</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No agents found matching your criteria.</p>
        </div>
      )}

      {/* Agent History Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedAgent.name} - Performance History</h3>
                <p className="text-gray-600">{getCampaignName(selectedAgent.campaign_team_id)} - {getTeamName(selectedAgent.campaign_team_id)}</p>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Date Range Picker */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* History Chart */}
            <div className="space-y-6">
              {(() => {
                const historyData = getAgentHistory(selectedAgent.id);
                const maxCalls = Math.max(...historyData.map(d => d.calls), 1);
                const maxSales = Math.max(...historyData.map(d => d.sales), 1);
                const maxCallTime = Math.max(...historyData.map(d => d.callTime), 1);
                
                return (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-600">Total Calls</p>
                            <p className="text-2xl font-bold text-blue-700">
                              {historyData.reduce((sum, d) => sum + d.calls, 0)}
                            </p>
                          </div>
                          <Phone className="w-8 h-8 text-blue-500" />
                        </div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-600">Total Sales</p>
                            <p className="text-2xl font-bold text-green-700">
                              {historyData.reduce((sum, d) => sum + d.sales, 0)}
                            </p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-green-500" />
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-purple-600">Total Call Time</p>
                            <p className="text-2xl font-bold text-purple-700">
                              {formatTime(historyData.reduce((sum, d) => sum + d.callTime, 0))}
                            </p>
                          </div>
                          <Clock className="w-8 h-8 text-purple-500" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Charts */}
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">Daily Calls</h4>
                        <div className="space-y-2">
                          {historyData.map(day => (
                            <div key={day.date} className="flex items-center space-x-3">
                              <span className="text-sm text-gray-600 w-20">{new Date(day.date).toLocaleDateString()}</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-4">
                                <div 
                                  className="bg-blue-500 h-4 rounded-full flex items-center justify-end pr-2"
                                  style={{ width: `${(day.calls / maxCalls) * 100}%` }}
                                >
                                  <span className="text-xs text-white font-medium">{day.calls}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">Daily Sales</h4>
                        <div className="space-y-2">
                          {historyData.map(day => (
                            <div key={day.date} className="flex items-center space-x-3">
                              <span className="text-sm text-gray-600 w-20">{new Date(day.date).toLocaleDateString()}</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-4">
                                <div 
                                  className="bg-green-500 h-4 rounded-full flex items-center justify-end pr-2"
                                  style={{ width: `${maxSales > 0 ? (day.sales / maxSales) * 100 : 0}%` }}
                                >
                                  <span className="text-xs text-white font-medium">{day.sales}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-4">Daily Call Time</h4>
                        <div className="space-y-2">
                          {historyData.map(day => (
                            <div key={day.date} className="flex items-center space-x-3">
                              <span className="text-sm text-gray-600 w-20">{new Date(day.date).toLocaleDateString()}</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-4">
                                <div 
                                  className="bg-purple-500 h-4 rounded-full flex items-center justify-end pr-2"
                                  style={{ width: `${(day.callTime / maxCallTime) * 100}%` }}
                                >
                                  <span className="text-xs text-white font-medium">{formatTime(day.callTime)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {historyData.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No data available for the selected date range</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}