import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, Users, Phone, Clock, TrendingUp, Maximize, Minimize, Settings, BarChart3 } from 'lucide-react';
import { formatTime } from '../utils/dataUtils';
import { useCookies } from '../hooks/useCookies';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotationInterval, setRotationInterval] = useState(10);
  const [timeLeft, setTimeLeft] = useState(10);
  const [showHourlyBreakdown, setShowHourlyBreakdown] = useState(false);
  const { getCookie, setCookie } = useCookies();

  // Load settings from cookies
  useEffect(() => {
    const savedInterval = getCookie('rotating_dashboard_interval');
    if (savedInterval) {
      const interval = parseInt(savedInterval);
      setRotationInterval(interval);
      setTimeLeft(interval);
    }
  }, [getCookie]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
          return rotationInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, teamsWithAgents.length, rotationInterval]);

  const nextTeam = () => {
    setCurrentTeamIndex(prev => (prev + 1) % teamsWithAgents.length);
    setTimeLeft(rotationInterval);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setTimeLeft(rotationInterval);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  const updateRotationInterval = (newInterval: number) => {
    setRotationInterval(newInterval);
    setTimeLeft(newInterval);
    setCookie('rotating_dashboard_interval', newInterval.toString(), { expires: 30 });
  };
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

  const campaign = campaigns.find(c => c.id === currentTeam.campaign_id);
  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8am to 5pm
  
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}${period}`;
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 bg-gray-50 z-50 p-6 overflow-y-auto' : ''}`}>
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
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

            <button
              onClick={() => setShowHourlyBreakdown(!showHourlyBreakdown)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showHourlyBreakdown 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Hourly</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>

            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <select
                value={rotationInterval}
                onChange={(e) => updateRotationInterval(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
              </select>
            </div>
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
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${isFullscreen ? 'flex-1' : ''}`}>
        {/* Team Header */}
        <div 
          className="h-3"
          style={{ backgroundColor: currentTeam.color }}
        />
        
        <div className={`p-6 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`font-bold text-gray-900 ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>{currentTeam.name}</h2>
              <p className={`text-gray-600 ${isFullscreen ? 'text-lg' : ''}`}>
                {campaign?.name} • {teamAgents.length} agents • {new Date(date).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className={`font-bold text-blue-600 ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>
                  {agentPerformance.reduce((sum, agent) => sum + agent.totalCalls, 0)}
                </div>
                <div className={`text-gray-600 ${isFullscreen ? 'text-base' : 'text-sm'}`}>Total Calls</div>
              </div>
              <div className="text-center">
                <div className={`font-bold text-green-600 ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>
                  {agentPerformance.reduce((sum, agent) => sum + agent.totalSales, 0)}
                </div>
                <div className={`text-gray-600 ${isFullscreen ? 'text-base' : 'text-sm'}`}>Total Sales</div>
              </div>
            </div>
          </div>

          {/* Agent Grid */}
          <div className={`grid gap-4 ${isFullscreen ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 flex-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {agentPerformance.map(({ agent, totalCalls, totalCallTime, totalSales, averageCallTime }) => (
              <div key={agent.id} className={`border border-gray-200 rounded-lg hover:shadow-md transition-shadow ${isFullscreen ? 'p-6' : 'p-4'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold text-gray-900 truncate ${isFullscreen ? 'text-lg' : ''}`}>{agent.name}</h3>
                  <div className={`w-3 h-3 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Phone className="w-3 h-3 text-blue-500" />
                      <span className={`text-gray-600 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>Calls</span>
                    </div>
                    <span className={`font-bold text-blue-600 ${isFullscreen ? 'text-lg' : 'text-sm'}`}>{totalCalls}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-purple-500" />
                      <span className={`text-gray-600 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>Time</span>
                    </div>
                    <span className={`font-bold text-purple-600 ${isFullscreen ? 'text-lg' : 'text-sm'}`}>{formatTime(totalCallTime)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className={`text-gray-600 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>Sales</span>
                    </div>
                    <span className={`font-bold text-green-600 ${isFullscreen ? 'text-lg' : 'text-sm'}`}>{totalSales}</span>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100">
                    <div className={`flex justify-between ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
                      <span className="text-gray-500">Avg Call</span>
                      <span className="font-medium">{formatTime(averageCallTime)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {agentPerformance.length === 0 && (
            <div className={`text-center ${isFullscreen ? 'py-16' : 'py-8'}`}>
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No agents in this team</p>
            </div>
          )}
        </div>
      </div>

      {/* Hourly Breakdown */}
      {showHourlyBreakdown && (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${isFullscreen ? 'flex-1' : ''}`}>
          <div 
            className="h-3"
            style={{ backgroundColor: currentTeam.color }}
          />
          
          <div className={`p-6 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
            <div className="mb-6">
              <h3 className={`font-bold text-gray-900 ${isFullscreen ? 'text-3xl' : 'text-xl'}`}>
                {currentTeam.name} - Hourly Breakdown
              </h3>
              <p className={`text-gray-600 ${isFullscreen ? 'text-lg' : ''}`}>
                Call time breakdown by hour for each agent
              </p>
            </div>

            <div className={`overflow-x-auto ${isFullscreen ? 'flex-1' : ''}`}>
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className={`px-4 py-3 text-left font-semibold sticky left-0 bg-blue-600 z-10 min-w-[120px] ${isFullscreen ? 'text-lg' : 'text-sm'}`}>
                      AGENT
                    </th>
                    {hours.map(hour => (
                      <th key={hour} className={`px-3 py-3 text-center font-semibold min-w-[80px] ${isFullscreen ? 'text-base' : 'text-sm'}`}>
                        {formatHour(hour)}
                      </th>
                    ))}
                    <th className={`px-4 py-3 text-center font-semibold min-w-[100px] ${isFullscreen ? 'text-lg' : 'text-sm'}`}>
                      TOTAL
                    </th>
                  </tr>
                </thead>
                
                <tbody>
                  {agentPerformance.map((agentData) => (
                    <tr key={agentData.agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {/* Agent Name */}
                      <td className={`px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200 ${isFullscreen ? 'text-lg' : 'text-sm'}`}>
                        {agentData.agent.name.toUpperCase()}
                      </td>

                      {/* Hourly Data */}
                      {agentData.hourlyData.map((hourData) => {
                        const getCallTimeColor = (minutes: number) => {
                          if (minutes === 0) return 'bg-gray-100 text-gray-500';
                          const targetMinutes = 40;
                          const ratio = minutes / targetMinutes;
                          if (ratio >= 1.0) return 'bg-green-200 text-green-800';
                          if (ratio >= 0.75) return 'bg-yellow-200 text-yellow-800';
                          if (ratio >= 0.5) return 'bg-orange-200 text-orange-800';
                          return 'bg-red-200 text-red-800';
                        };

                        return (
                          <td key={hourData.hour} className="px-3 py-3 text-center">
                            <div className={`px-2 py-1 rounded font-bold ${getCallTimeColor(hourData.callTime)} ${isFullscreen ? 'text-base' : 'text-xs'}`}>
                              {hourData.callTime > 0 
                                ? `${Math.floor(hourData.callTime / 60).toString().padStart(2, '0')}:${(hourData.callTime % 60).toString().padStart(2, '0')}`
                                : '00:00'
                              }
                            </div>
                          </td>
                        );
                      })}

                      {/* Total Time */}
                      <td className="px-4 py-3 text-center">
                        <div className={`inline-block px-3 py-1 rounded font-bold bg-blue-100 text-blue-800 ${isFullscreen ? 'text-lg' : 'text-sm'}`}>
                          {agentData.totalCallTime > 0 
                            ? `${Math.floor(agentData.totalCallTime / 60).toString().padStart(2, '0')}:${(agentData.totalCallTime % 60).toString().padStart(2, '0')}`
                            : '00:00'
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className={`mt-6 grid grid-cols-2 gap-4 ${isFullscreen ? 'text-base' : 'text-sm'}`}>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Call Time Target: 40min/hour</h4>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-200 rounded"></div>
                    <span>40+ min (Target Met)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-yellow-200 rounded"></div>
                    <span>30-39 min (Close)</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">&nbsp;</h4>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-200 rounded"></div>
                    <span>20-29 min (Below)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-200 rounded"></div>
                    <span>0-19 min (Poor)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}