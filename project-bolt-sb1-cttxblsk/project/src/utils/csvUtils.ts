import { Agent, CallData } from '../types';

export function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    data.push(row);
  }

  return data;
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header]).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateDailyReport(agents: Agent[], callData: CallData[], date: string) {
  const report = agents.map(agent => {
    const agentCalls = callData.filter(call => call.agentId === agent.id && call.date === date);
    const totalCalls = agentCalls.reduce((sum, call) => sum + call.callsMade, 0);
    const totalCallTime = agentCalls.reduce((sum, call) => sum + call.totalCallTime, 0);
    const totalSales = agentCalls.reduce((sum, call) => sum + call.salesMade, 0);
    
    return {
      'Agent ID': agent.id,
      'Agent Name': agent.name,
      'Team': agent.teamId,
      'Date': date,
      'Total Calls': totalCalls,
      'Total Call Time (minutes)': totalCallTime,
      'Total Sales': totalSales,
      'Average Call Time (minutes)': totalCalls > 0 ? (totalCallTime / totalCalls).toFixed(2) : '0.00',
    };
  });

  return report;
}