import React from 'react';
import { Clock, Shield, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function PendingApproval() {
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-full mb-4">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Account Pending Approval</h1>
          <p className="text-gray-600 mt-2">
            Your account is waiting for administrator approval
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
              <Shield className="w-6 h-6 text-yellow-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Account Created Successfully</h2>
              <p className="text-gray-600 mt-2">
                Welcome, {profile?.full_name || profile?.email}!
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-yellow-800">
                    Waiting for Admin Approval
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    An administrator needs to approve your account before you can access the dashboard. 
                    You'll receive an email notification once your account is approved.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Account Email:</strong> {profile?.email}</p>
              <p><strong>Account Role:</strong> {profile?.role}</p>
              <p><strong>Status:</strong> Pending Approval</p>
            </div>

            <button
              onClick={signOut}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}