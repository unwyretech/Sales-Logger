import React, { useState } from 'react';
import { Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { exportToCSV } from '../utils/csvUtils';
import type { Database } from '../lib/supabase';

type CallData = Database['public']['Tables']['call_data']['Insert'];

export function ImportExport() {
  const { agents, campaignTeams, callData, upsertCallData } = useDatabase();
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const parseCSV = (csvContent: string): any[] => {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        // Only add non-blank values
        if (values[index] && values[index] !== '') {
          row[header] = values[index];
        }
      });
      
      // Only add rows that have some data
      if (Object.keys(row).length > 0) {
        data.push(row);
      }
    }

    return data;
  };

  const findAgentByName = (agentName: string) => {
    return agents.find(agent => 
      agent.name.toLowerCase().trim() === agentName.toLowerCase().trim()
    );
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvContent = e.target?.result as string;
        const parsedData = parseCSV(csvContent);
        
        if (parsedData.length === 0) {
          setImportStatus({ type: 'error', message: 'No data found in CSV file' });
          return;
        }

        // Look for agent name column (flexible naming)
        const firstRow = parsedData[0];
        const agentNameColumn = Object.keys(firstRow).find(key => 
          key.includes('agent') && key.includes('name') || 
          key === 'name' || 
          key === 'agent'
        );
        
        const callsColumn = Object.keys(firstRow).find(key => 
          key.includes('call') || key === 'calls'
        );
        
        const secondsColumn = Object.keys(firstRow).find(key => 
          key.includes('second') || key.includes('time')
        );
        
        if (!agentNameColumn) {
          setImportStatus({ 
            type: 'error', 
            message: 'Missing agent name column. Please include a column with agent names.' 
          });
          return;
        }

        if (!callsColumn) {
          setImportStatus({ 
            type: 'error', 
            message: 'Missing calls column. Please include a column with call counts.' 
          });
          return;
        }

        // Convert and validate data
        const newCallData: CallData[] = [];
        const errors: string[] = [];
        let successCount = 0;

        for (const row of parsedData) {
          const agentName = row[agentNameColumn];
          if (!agentName) continue;

          const agent = findAgentByName(agentName);
          if (!agent) {
            errors.push(`Agent "${agentName}" not found`);
            continue;
          }

          const calls = parseInt(row[callsColumn]) || 0;
          const seconds = secondsColumn ? parseInt(row[secondsColumn]) || 0 : 0;
          const minutes = Math.round(seconds / 60); // Convert seconds to minutes
          
          // Get sales if available
          const salesColumn = Object.keys(row).find(key => 
            key.includes('sale') || key.includes('conversion')
          );
          const sales = salesColumn ? parseInt(row[salesColumn]) || 0 : 0;

          // Get hour if available, otherwise use current hour
          const hourColumn = Object.keys(row).find(key => 
            key.includes('hour') || key === 'time'
          );
          let hour = hourColumn ? parseInt(row[hourColumn]) : new Date().getHours();
          
          // Ensure hour is within business hours (8-17)
          if (hour < 8 || hour > 17) {
            hour = Math.max(8, Math.min(17, hour));
          }

          newCallData.push({
            agent_id: agent.id,
            date: today,
            hour: hour,
            calls_made: calls,
            total_call_time: minutes,
            sales_made: sales,
          });
          
          successCount++;
        }

        // Filter by selected hours if any
        const dataToImport = selectedHours.length > 0 
          ? newCallData.filter(call => selectedHours.includes(call.hour))
          : newCallData;

        if (dataToImport.length > 0) {
          await upsertCallData(dataToImport);
        }

        let message = `Successfully imported ${dataToImport.length} records`;
        if (errors.length > 0) {
          message += `. Skipped ${errors.length} rows: ${errors.slice(0, 3).join(', ')}`;
          if (errors.length > 3) {
            message += ` and ${errors.length - 3} more`;
          }
        }

        setImportStatus({ 
          type: dataToImport.length > 0 ? 'success' : 'error', 
          message 
        });
      } catch (error) {
        setImportStatus({ 
          type: 'error', 
          message: 'Error parsing CSV file. Please check the format.' 
        });
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const exportDailyReport = () => {
    const reportData = agents.map(agent => {
      const agentCalls = callData.filter(call => call.agent_id === agent.id && call.date === today);
      const totalCalls = agentCalls.reduce((sum, call) => sum + call.calls_made, 0);
      const totalCallTime = agentCalls.reduce((sum, call) => sum + call.total_call_time, 0);
      const totalSales = agentCalls.reduce((sum, call) => sum + call.sales_made, 0);
      const team = campaignTeams.find(t => t.id === agent.campaign_team_id);
      
      return {
        'Agent ID': agent.id,
        'Agent Name': agent.name,
        'Team': team?.name || 'No Team',
        'Date': today,
        'Total Calls': totalCalls,
        'Total Call Time (minutes)': totalCallTime,
        'Total Sales': totalSales,
        'Average Call Time (minutes)': totalCalls > 0 ? (totalCallTime / totalCalls).toFixed(2) : '0.00',
      };
    });

    exportToCSV(reportData, `sales-report-${today}.csv`);
  };

  const exportRawData = () => {
    const todayData = callData.filter(call => call.date === today);
    exportToCSV(todayData, `sales-data-${today}.csv`);
  };

  const downloadSampleImportCSV = () => {
    const sampleData = [
      'Agent Name,Calls,Seconds,Sales,Hour',
      'John Smith,15,3600,3,9',
      'Jane Doe,12,2700,2,9',
      'Mike Johnson,18,4200,4,10',
      'Sarah Wilson,10,2400,1,10'
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample-call-data.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleHour = (hour: number) => {
    setSelectedHours(prev => 
      prev.includes(hour) 
        ? prev.filter(h => h !== hour)
        : [...prev, hour].sort()
    );
  };

  const hours = Array.from({ length: 10 }, (_, i) => i + 8); // 8am to 5pm

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2 text-blue-500" />
          Import Call Data
        </h3>

        {importStatus && (
          <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
            importStatus.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {importStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className={importStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {importStatus.message}
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Hours to Import (optional - leave empty to replace all data)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {hours.map(hour => (
                <button
                  key={hour}
                  onClick={() => toggleHour(hour)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    selectedHours.includes(hour)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {hour}:00
                </button>
              ))}
            </div>
            {selectedHours.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Selected hours: {selectedHours.map(h => `${h}:00`).join(', ')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drop your CSV file here or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                Choose File
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Required: Agent Name, Calls. Optional: Seconds, Sales, Hour
            </p>
            <button
              onClick={downloadSampleImportCSV}
              className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
            >
              Download Sample Import CSV
            </button>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2 text-green-500" />
          Export Data
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={exportDailyReport}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Daily Report</span>
          </button>

          <button
            onClick={exportRawData}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Raw Data</span>
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Daily Report:</strong> Includes agent summaries, averages, and totals</p>
          <p><strong>Raw Data:</strong> Exports all hourly call data for today</p>
        </div>
      </div>

      {/* Sample Data Format */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample CSV Format</h3>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
          <div className="text-gray-600">Agent Name,Calls,Seconds,Sales,Hour</div>
          <div>John Smith,15,3600,3,9</div>
          <div>Jane Doe,12,2700,2,9</div>
          <div>Mike Johnson,18,4200,4,10</div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          * Agent Name must match existing agents exactly<br />
          * Seconds will be converted to minutes automatically<br />
          * hour should be between 8-17 (8am-5pm)<br />
          * Missing columns will be ignored<br />
          * Sales and Hour are optional (defaults: 0 sales, current hour)
        </p>
      </div>
    </div>
  );
}