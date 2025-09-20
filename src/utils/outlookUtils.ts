import { PublicClientApplication, Configuration, AuthenticationResult } from '@azure/msal-browser';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthCodeMSALBrowserAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser';

// MSAL configuration
const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

// Required scopes for reading emails and attachments
const loginRequest = {
  scopes: ['https://graph.microsoft.com/Mail.Read', 'https://graph.microsoft.com/Mail.ReadWrite'],
};

export class OutlookManager {
  private msalInstance: PublicClientApplication;
  private graphClient: Client | null = null;

  constructor() {
    this.msalInstance = new PublicClientApplication(msalConfig);
  }

  async initialize(): Promise<void> {
    await this.msalInstance.initialize();
  }

  async signIn(): Promise<AuthenticationResult> {
    try {
      const response = await this.msalInstance.loginPopup(loginRequest);
      await this.initializeGraphClient();
      return response;
    } catch (error) {
      console.error('Outlook sign-in failed:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    await this.msalInstance.logoutPopup();
    this.graphClient = null;
  }

  async getAccessToken(): Promise<string> {
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found. Please sign in first.');
    }

    try {
      const response = await this.msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      return response.accessToken;
    } catch (error) {
      // If silent token acquisition fails, try interactive
      const response = await this.msalInstance.acquireTokenPopup(loginRequest);
      return response.accessToken;
    }
  }

  private async initializeGraphClient(): Promise<void> {
    const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(
      this.msalInstance,
      loginRequest
    );

    this.graphClient = Client.initWithMiddleware({
      authProvider: authProvider,
    });
  }

  async getUnreadEmails(): Promise<any[]> {
    if (!this.graphClient) {
      await this.initializeGraphClient();
    }

    try {
      const response = await this.graphClient!
        .api('/me/messages')
        .filter('isRead eq false and hasAttachments eq true')
        .select('id,subject,receivedDateTime,hasAttachments,from')
        .orderby('receivedDateTime desc')
        .top(50)
        .get();

      return response.value || [];
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  async getEmailAttachments(messageId: string): Promise<any[]> {
    if (!this.graphClient) {
      await this.initializeGraphClient();
    }

    try {
      const response = await this.graphClient!
        .api(`/me/messages/${messageId}/attachments`)
        .get();

      return response.value || [];
    } catch (error) {
      console.error('Error fetching attachments:', error);
      throw error;
    }
  }

  async downloadAttachment(messageId: string, attachmentId: string): Promise<string> {
    if (!this.graphClient) {
      await this.initializeGraphClient();
    }

    try {
      const attachment = await this.graphClient!
        .api(`/me/messages/${messageId}/attachments/${attachmentId}`)
        .get();

      if (attachment.contentBytes) {
        // Decode base64 content
        return atob(attachment.contentBytes);
      }
      
      throw new Error('No content found in attachment');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw error;
    }
  }

  async markEmailAsRead(messageId: string): Promise<void> {
    if (!this.graphClient) {
      await this.initializeGraphClient();
    }

    try {
      await this.graphClient!
        .api(`/me/messages/${messageId}`)
        .patch({
          isRead: true,
        });
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    }
  }

  isSignedIn(): boolean {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0;
  }

  getCurrentUser(): any {
    const accounts = this.msalInstance.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }
}

export const outlookManager = new OutlookManager();