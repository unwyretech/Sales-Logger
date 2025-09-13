import React, { useState } from 'react';
import { Users, Phone, Clock, TrendingUp, Calendar, Filter } from 'lucide-react';
import { formatTime, formatHour } from '../utils/dataUtils';
import { TeamAgentView } from './TeamAgentView';
import type { Database } from '../lib/supabase';

type Tables = Database['public']['Tables'];
type Team = Tables['teams']['Row'];
type Agent = Tables['agents']['Row'];
type CallData = Tables['call_data']['Row'];

interface TeamDashboardProps {
  teams: Team[];
  agents: Agent[];
  callData: CallData[];
  date: string;
}

export function TeamDashboard({ teams, agents, callData, date }: TeamDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(date);
  const [sortBy, setSortBy] = useState<'name' | 'calls' | 'sales' | 'time'>('name');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // If a team is selected, show the detailed agent view
  if (selectedTeam) {
    return (
      <TeamAgentView
        team={selectedTeam}
        agents={agents}
        callData={callData}
        date={selectedDate}
        onBack={() => setSelectedTeam(null)}
      />
    );
  }

  // Filter call data by selected date
  const filteredCallData = callData.filter(call => call.date === selectedDate);

  // Calculate team performance data
  const teamPerformance = teams.map(team => {
    const teamAgents = agents.filter(agent => agent.team_id === team.id);
    const teamCalls = filteredCallData.filter(call => {
      const agent = agents.find(a => a.id === call.agent_id);
      return agent?.team_id === team.id;
    });

    // Calculate hourly data (8am to 5pm)
    const hourlyData = [];
    for (let hour = 8; hour <= 17; hour++) {
      const hourCalls = teamCalls.filter(call => call.hour === hour);
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
    const totalCalls = teamCalls.reduce((sum, call) => sum + call.calls_made, 0);
    const totalCallTime = teamCalls.reduce((sum, call) => sum + call.total_call_time, 0);
    const totalSales = teamCalls.reduce((sum, call) => sum + call.sales_made, 0);

    return {
      team,
      teamAgents,
      hourlyData,
      totalCalls,
      totalCallTime,
      totalSales,
      averageCallTime: totalCalls > 0 ? totalCallTime / totalCalls : 0,
      conversionRate: totalCalls > 0 ? (totalSales / totalCalls) * 100 : 0
    };
  });

  // Sort teams based on selected criteria
  const sortedTeams = [...teamPerformance].sort((a, b) => {
    switch (sortBy) {
      case 'calls':
        return b.totalCalls - a.totalCalls;
      case 'sales':
        return b.totalSales - a.totalSales;
      case 'time':
        return b.totalCallTime - a.totalCallTime;
      default:
        return a.team.name.localeCompare(b.team.name);
    }
  });

  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8am to 5pm

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Performance Dashboard</h2>
            <p className="text-gray-600">Hourly breakdown and daily totals by team</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Sort by Name</option>
                <option value="calls">Sort by Calls</option>
                <option value="sales">Sort by Sales</option>
                <option value="time">Sort by Call Time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                  Team
                </th>
                {hours.map(hour => (
                  <th key={hour} className="px-3 py-4 text-center text-xs font-medium text-gray-600 min-w-[80px]">
                    {formatHour(hour)}
                  </th>
                ))}
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 bg-blue-50 min-w-[100px]">
                  Total Calls
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 bg-green-50 min-w-[100px]">
                  Total Sales
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 bg-purple-50 min-w-[120px]">
                  Total Time
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 bg-orange-50 min-w-[100px]">
                  Conv. Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedTeams.map((teamData) => (
                <tr 
                  key={teamData.team.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedTeam(teamData.team)}
                >
                  {/* Team Info */}
                  <td className="px-6 py-4 sticky left-0 bg-white z-10 border-r border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: teamData.team.color }}
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{teamData.team.name}</div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {teamData.teamAgents.length} agents
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Hourly Data */}
                  {teamData.hourlyData.map((hourData) => (
                    <td key={hourData.hour} className="px-3 py-4 text-center">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-blue-600">
                          {hourData.calls}
                        </div>
                        <div className="text-xs text-green-600">
                          {hourData.sales}s
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(hourData.callTime)}
                        </div>
                      </div>
                    </td>
                  ))}

                  {/* Daily Totals */}
                  <td className="px-6 py-4 text-center bg-blue-50">
                    <div className="flex items-center justify-center space-x-1">
                      <Phone className="w-4 h-4 text-blue-500" />
                      <span className="text-lg font-bold text-blue-600">
                        {teamData.totalCalls}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center bg-green-50">
                    <div className="flex items-center justify-center space-x-1">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-lg font-bold text-green-600">
                        {teamData.totalSales}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center bg-purple-50">
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="text-lg font-bold text-purple-600">
                        {formatTime(teamData.totalCallTime)}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center bg-orange-50">
                    <span className="text-lg font-bold text-orange-600">
                      {teamData.conversionRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Teams</p>
              <p className="text-3xl font-bold text-gray-900">{teams.length}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Calls</p>
              <p className="text-3xl font-bold text-blue-600">
                {sortedTeams.reduce((sum, team) => sum + team.totalCalls, 0)}
              </p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <Phone className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-3xl font-bold text-green-600">
                {sortedTeams.reduce((sum, team) => sum + team.totalSales, 0)}
              </p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Time</p>
              <p className="text-3xl font-bold text-purple-600">
                {formatTime(sortedTeams.reduce((sum, team) => sum + team.totalCallTime, 0))}
              </p>
            </div>
            <div className="bg-purple-500 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Data Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span><strong>Top number:</strong> Calls made in that hour</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span><strong>Middle number:</strong> Sales made (with 's' suffix)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span><strong>Bottom number:</strong> Total call time for that hour</span>
          </div>
        </div>
      </div>
    </div>
  );
}