export interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export class CookieManager {
  static set(name: string, value: string, options: CookieOptions = {}): void {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (options.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`;
    }

    if (options.maxAge) {
      cookieString += `; max-age=${options.maxAge}`;
    }

    if (options.path) {
      cookieString += `; path=${options.path}`;
    } else {
      cookieString += `; path=/`;
    }

    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }

    if (options.secure) {
      cookieString += `; secure`;
    }

    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookieString;
  }

  static get(name: string): string | null {
    const nameEQ = encodeURIComponent(name) + '=';
    const cookies = document.cookie.split(';');

    for (let cookie of cookies) {
      let c = cookie.trim();
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length));
      }
    }

    return null;
  }

  static remove(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): void {
    this.set(name, '', {
      ...options,
      expires: new Date(0)
    });
  }

  static exists(name: string): boolean {
    return this.get(name) !== null;
  }

  static getAll(): Record<string, string> {
    const cookies: Record<string, string> = {};
    const cookieArray = document.cookie.split(';');

    for (let cookie of cookieArray) {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[decodeURIComponent(name)] = decodeURIComponent(value);
      }
    }

    return cookies;
  }

  static clear(): void {
    const cookies = this.getAll();
    for (const name in cookies) {
      this.remove(name);
    }
  }
}

// Utility functions for common cookie operations
export const cookieUtils = {
  // User preferences
  setUserPreference: (key: string, value: any) => {
    CookieManager.set(`pref_${key}`, JSON.stringify(value), {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax'
    });
  },

  getUserPreference: (key: string, defaultValue: any = null) => {
    const value = CookieManager.get(`pref_${key}`);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  },

  // Session data
  setSessionData: (key: string, value: any) => {
    CookieManager.set(`session_${key}`, JSON.stringify(value), {
      sameSite: 'lax',
      secure: window.location.protocol === 'https:'
    });
  },

  getSessionData: (key: string, defaultValue: any = null) => {
    const value = CookieManager.get(`session_${key}`);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  },

  // Dashboard settings
  setDashboardSetting: (key: string, value: any) => {
    CookieManager.set(`dashboard_${key}`, JSON.stringify(value), {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: 'lax'
    });
  },

  getDashboardSetting: (key: string, defaultValue: any = null) => {
    const value = CookieManager.get(`dashboard_${key}`);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  },

  // Clear all app cookies
  clearAppCookies: () => {
    const cookies = CookieManager.getAll();
    for (const name in cookies) {
      if (name.startsWith('pref_') || name.startsWith('session_') || name.startsWith('dashboard_')) {
        CookieManager.remove(name);
      }
    }
  }
};