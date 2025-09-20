import React, { useState } from 'react';
import { Mail, RefreshCw, Settings, CheckCircle, AlertCircle, Clock, Download, User, ToggleLeft, ToggleRight } from 'lucide-react';
import { useOutlookIntegration } from '../hooks/useOutlookIntegration';

export function OutlookIntegration() {
  const {
    isConnected,
    isProcessing,
    stats,
    currentUser,
    connect,
    disconnect,
    checkForNewEmails,
    resetStats,
    toggleAutoCheck,
    isAutoCheckEnabled,
  } = useOutlookIntegration();

  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect to Outlook. Please check your configuration and try again.');
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect from Outlook? This will stop automatic email processing.')) {
      try {
        await disconnect();
      } catch (error) {
        console.error('Disconnect failed:', error);
      }
    }
  };

  const handleManualCheck = async () => {
    try {
      await checkForNewEmails();
    } catch (error) {
      console.error('Manual check failed:', error);
      alert('Failed to check for new emails. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Mail className="w-6 h-6 mr-2 text-blue-600" />
              Microsoft Outlook Integration
            </h2>
            <p className="text-gray-600 mt-1">Automatically import call data from Outlook email attachments</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {isConnected ? (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600 font-medium">Connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Disconnected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      {!isConnected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <Settings className="w-6 h-6 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Setup Required</h3>
              <p className="text-blue-800 mb-4">
                To use Outlook integration, you need to configure Microsoft Graph API credentials.
              </p>
              
              <button
                onClick={() => setShowSetupInstructions(!showSetupInstructions)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
              >
                {showSetupInstructions ? 'Hide' : 'Show'} Setup Instructions
              </button>

              {showSetupInstructions && (
                <div className="mt-4 space-y-3 text-sm text-blue-800">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium mb-2">1. Create Azure App Registration</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Go to <a href="https://portal.azure.com" target="_blank" className="underline">Azure Portal</a></li>
                      <li>Navigate to "Azure Active Directory" → "App registrations"</li>
                      <li>Click "New registration"</li>
                      <li>Set redirect URI to: <code className="bg-gray-100 px-1 rounded">{window.location.origin}</code></li>
                      <li>Copy the "Application (client) ID"</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium mb-2">2. Configure API Permissions</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>In your app registration, go to "API permissions"</li>
                      <li>Add "Microsoft Graph" permissions:</li>
                      <li className="ml-4">• Mail.Read (Delegated)</li>
                      <li className="ml-4">• Mail.ReadWrite (Delegated)</li>
                      <li>Grant admin consent for the permissions</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium mb-2">3. Add Environment Variable</h4>
                    <p className="text-xs">Add your client ID to your environment variables:</p>
                    <code className="block bg-gray-100 p-2 rounded mt-1 text-xs">
                      VITE_MICROSOFT_CLIENT_ID=your_client_id_here
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Connection Status</h3>
          
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isProcessing}
              className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>{isProcessing ? 'Connecting...' : 'Connect to Outlook'}</span>
            </button>
          )}
        </div>

        {isConnected && currentUser && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Connected to Outlook</p>
                <p className="text-sm text-green-700">
                  <User className="w-4 h-4 inline mr-1" />
                  {currentUser.username || currentUser.name || 'Unknown User'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {isConnected && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Processing Controls</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Automatic Email Checking</h4>
                <p className="text-sm text-gray-600">Check for new emails every 5 minutes</p>
              </div>
              <button
                onClick={toggleAutoCheck}
                className="flex items-center space-x-2"
              >
                {isAutoCheckEnabled ? (
                  <ToggleRight className="w-6 h-6 text-green-500" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleManualCheck}
                disabled={isProcessing}
                className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'Checking...' : 'Check Now'}</span>
              </button>

              <button
                onClick={resetStats}
                className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Reset Stats</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {isConnected && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Emails Processed</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.emailsProcessed}</p>
                </div>
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Records Imported</p>
                  <p className="text-2xl font-bold text-green-700">{stats.recordsImported}</p>
                </div>
                <Download className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Last Check</p>
                  <p className="text-sm font-bold text-purple-700">
                    {stats.lastCheck ? new Date(stats.lastCheck).toLocaleString() : 'Never'}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Recent Errors */}
          {stats.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Recent Errors ({stats.errors.length})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {stats.errors.slice(-5).map((error, index) => (
                  <p key={index} className="text-sm text-red-700">{error}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Format Instructions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Expected Email Format</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Subject Line (Hour Reference)</h4>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-600 mb-2">The system will extract the hour from these subject formats:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li><code>"Hour 9"</code> or <code>"hour 14"</code></li>
                <li><code>"9"</code> or <code>"14"</code> (numbers only)</li>
                <li><code>"9 AM"</code> or <code>"2 PM"</code></li>
                <li><code>"9:00"</code> or <code>"14:00"</code></li>
                <li><code>"Time 9"</code> or <code>"9 o'clock"</code></li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">CSV Attachment Format</h4>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-600 mb-2">CSV file should have data in these columns:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li><strong>Column B:</strong> Agent Name (must match existing agents exactly)</li>
                <li><strong>Column E:</strong> Number of calls made</li>
                <li><strong>Column F:</strong> Total call time in seconds</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                * Other columns will be ignored<br/>
                * Seconds will be automatically converted to minutes<br/>
                * Data will be imported for today's date with the hour from the subject
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Example Email</h4>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p><strong>Subject:</strong> Hour 9</p>
              <p><strong>Attachment:</strong> call_data.csv</p>
              <div className="mt-2 bg-white rounded border p-2 font-mono text-xs">
                <div>A,B,C,D,E,F,G</div>
                <div>,John Smith,,,15,3600,</div>
                <div>,Jane Doe,,,12,2700,</div>
                <div>,Mike Johnson,,,18,4200,</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Status */}
      {isConnected && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Status</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Auto-check Status</span>
              <span className={`text-sm font-medium ${isAutoCheckEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {isAutoCheckEnabled ? 'Enabled (every 5 minutes)' : 'Disabled'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Current Status</span>
              <span className={`text-sm font-medium ${isProcessing ? 'text-blue-600' : 'text-gray-600'}`}>
                {isProcessing ? 'Processing emails...' : 'Idle'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Next Auto-check</span>
              <span className="text-sm text-gray-600">
                {isAutoCheckEnabled ? 'Within 5 minutes' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}