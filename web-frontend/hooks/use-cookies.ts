import { useCallback } from 'react';

interface CookieOptions {
  path?: string;
  expires?: Date;
  maxAge?: number;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export function useCookies() {
  // Get cookie value
  const getCookie = useCallback((name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.split('=').map(c => c.trim());
      if (cookieName === name) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  }, []);

  // Set cookie with options
  const setCookie = useCallback((
    name: string,
    value: string,
    options: CookieOptions = {}
  ): void => {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (options.path) cookieString += `;path=${options.path}`;
    if (options.expires) cookieString += `;expires=${options.expires.toUTCString()}`;
    if (options.maxAge) cookieString += `;max-age=${options.maxAge}`;
    if (options.domain) cookieString += `;domain=${options.domain}`;
    if (options.secure) cookieString += `;secure`;
    if (options.sameSite) cookieString += `;samesite=${options.sameSite}`;

    document.cookie = cookieString;
  }, []);

  // Remove cookie
  const removeCookie = useCallback((name: string, path?: string): void => {
    setCookie(name, '', {
      path,
      expires: new Date(0),
    });
  }, [setCookie]);

  return {
    getCookie,
    setCookie,
    removeCookie,
  };
}