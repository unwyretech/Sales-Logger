import React, { useState } from 'react';
import { Settings, Cookie, Trash2, Download, User, Bell } from 'lucide-react';
import { useCookies } from '../hooks/useCookies';
import { CookieManager } from '../utils/cookieUtils';
import { useAuth } from '../contexts/AuthContext';

export function UserSettings() {
  const { preferences, setPreference, clearPreferences } = useCookies();
  const { profile } = useAuth();
  const [showCookieDetails, setShowCookieDetails] = useState(false);

  const handleExportData = () => {
    const userData = {
      profile: profile,
      preferences: preferences,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const allCookies = CookieManager.getAll();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Settings className="w-6 h-6 mr-2 text-blue-600" />
          User Settings
        </h2>
        <p className="text-gray-600 mt-1">Manage your preferences and privacy settings</p>
      </div>

      {/* User Preferences */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-blue-500" />
          Dashboard Preferences
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Auto-refresh Data</label>
              <p className="text-sm text-gray-600">Automatically refresh dashboard data every 10 minutes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.autoRefresh ?? true}
                onChange={(e) => setPreference('autoRefresh', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                preferences.autoRefresh ? 'bg-blue-600' : 'bg-gray-300'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.autoRefresh ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`} />
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Rotating Dashboard Interval</label>
              <p className="text-sm text-gray-600">How often to switch teams in the rotating dashboard</p>
            </div>
            <select
              value={preferences.rotatingDashboardInterval ?? 10}
              onChange={(e) => setPreference('rotatingDashboardInterval', Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-900">Default Date Range</label>
              <p className="text-sm text-gray-600">Default number of days to show in reports</p>
            </div>
            <select
              value={preferences.defaultDateRange ?? 7}
              onChange={(e) => setPreference('defaultDateRange', Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>1 day</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cookie Management */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Cookie className="w-5 h-5 mr-2 text-orange-500" />
          Cookie Management
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Stored Cookies</p>
              <p className="text-sm text-gray-600">{Object.keys(allCookies).length} cookies currently stored</p>
            </div>
            <button
              onClick={() => setShowCookieDetails(!showCookieDetails)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showCookieDetails ? 'Hide Details' : 'View Details'}
            </button>
          </div>

          {showCookieDetails && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(allCookies).map(([name, value]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-gray-700">{name}</span>
                    <span className="text-gray-500 truncate max-w-xs ml-2">
                      {value.length > 50 ? `${value.substring(0, 50)}...` : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={clearPreferences}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Cookies</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2 text-green-500" />
          Data Export
        </h3>
        
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900">Export Your Data</p>
            <p className="text-sm text-gray-600">Download a copy of your profile and preferences data</p>
          </div>
          
          <button
            onClick={handleExportData}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export My Data</span>
          </button>
        </div>
      </div>

      {/* Privacy Information */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Privacy Information</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>• We only collect data necessary for the dashboard to function properly</p>
          <p>• Your preferences are stored locally in your browser</p>
          <p>• No personal data is shared with third parties</p>
          <p>• You can delete your data at any time using the controls above</p>
        </div>
      </div>
    </div>
  );
}