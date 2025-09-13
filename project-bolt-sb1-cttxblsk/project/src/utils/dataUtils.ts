import { Agent, CallData, DailySummary, TeamSummary } from '../types';

export function calculateDailySummary(agents: Agent[], callData: CallData[], date: string): DailySummary[] {
  return agents.map(agent => {
    const agentCalls = callData.filter(call => call.agentId === agent.id && call.date === date);
    const totalCalls = agentCalls.reduce((sum, call) => sum + call.callsMade, 0);
    const totalCallTime = agentCalls.reduce((sum, call) => sum + call.totalCallTime, 0);
    const totalSales = agentCalls.reduce((sum, call) => sum + call.salesMade, 0);
    
    return {
      agentId: agent.id,
      date,
      totalCalls,
      totalCallTime,
      totalSales,
      averageCallTime: totalCalls > 0 ? totalCallTime / totalCalls : 0,
    };
  });
}

export function calculateTeamSummary(teams: any[], agents: Agent[], callData: CallData[], date: string): TeamSummary[] {
  return teams.map(team => {
    const teamAgents = agents.filter(agent => agent.teamId === team.id);
    const teamCalls = callData.filter(call => {
      const agent = agents.find(a => a.id === call.agentId);
      return agent?.teamId === team.id && call.date === date;
    });

    const totalCalls = teamCalls.reduce((sum, call) => sum + call.callsMade, 0);
    const totalCallTime = teamCalls.reduce((sum, call) => sum + call.totalCallTime, 0);
    const totalSales = teamCalls.reduce((sum, call) => sum + call.salesMade, 0);

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
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${period}`;
}