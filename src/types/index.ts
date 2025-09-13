export interface Agent {
  id: string;
  name: string;
  email: string;
  teamId: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  managerId?: string;
}

export interface CallData {
  agentId: string;
  date: string;
  hour: number; // 8-17 (8am-5pm)
  callsMade: number;
  totalCallTime: number; // in minutes
  salesMade: number;
}

export interface DailySummary {
  agentId: string;
  date: string;
  totalCalls: number;
  totalCallTime: number;
  totalSales: number;
  averageCallTime: number;
}

export interface TeamSummary {
  teamId: string;
  totalCalls: number;
  totalCallTime: number;
  totalSales: number;
  agentCount: number;
  averageCallTime: number;
  averageCallsPerAgent: number;
}