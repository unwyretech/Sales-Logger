import React from 'react';
import { Users, Phone, Clock, TrendingUp, Award } from 'lucide-react';
import { formatTime } from '../utils/dataUtils';
import type { Database } from '../lib/supabase';

type Tables = Database['public']['Tables'];
type Team = Tables['teams']['Row'];
type Agent = Tables['agents']['Row'];
type CallData = Tables['call_data']['Row'];

interface TeamOverviewProps {
  teams: Team[];
  agents: Agent[];
  callData: CallData[];
  date: string;
  detailed?: boolean;
}

export function TeamOverview({ teams, agents, callData, date, detailed = false }: TeamOverviewProps) {
  // Calculate team summaries
  const teamSummaries = teams.map(team => {
    const teamAgents = agents.filter(agent => agent.team_id === team.id);
    const teamCalls = callData.filter(call => {
      const agent = agents.find(a => a.id === call.agent_id);
      return agent?.team_id === team.id && call.date === date;
    });

    const totalCalls = teamCalls.reduce((sum, call) => sum + call.calls_made, 0);
    const totalCallTime = teamCalls.reduce((sum, call) => sum + call.total_call_time, 0);
    const totalSales = teamCalls.reduce((sum, call) => sum + call.sales_made, 0);

    return {
      teamId: team.id,
      totalCalls,
      totalCallTime,
      totalSales,
      agentCount: teamAgents.length,
      averageCallTime: totalCalls > 0 ? totalCallTime / totalCalls : 0,
      averageCallsPerAgent: teamAgents.length > 0 ? totalCalls / teamAgents.length : 0,
    };
  });

  if (!detailed) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h3>
        <div className="space-y-4">
          {teamSummaries.slice(0, 4).map((summary) => {
            const team = teams.find(t => t.id === summary.teamId);
            if (!team) return null;

            return (
              <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{team.name}</h4>
                    <p className="text-sm text-gray-600">{summary.agentCount} agents</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{summary.totalCalls}</p>
                  <p className="text-sm text-gray-600">calls</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamSummaries.map((summary) => {
          const team = teams.find(t => t.id === summary.teamId);
          if (!team) return null;

          const conversionRate = summary.totalCalls > 0 ? (summary.totalSales / summary.totalCalls * 100) : 0;

          return (
            <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div 
                className="h-2"
                style={{ backgroundColor: team.color }}
              />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{summary.agentCount}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Phone className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">Total Calls</p>
                      <p className="text-xl font-bold text-blue-600">{summary.totalCalls}</p>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">Sales</p>
                      <p className="text-xl font-bold text-green-600">{summary.totalSales}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Call Time</span>
                      <span className="text-sm font-medium">{formatTime(summary.totalCallTime)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Call Time</span>
                      <span className="text-sm font-medium">{formatTime(summary.averageCallTime)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Calls/Agent</span>
                      <span className="text-sm font-medium">{summary.averageCallsPerAgent.toFixed(1)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Conversion Rate</span>
                      <span className="text-sm font-medium">{conversionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Rankings */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-yellow-500" />
          Team Rankings
        </h3>
        
        <div className="space-y-3">
          {teamSummaries
            .sort((a, b) => b.totalCalls - a.totalCalls)
            .map((summary, index) => {
              const team = teams.find(t => t.id === summary.teamId);
              if (!team) return null;

              return (
                <div key={team.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                      <span className="text-sm font-bold text-gray-600">#{index + 1}</span>
                    </div>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-medium text-gray-900">{team.name}</span>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{summary.totalCalls}</p>
                      <p className="text-gray-600">Calls</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{summary.totalSales}</p>
                      <p className="text-gray-600">Sales</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{formatTime(summary.totalCallTime)}</p>
                      <p className="text-gray-600">Time</p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}