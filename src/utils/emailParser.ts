import type { Database } from '../lib/supabase';

type Agent = Database['public']['Tables']['agents']['Row'];
type CallData = Database['public']['Tables']['call_data']['Insert'];

export function parseEmailCSV(csvContent: string, agents: Agent[], date: string, hour: number): CallData[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const callDataRecords: CallData[] = [];
  const errors: string[] = [];

  // Process each line (skip header if present)
  const startIndex = lines[0].toLowerCase().includes('agent') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      // Split by comma and handle quoted values
      const columns = parseCSVLine(line);
      
      // Extract data from specific columns (B=1, E=4, F=5 in 0-based indexing)
      const agentName = columns[1]?.trim(); // Column B
      const calls = columns[4]?.trim();     // Column E
      const seconds = columns[5]?.trim();   // Column F

      if (!agentName || !calls) {
        continue; // Skip rows without required data
      }

      // Find matching agent
      const agent = agents.find(a => 
        a.name.toLowerCase().trim() === agentName.toLowerCase().trim()
      );

      if (!agent) {
        errors.push(`Agent "${agentName}" not found`);
        continue;
      }

      // Parse numeric values
      const callsMade = parseInt(calls) || 0;
      const totalSeconds = parseInt(seconds) || 0;
      const totalMinutes = Math.round(totalSeconds / 60);

      callDataRecords.push({
        agent_id: agent.id,
        date,
        hour,
        calls_made: callsMade,
        total_call_time: totalMinutes,
        sales_made: 0, // Default to 0, can be enhanced later
      });

    } catch (error) {
      errors.push(`Error parsing line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Email CSV parsing errors:', errors);
  }

  return callDataRecords;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current); // Add the last field
  return result;
}

export function extractHourFromSubject(subject: string): number | null {
  // Try different patterns for hour extraction
  const patterns = [
    /hour\s*(\d{1,2})/i,           // "Hour 9", "hour 14"
    /^(\d{1,2})$/,                 // "9", "14"
    /(\d{1,2})\s*(?:am|pm)/i,      // "9 AM", "2 PM"
    /(\d{1,2}):00/,                // "9:00", "14:00"
    /time\s*(\d{1,2})/i,           // "Time 9"
    /(\d{1,2})\s*o'?clock/i,       // "9 o'clock", "9 oclock"
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match) {
      let hour = parseInt(match[1]);
      
      // Handle AM/PM conversion
      if (subject.toLowerCase().includes('pm') && hour < 12) {
        hour += 12;
      } else if (subject.toLowerCase().includes('am') && hour === 12) {
        hour = 0;
      }
      
      // Ensure hour is within business hours (8-17)
      if (hour >= 8 && hour <= 17) {
        return hour;
      }
    }
  }

  return null;
}