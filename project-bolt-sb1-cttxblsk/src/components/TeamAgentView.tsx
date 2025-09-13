import React, { useState } from 'react';
import { ArrowLeft, Clock, Phone, TrendingUp, Target } from 'lucide-react';
import { formatTime } from '../utils/dataUtils';
import type { Database } from '../lib/supabase';

type Tables = Database['public']['Tables'];
type Team = Tables['teams']['Row'];
type Agent = Tables['agents']['Row'];
type CallData = Tables['call_data']['Row'];

interface TeamAgentViewProps {
  team: Team;
  agents: Agent[];
  callData: CallData[];
  date: string;
  onBack: () => void;
}

export function TeamAgentView({ team, agents, callData, date, onBack }: TeamAgentViewProps) {
  const [sortBy, setSortBy] = useState<'name' | 'calls' | 'sales' | 'time'>('name');

  // Filter agents for this team
  const teamAgents = agents.filter(agent => agent.team_id === team.id);
  
  // Filter call data for this team and date
  const teamCallData = callData.filter(call => {
    const agent = agents.find(a => a.id === call.agent_id);
    return agent?.team_id === team.id && call.date === date;
  });

  // Calculate agent performance data
  const agentPerformance = teamAgents.map(agent => {
    const agentCalls = teamCallData.filter(call => call.agent_id === agent.id);
    
    // Calculate hourly data (8am to 5pm)
    const hourlyData = [];
    for (let hour = 8; hour <= 17; hour++) {
      const hourCalls = agentCalls.filter(call => call.hour === hour);
      const calls = hourCalls.reduce((sum, call) => sum + call.calls_made, 0);
      const callTime = hourCalls.reduce((sum, call) => sum + call.total_call_time, 0);
      const sales = hourCalls.reduce((sum, call) => sum + call.sales_made, 0);
      
      hourlyData.push({
        hour,
        calls,
        callTime,
        sales
      });
    }

    // Calculate daily totals
    const totalCalls = agentCalls.reduce((sum, call) => sum + call.calls_made, 0);
    const totalCallTime = agentCalls.reduce((sum, call) => sum + call.total_call_time, 0);
    const totalSales = agentCalls.reduce((sum, call) => sum + call.sales_made, 0);

    return {
      agent,
      hourlyData,
      totalCalls,
      totalCallTime,
      totalSales,
      averageCallTime: totalCalls > 0 ? totalCallTime / totalCalls : 0
    };
  });

  // Sort agents based on selected criteria
  const sortedAgents = [...agentPerformance].sort((a, b) => {
    switch (sortBy) {
      case 'calls':
        return b.totalCalls - a.totalCalls;
      case 'sales':
        return b.totalSales - a.totalSales;
      case 'time':
        return b.totalCallTime - a.totalCallTime;
      default:
        return a.agent.name.localeCompare(b.agent.name);
    }
  });

  // Get conditional formatting color based on call time (40 minutes target)
  const getCallTimeColor = (minutes: number) => {
    if (minutes === 0) return 'bg-gray-100 text-gray-500';
    
    const targetMinutes = 40;
    const ratio = minutes / targetMinutes;
    
    if (ratio >= 1.0) return 'bg-green-200 text-green-800'; // Green for meeting/exceeding target
    if (ratio >= 0.75) return 'bg-yellow-200 text-yellow-800'; // Yellow for close to target
    if (ratio >= 0.5) return 'bg-orange-200 text-orange-800'; // Orange for below target
    return 'bg-red-200 text-red-800'; // Red for well below target
  };

  // Get conditional formatting for calls (relative to team performance)
  const getCallsColor = (calls: number, allCalls: number[]) => {
    if (calls === 0) return 'bg-gray-100 text-gray-500';
    
    const max = Math.max(...allCalls);
    const min = Math.min(...allCalls.filter(c => c > 0));
    
    if (max === min) return 'bg-blue-100 text-blue-800';
    
    const ratio = (calls - min) / (max - min);
    
    if (ratio >= 0.8) return 'bg-green-200 text-green-800';
    if (ratio >= 0.6) return 'bg-yellow-200 text-yellow-800';
    if (ratio >= 0.4) return 'bg-orange-200 text-orange-800';
    return 'bg-red-200 text-red-800';
  };

  // Get conditional formatting for sales (relative to team performance)
  const getSalesColor = (sales: number, allSales: number[]) => {
    if (sales === 0) return 'bg-gray-100 text-gray-500';
    
    const max = Math.max(...allSales);
    const min = Math.min(...allSales.filter(s => s > 0));
    
    if (max === min) return 'bg-blue-100 text-blue-800';
    
    const ratio = max > min ? (sales - min) / (max - min) : 0.5;
    
    if (ratio >= 0.8) return 'bg-green-200 text-green-800';
    if (ratio >= 0.6) return 'bg-yellow-200 text-yellow-800';
    if (ratio >= 0.4) return 'bg-orange-200 text-orange-800';
    return 'bg-red-200 text-red-800';
  };

  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8am to 5pm
  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}-${(hour + 1).toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Teams</span>
            </button>
            <div className="flex items-center space-x-3">
              <div 
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                <p className="text-gray-600">{teamAgents.length} agents • {new Date(date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Target: 40min per hour</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="calls">Sort by Calls</option>
              <option value="sales">Sort by Sales</option>
              <option value="time">Sort by Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-3 text-left text-sm font-semibold sticky left-0 bg-blue-600 z-10 min-w-[120px]">
                  AGENT
                </th>
                {hours.map(hour => (
                  <th key={hour} className="px-3 py-3 text-center text-sm font-semibold min-w-[80px]">
                    {formatHour(hour)}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-sm font-semibold min-w-[100px]">
                  TOTAL TIME
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold min-w-[80px]">
                  CALLS
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold min-w-[80px]">
                  SALES
                </th>
              </tr>
              
              {/* Time Target Row */}
              <tr className="bg-blue-500 text-white text-xs">
                <td className="px-4 py-2 font-medium sticky left-0 bg-blue-500 z-10">
                  TIME TARGET
                </td>
                {hours.map(hour => (
                  <td key={hour} className="px-3 py-2 text-center font-medium">
                    00:40
                  </td>
                ))}
                <td className="px-4 py-2 text-center font-medium">
                  06:40
                </td>
                <td className="px-4 py-2 text-center font-medium">
                  -
                </td>
                <td className="px-4 py-2 text-center font-medium">
                  -
                </td>
              </tr>
            </thead>
            
            <tbody>
              {sortedAgents.map((agentData) => {
                // Get all hourly call times for conditional formatting
                const allHourlyCallTimes = agentData.hourlyData.map(h => h.callTime);
                const allHourlyCalls = agentData.hourlyData.map(h => h.calls);
                const allHourlySales = agentData.hourlyData.map(h => h.sales);
                
                return (
                  <tr key={agentData.agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {/* Agent Name */}
                    <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                      {agentData.agent.name.toUpperCase()}
                    </td>

                    {/* Hourly Data */}
                    {agentData.hourlyData.map((hourData) => (
                      <td key={hourData.hour} className="px-3 py-3 text-center">
                        <div className={`px-2 py-1 rounded text-xs font-bold ${getCallTimeColor(hourData.callTime)}`}>
                          {hourData.callTime > 0 
                            ? `${Math.floor(hourData.callTime / 60).toString().padStart(2, '0')}:${(hourData.callTime % 60).toString().padStart(2, '0')}`
                            : '00:00'
                          }
                        </div>
                      </td>
                    ))}

                    {/* Total Time */}
                    <td className="px-4 py-3 text-center">
                      <div className={`inline-block px-3 py-1 rounded text-sm font-bold ${getCallTimeColor(agentData.totalCallTime)}`}>
                        {agentData.totalCallTime > 0 
                          ? `${Math.floor(agentData.totalCallTime / 60).toString().padStart(2, '0')}:${(agentData.totalCallTime % 60).toString().padStart(2, '0')}`
                          : '00:00'
                        }
                      </div>
                    </td>

                    {/* Total Calls */}
                    <td className="px-4 py-3 text-center">
                      <div className={`inline-block px-3 py-1 rounded text-sm font-bold ${getCallsColor(agentData.totalCalls, sortedAgents.map(a => a.totalCalls))}`}>
                        {agentData.totalCalls}
                      </div>
                    </td>

                    {/* Total Sales */}
                    <td className="px-4 py-3 text-center">
                      <div className={`inline-block px-3 py-1 rounded text-sm font-bold ${getSalesColor(agentData.totalSales, sortedAgents.map(a => a.totalSales))}`}>
                        {agentData.totalSales}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Call Time (40min target per hour)</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-200 rounded"></div>
                <span>40+ minutes (Meeting/Exceeding Target)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-200 rounded"></div>
                <span>30-39 minutes (Close to Target)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-200 rounded"></div>
                <span>20-29 minutes (Below Target)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-200 rounded"></div>
                <span>0-19 minutes (Well Below Target)</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Calls & Sales (Relative to Team)</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-200 rounded"></div>
                <span>Top 20% Performance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-200 rounded"></div>
                <span>Above Average Performance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-200 rounded"></div>
                <span>Below Average Performance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-200 rounded"></div>
                <span>Bottom 20% Performance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}