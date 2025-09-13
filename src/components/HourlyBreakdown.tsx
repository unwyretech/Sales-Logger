import React, { useState } from 'react';
import { Clock, Phone, TrendingUp, Calendar, Filter } from 'lucide-react';
import { formatHour, formatTime } from '../utils/dataUtils';
import type { Database } from '../lib/supabase';

type Tables = Database['public']['Tables'];
type Campaign = Tables['campaigns']['Row'];
type CampaignTeam = Tables['campaign_teams']['Row'];
type Agent = Tables['agents']['Row'];
type CallData = Tables['call_data']['Row'];

interface HourlyBreakdownProps {
  campaigns: Campaign[];
  campaignTeams: CampaignTeam[];
  agents: Agent[];
  callData: CallData[];
  detailed?: boolean;
}

export function HourlyBreakdown({ campaigns, campaignTeams, agents, callData, detailed = false }: HourlyBreakdownProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Filter data by campaign and date range
  const filteredCallData = callData.filter(call => {
    const dateMatch = call.date >= startDate && call.date <= endDate;
    
    if (!selectedCampaign) return dateMatch;
    
    const agent = agents.find(a => a.id === call.agent_id);
    const team = campaignTeams.find(t => t.id === agent?.campaign_team_id);
    return dateMatch && team?.campaign_id === selectedCampaign;
  });

  // Group data by hour
  const hourlyData = [];
  for (let hour = 8; hour <= 17; hour++) {
    const hourData = filteredCallData.filter(call => call.hour === hour);
    const totalCalls = hourData.reduce((sum, call) => sum + call.calls_made, 0);
    const totalCallTime = hourData.reduce((sum, call) => sum + call.total_call_time, 0);
    const totalSales = hourData.reduce((sum, call) => sum + call.sales_made, 0);
    const activeAgents = new Set(hourData.map(call => call.agent_id)).size;

    hourlyData.push({
      hour,
      totalCalls,
      totalCallTime,
      totalSales,
      activeAgents,
      averageCallTime: totalCalls > 0 ? totalCallTime / totalCalls : 0,
    });
  }

  const maxCalls = Math.max(...hourlyData.map(h => h.totalCalls));

  if (!detailed) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Activity</h3>
        <div className="space-y-2">
          {hourlyData.map(hour => (
            <div key={hour.hour} className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-600 w-16">{formatHour(hour.hour)}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${maxCalls > 0 ? (hour.totalCalls / maxCalls) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-900 w-8">{hour.totalCalls}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Campaigns</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Hourly Performance Breakdown</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="pb-3 text-sm font-medium text-gray-600">Time</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Active Agents</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Total Calls</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Call Time</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Sales</th>
                <th className="pb-3 text-sm font-medium text-gray-600">Avg Call Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hourlyData.map(hour => (
                <tr key={hour.hour} className="hover:bg-gray-50">
                  <td className="py-4 text-sm font-medium text-gray-900">{formatHour(hour.hour)}</td>
                  <td className="py-4 text-sm text-gray-600">{hour.activeAgents}</td>
                  <td className="py-4 text-sm font-bold text-blue-600">{hour.totalCalls}</td>
                  <td className="py-4 text-sm text-gray-600">{formatTime(hour.totalCallTime)}</td>
                  <td className="py-4 text-sm font-bold text-green-600">{hour.totalSales}</td>
                  <td className="py-4 text-sm text-gray-600">{formatTime(hour.averageCallTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hourly Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Phone className="w-4 h-4 mr-2 text-blue-500" />
            Calls by Hour
          </h4>
          <div className="space-y-3">
            {hourlyData.map(hour => (
              <div key={hour.hour} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{formatHour(hour.hour)}</span>
                <div className="flex items-center space-x-3 flex-1 mx-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${maxCalls > 0 ? (hour.totalCalls / maxCalls) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">{hour.totalCalls}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
            Sales by Hour
          </h4>
          <div className="space-y-3">
            {hourlyData.map(hour => {
              const maxSales = Math.max(...hourlyData.map(h => h.totalSales));
              return (
                <div key={hour.hour} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{formatHour(hour.hour)}</span>
                  <div className="flex items-center space-x-3 flex-1 mx-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${maxSales > 0 ? (hour.totalSales / maxSales) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{hour.totalSales}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}