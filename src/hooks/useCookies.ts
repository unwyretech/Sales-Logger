import { useState, useEffect } from 'react';
import { cookieUtils } from '../utils/cookieUtils';

export function useCookies() {
  const [preferences, setPreferences] = useState<Record<string, any>>({});

  useEffect(() => {
    // Load initial preferences from cookies
    const savedPrefs = {
      theme: cookieUtils.getUserPreference('theme', 'light'),
      dashboardLayout: cookieUtils.getUserPreference('dashboardLayout', 'grid'),
      autoRefresh: cookieUtils.getUserPreference('autoRefresh', true),
      rotatingDashboardInterval: cookieUtils.getUserPreference('rotatingDashboardInterval', 10),
      defaultDateRange: cookieUtils.getUserPreference('defaultDateRange', 7),
    };
    setPreferences(savedPrefs);
  }, []);

  const setPreference = (key: string, value: any) => {
    cookieUtils.setUserPreference(key, value);
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const getPreference = (key: string, defaultValue: any = null) => {
    return preferences[key] ?? defaultValue;
  };

  const clearPreferences = () => {
    cookieUtils.clearAppCookies();
    setPreferences({});
  };

  return {
    preferences,
    setPreference,
    getPreference,
    clearPreferences
  };
}