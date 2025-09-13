import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from './LoginScreen';
import { PendingApproval } from './PendingApproval';
import { Dashboard } from './Dashboard';
import { CookieConsent } from './CookieConsent';

export function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user || !profile) {
    return <LoginScreen />;
  }

  // Authenticated but not approved - show pending approval
  if (!profile.is_approved) {
    return <PendingApproval />;
  }

  // Authenticated and approved - show dashboard
  return (
    <>
      <Dashboard />
      <CookieConsent />
    </>
  );
}