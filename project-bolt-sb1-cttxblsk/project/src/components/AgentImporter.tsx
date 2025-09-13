import React, { useState } from 'react';
import { Upload, Users, Plus, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';

interface AgentImportData {
  name: string;
  email: string;
  teamName: string;
}

export function AgentImporter() {
  const { teams, createTeam, createAgents, clearAllData } = useDatabase();
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewData, setPreviewData] = useState<AgentImportData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const parseCSV = (csvContent: string): AgentImportData[] => {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIndex = headers.findIndex(h => h.includes('name'));
    const emailIndex = headers.findIndex(h => h.includes('email'));
    const teamIndex = headers.findIndex(h => h.includes('team'));

    if (nameIndex === -1 || emailIndex === -1 || teamIndex === -1) {
      throw new Error('CSV must contain columns for name, email, and team');
    }

    const data: AgentImportData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 3 && values[nameIndex] && values[emailIndex] && values[teamIndex]) {
        data.push({
          name: values[nameIndex],
          email: values[emailIndex],
          teamName: values[teamIndex]
        });
      }
    }

    return data;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        const parsedData = parseCSV(csvContent);
        
        if (parsedData.length === 0) {
          setImportStatus({ type: 'error', message: 'No valid data found in CSV file' });
          return;
        }

        setPreviewData(parsedData);
        setShowPreview(true);
        setImportStatus({ type: 'success', message: `Found ${parsedData.length} agents to import` });
      } catch (error) {
        setImportStatus({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Error parsing CSV file' 
        });
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setIsImporting(true);
    try {
      // Get unique team names from import data
      const uniqueTeamNames = [...new Set(previewData.map(agent => agent.teamName))];
      const existingTeamNames = new Set(teams.map(team => team.name));
      
      // Create new teams that don't exist
      const newTeams = uniqueTeamNames.filter(name => !existingTeamNames.has(name));
      const teamColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
      
      const createdTeams: any[] = [];
      for (let i = 0; i < newTeams.length; i++) {
        const newTeam = await createTeam({
          name: newTeams[i],
          color: teamColors[i % teamColors.length]
        });
        if (newTeam) {
          createdTeams.push(newTeam);
        }
      }

      // Combine existing teams with newly created teams
      const allTeams = [...teams, ...createdTeams];

      // Create agents with team assignments
      const agentsToCreate = previewData.map(agentData => {
        const team = allTeams.find(t => t.name === agentData.teamName);
        if (!team) {
          throw new Error(`Team "${agentData.teamName}" not found`);
        }
        return {
          name: agentData.name,
          email: agentData.email,
          team_id: team.id,
          is_active: true
        };
      });

      await createAgents(agentsToCreate);

      setImportStatus({ 
        type: 'success', 
        message: `Successfully imported ${previewData.length} agents and ${newTeams.length} new teams` 
      });
      setPreviewData([]);
      setShowPreview(false);
    } catch (error) {
      setImportStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to import agents' 
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }

    try {
      await clearAllData();
      setImportStatus({ type: 'success', message: 'All data cleared successfully' });
      setPreviewData([]);
      setShowPreview(false);
    } catch (error) {
      setImportStatus({ 
        type: 'error', 
        message: 'Failed to clear data' 
      });
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      'Name,Email,Team',
      'John Smith,john.smith@company.com,Alpha Team',
      'Jane Doe,jane.doe@company.com,Alpha Team',
      'Mike Johnson,mike.johnson@company.com,Beta Team',
      'Sarah Wilson,sarah.wilson@company.com,Beta Team'
    ].join('\n');

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample-agents.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {importStatus && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
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

      {/* Import Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-500" />
          Import Agents with Teams
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drop your CSV file here or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="agent-csv-upload"
              />
              <label
                htmlFor="agent-csv-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                Choose File
              </label>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Required columns: Name, Email, Team
              </p>
              <button
                onClick={downloadSampleCSV}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Download Sample CSV
              </button>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {showPreview && previewData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Import Preview</h3>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>{isImporting ? 'Importing...' : `Import ${previewData.length} Agents`}</span>
              </button>
            </div>
          </div>

          {/* Teams Summary */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Teams to be created/used:</h4>
            <div className="flex flex-wrap gap-2">
              {[...new Set(previewData.map(agent => agent.teamName))].map(teamName => {
                const isExisting = teams.some(team => team.name === teamName);
                return (
                  <span
                    key={teamName}
                    className={`px-3 py-1 rounded-full text-sm ${
                      isExisting 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {teamName} {isExisting ? '(existing)' : '(new)'}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Agents Preview */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="pb-3 text-sm font-medium text-gray-600">Name</th>
                  <th className="pb-3 text-sm font-medium text-gray-600">Email</th>
                  <th className="pb-3 text-sm font-medium text-gray-600">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewData.slice(0, 10).map((agent, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3 text-sm text-gray-900">{agent.name}</td>
                    <td className="py-3 text-sm text-gray-600">{agent.email}</td>
                    <td className="py-3 text-sm text-gray-600">{agent.teamName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 10 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                ... and {previewData.length - 10} more agents
              </p>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">CSV Format Instructions</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p>Your CSV file should contain the following columns:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Name:</strong> Full name of the agent</li>
            <li><strong>Email:</strong> Unique email address for the agent</li>
            <li><strong>Team:</strong> Team name (will be created if it doesn't exist)</li>
          </ul>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm mt-4">
            <div className="text-gray-600">Name,Email,Team</div>
            <div>John Smith,john.smith@company.com,Alpha Team</div>
            <div>Jane Doe,jane.doe@company.com,Alpha Team</div>
            <div>Mike Johnson,mike.johnson@company.com,Beta Team</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Teams will be automatically created with random colors if they don't exist<br/>
            * Duplicate emails will be skipped during import
          </p>
        </div>
      </div>
    </div>
  );
}