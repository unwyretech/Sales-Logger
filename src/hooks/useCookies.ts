import { useCallback } from 'react';

interface CookieOptions {
  expires?: number; // Days until expiration
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export function useCookies() {
  const getCookie = useCallback((name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue ? decodeURIComponent(cookieValue) : null;
    }
    return null;
  }, []);

  const setCookie = useCallback((name: string, value: string, options: CookieOptions = {}) => {
    const {
      expires = 30,
      path = '/',
      domain,
      secure = window.location.protocol === 'https:',
      sameSite = 'lax'
    } = options;

    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (expires > 0) {
      const date = new Date();
      date.setTime(date.getTime() + (expires * 24 * 60 * 60 * 1000));
      cookieString += `; expires=${date.toUTCString()}`;
    } else if (expires < 0) {
      // Delete cookie by setting past expiration
      cookieString += `; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
    }
    
    cookieString += `; path=${path}`;
    
    if (domain) {
      cookieString += `; domain=${domain}`;
    }
    
    if (secure) {
      cookieString += `; secure`;
    }
    
    cookieString += `; samesite=${sameSite}`;

    document.cookie = cookieString;
  }, []);

  const deleteCookie = useCallback((name: string, path: string = '/') => {
    setCookie(name, '', { expires: -1, path });
  }, [setCookie]);

  const getAllCookies = useCallback((): Record<string, string> => {
    const cookies: Record<string, string> = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  }, []);

  return {
    getCookie,
    setCookie,
    deleteCookie,
    getAllCookies
  };
}