import React, { useState, useEffect } from 'react';
import { Cookie, Check, X, Settings } from 'lucide-react';
import { CookieManager } from '../utils/cookieUtils';

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

export function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    functional: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = CookieManager.get('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      // Load saved preferences
      try {
        const savedPrefs = JSON.parse(consent);
        setPreferences(prev => ({ ...prev, ...savedPrefs }));
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    
    CookieManager.set('cookie_consent', JSON.stringify(allAccepted), {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax'
    });
    
    setPreferences(allAccepted);
    setShowBanner(false);
    onAccept?.();
  };

  const handleDeclineAll = () => {
    const onlyNecessary = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    
    CookieManager.set('cookie_consent', JSON.stringify(onlyNecessary), {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax'
    });
    
    setPreferences(onlyNecessary);
    setShowBanner(false);
    onDecline?.();
  };

  const handleSavePreferences = () => {
    CookieManager.set('cookie_consent', JSON.stringify(preferences), {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax'
    });
    
    setShowBanner(false);
    setShowSettings(false);
    
    if (preferences.functional || preferences.analytics || preferences.marketing) {
      onAccept?.();
    } else {
      onDecline?.();
    }
  };

  const updatePreference = (key: keyof typeof preferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <Cookie className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">We use cookies</h3>
                <p className="text-sm text-gray-600 mt-1">
                  We use cookies to enhance your experience, remember your preferences, and analyze site usage. 
                  You can customize your cookie preferences or accept all cookies.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 flex-shrink-0">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Customize</span>
              </button>
              
              <button
                onClick={handleDeclineAll}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Decline</span>
              </button>
              
              <button
                onClick={handleAcceptAll}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Accept All</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Cookie Preferences</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Necessary Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Necessary Cookies</h4>
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                    Always Active
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  These cookies are essential for the website to function properly. They enable core functionality 
                  such as security, network management, and accessibility.
                </p>
              </div>

              {/* Functional Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Functional Cookies</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) => updatePreference('functional', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      preferences.functional ? 'bg-blue-600' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        preferences.functional ? 'translate-x-5' : 'translate-x-0'
                      } mt-0.5 ml-0.5`} />
                    </div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  These cookies enable enhanced functionality and personalization, such as remembering your 
                  dashboard preferences and settings.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Analytics Cookies</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => updatePreference('analytics', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      preferences.analytics ? 'bg-blue-600' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        preferences.analytics ? 'translate-x-5' : 'translate-x-0'
                      } mt-0.5 ml-0.5`} />
                    </div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  These cookies help us understand how visitors interact with our website by collecting 
                  and reporting information anonymously.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Marketing Cookies</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => updatePreference('marketing', e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      preferences.marketing ? 'bg-blue-600' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                        preferences.marketing ? 'translate-x-5' : 'translate-x-0'
                      } mt-0.5 ml-0.5`} />
                    </div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  These cookies are used to deliver personalized advertisements and measure the effectiveness 
                  of advertising campaigns.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleSavePreferences}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}