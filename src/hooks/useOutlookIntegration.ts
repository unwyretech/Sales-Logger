import { useState, useEffect, useCallback } from 'react';
import { outlookManager } from '../utils/outlookUtils';
import { parseEmailCSV } from '../utils/emailParser';
import { useDatabase } from './useDatabase';
import { useCookies } from './useCookies';

interface OutlookStats {
  emailsProcessed: number;
  recordsImported: number;
  lastCheck: string | null;
  errors: string[];
}

export function useOutlookIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<OutlookStats>({
    emailsProcessed: 0,
    recordsImported: 0,
    lastCheck: null,
    errors: []
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const { agents, upsertCallData } = useDatabase();
  const { getCookie, setCookie } = useCookies();

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await outlookManager.initialize();
        const connected = outlookManager.isSignedIn();
        setIsConnected(connected);
        
        if (connected) {
          setCurrentUser(outlookManager.getCurrentUser());
          
          // Load stats from cookies
          const savedStats = getCookie('outlook_stats');
          if (savedStats) {
            setStats(JSON.parse(savedStats));
          }
        }
      } catch (error) {
        console.error('Error checking Outlook connection:', error);
      }
    };

    checkConnection();
  }, [getCookie]);

  // Auto-check for emails every 5 minutes if enabled
  useEffect(() => {
    if (!isConnected) return;

    const autoCheckEnabled = getCookie('outlook_auto_check') !== 'false';
    if (!autoCheckEnabled) return;

    const interval = setInterval(() => {
      checkForNewEmails();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isConnected, getCookie]);

  const connect = async (): Promise<void> => {
    try {
      setIsProcessing(true);
      await outlookManager.initialize();
      const result = await outlookManager.signIn();
      
      setIsConnected(true);
      setCurrentUser(outlookManager.getCurrentUser());
      
      // Save connection state
      setCookie('outlook_connected', 'true', { expires: 30 });
    } catch (error) {
      console.error('Failed to connect to Outlook:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      await outlookManager.signOut();
      setIsConnected(false);
      setCurrentUser(null);
      
      // Clear connection state
      setCookie('outlook_connected', '', { expires: -1 });
      setCookie('outlook_stats', '', { expires: -1 });
    } catch (error) {
      console.error('Failed to disconnect from Outlook:', error);
      throw error;
    }
  };

  const extractHourFromSubject = (subject: string): number | null => {
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
  };

  const checkForNewEmails = useCallback(async (): Promise<void> => {
    if (!isConnected || isProcessing) return;

    try {
      setIsProcessing(true);
      const emails = await outlookManager.getUnreadEmails();
      
      let emailsProcessed = 0;
      let recordsImported = 0;
      const errors: string[] = [];
      const today = new Date().toISOString().split('T')[0];

      for (const email of emails) {
        try {
          // Extract hour from subject
          const hour = extractHourFromSubject(email.subject);
          if (hour === null) {
            console.log(`Skipping email "${email.subject}" - no valid hour found`);
            continue;
          }

          // Get attachments
          const attachments = await outlookManager.getEmailAttachments(email.id);
          const csvAttachments = attachments.filter(att => 
            att.name?.toLowerCase().endsWith('.csv') || 
            att.contentType?.includes('csv') ||
            att.contentType?.includes('text/plain')
          );

          if (csvAttachments.length === 0) {
            console.log(`No CSV attachments found in email "${email.subject}"`);
            continue;
          }

          // Process first CSV attachment
          const csvContent = await outlookManager.downloadAttachment(email.id, csvAttachments[0].id);
          const callDataRecords = parseEmailCSV(csvContent, agents, today, hour);

          if (callDataRecords.length > 0) {
            await upsertCallData(callDataRecords);
            recordsImported += callDataRecords.length;
          }

          // Mark email as read
          await outlookManager.markEmailAsRead(email.id);
          emailsProcessed++;

        } catch (error) {
          const errorMsg = `Error processing email "${email.subject}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Update stats
      const newStats: OutlookStats = {
        emailsProcessed: stats.emailsProcessed + emailsProcessed,
        recordsImported: stats.recordsImported + recordsImported,
        lastCheck: new Date().toISOString(),
        errors: [...stats.errors.slice(-10), ...errors].slice(-20) // Keep last 20 errors
      };

      setStats(newStats);
      setCookie('outlook_stats', JSON.stringify(newStats), { expires: 30 });

    } catch (error) {
      console.error('Error checking for new emails:', error);
      const errorMsg = `Failed to check emails: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setStats(prev => ({
        ...prev,
        errors: [...prev.errors.slice(-19), errorMsg].slice(-20),
        lastCheck: new Date().toISOString()
      }));
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, isProcessing, agents, upsertCallData, stats, setCookie]);

  const resetStats = (): void => {
    const newStats: OutlookStats = {
      emailsProcessed: 0,
      recordsImported: 0,
      lastCheck: null,
      errors: []
    };
    setStats(newStats);
    setCookie('outlook_stats', JSON.stringify(newStats), { expires: 30 });
  };

  const toggleAutoCheck = (): void => {
    const currentSetting = getCookie('outlook_auto_check') !== 'false';
    setCookie('outlook_auto_check', (!currentSetting).toString(), { expires: 30 });
  };

  const isAutoCheckEnabled = (): boolean => {
    return getCookie('outlook_auto_check') !== 'false';
  };

  return {
    isConnected,
    isProcessing,
    stats,
    currentUser,
    connect,
    disconnect,
    checkForNewEmails,
    resetStats,
    toggleAutoCheck,
    isAutoCheckEnabled: isAutoCheckEnabled(),
  };
}