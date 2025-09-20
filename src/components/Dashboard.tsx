import React, { useState } from 'react';
import { BarChart3, Users, Phone, TrendingUp, Calendar, Download, Upload, UserPlus, Shield, LogOut, Settings, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AdminPanel } from './AdminPanel';
import { AgentsList } from './AgentsList';
import { CampaignOverview } from './CampaignOverview';
import { HourlyBreakdown } from './HourlyBreakdown';
import { ImportExport } from './ImportExport';
import { AgentImporter } from './AgentImporter';
import { CampaignDashboard } from './CampaignDashboard';
import { AgentManagement } from './AgentManagement';
import { RotatingDashboard } from './RotatingDashboard';
import { useDatabase } from '../hooks/useDatabase';

type TabType = 'overview' | 'agents' | 'campaigns' | 'campaign-dashboard' | 'hourly' | 'rotating' | 'import' | 'agent-import' | 'agent-management' | 'admin';

export function Dashboard() {
  const { profile, signOut, isAdmin, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { campaigns, campaignTeams, agents, callData, loading, error } = useDatabase();

  const today = new Date().toISOString().split('T')[0];
  const todayData = callData.filter(call => call.date === today);

  // Calculate overview stats
  const totalCalls = todayData.reduce((sum, call) => sum + call.calls_made, 0);
  const totalCallTime = todayData.reduce((sum, call) => sum + call.total_call_time, 0);
  const totalSales = todayData.reduce((sum, call) => sum + call.sales_made, 0);
  const activeAgents = new Set(todayData.map(call => call.agent_id)).size;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'campaigns', label: 'Campaigns', icon: Users },
    { id: 'campaign-dashboard', label: 'Campaign Dashboard', icon: Calendar },
    { id: 'hourly', label: 'Hourly', icon: Calendar },
    { id: 'rotating', label: 'Rotating Dashboard', icon: BarChart3 },
    ...(isAdmin ? [
      { id: 'agent-management', label: 'Agent Management', icon: Settings },
      { id: 'import', label: 'Import/Export', icon: Upload },
      { id: 'agent-import', label: 'Import Agents', icon: UserPlus },
    ] : []),
    ...(isSuperAdmin ? [
      { id: 'admin', label: 'Admin Panel', icon: Shield },
    ] : []),
  ];

  const overviewCards = [
    { title: 'Total Calls', value: totalCalls.toLocaleString(), icon: Phone, color: 'bg-blue-500' },
    { title: 'Active Agents', value: activeAgents.toString(), icon: Users, color: 'bg-green-500' },
    { title: 'Total Sales', value: totalSales.toString(), icon: TrendingUp, color: 'bg-orange-500' },
    { title: 'Call Time', value: `${Math.round(totalCallTime / 60)}h`, icon: Calendar, color: 'bg-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Management Dashboard</h1>
              <p className="text-sm text-gray-500">Today: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {profile?.full_name || profile?.email}
              </div>
              <div className="text-sm text-gray-600">
                {agents.filter(agent => agent.is_active).length} Active Agents
              </div>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading dashboard data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 text-red-500">⚠️</div>
              <span className="text-red-700">Error: {error}</span>
            </div>
            <p className="text-sm text-red-600 mt-2">
              Please make sure you have connected to Supabase and run the database migrations.
            </p>
          </div>
        )}

        {/* Overview Cards */}
        {!loading && !error && activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {overviewCards.map((card, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                    </div>
                    <div className={`${card.color} p-3 rounded-lg`}>
                      <card.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CampaignOverview campaigns={campaigns} campaignTeams={campaignTeams} agents={agents} callData={callData} date={today} />
              <HourlyBreakdown callData={todayData} />
            </div>
          </div>
        )}

        {/* Tab Content */}
        {!loading && !error && activeTab === 'agents' && <AgentsList campaigns={campaigns} agents={agents} campaignTeams={campaignTeams} callData={callData} date={today} />}
        {!loading && !error && activeTab === 'campaigns' && <CampaignOverview campaigns={campaigns} campaignTeams={campaignTeams} agents={agents} callData={callData} date={today} detailed={true} />}
        {!loading && !error && activeTab === 'campaign-dashboard' && <CampaignDashboard campaigns={campaigns} campaignTeams={campaignTeams} agents={agents} callData={callData} date={today} />}
        {!loading && !error && activeTab === 'hourly' && <HourlyBreakdown campaigns={campaigns} campaignTeams={campaignTeams} agents={agents} callData={callData} detailed={true} />}
        {!loading && !error && activeTab === 'rotating' && <RotatingDashboard campaigns={campaigns} campaignTeams={campaignTeams} agents={agents} callData={callData} date={today} />}
        {!loading && !error && isAdmin && activeTab === 'agent-management' && <AgentManagement />}
        {!loading && !error && isAdmin && activeTab === 'import' && <ImportExport />}
        {!loading && !error && isAdmin && activeTab === 'agent-import' && <AgentImporter />}
        {!loading && !error && isSuperAdmin && activeTab === 'admin' && <AdminPanel />}
      </div>
    </div>
  );
}