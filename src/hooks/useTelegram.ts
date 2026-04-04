'use client';

import { useState, useEffect } from 'react';
import {
  getTelegramUser,
  expandTelegramApp,
  isTelegramMiniApp,
  setTelegramHeaderColor,
} from '@/lib/telegram';

interface TelegramUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  languageCode: string;
}

export function useTelegram() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const inMiniApp = isTelegramMiniApp();
    setIsMiniApp(inMiniApp);

    if (inMiniApp) {
      expandTelegramApp();
      setTelegramHeaderColor('#0d0a17');
      const tgUser = getTelegramUser();
      if (tgUser) {
        setUser(tgUser);
      } else {
        // Retry after a short delay - TMA SDK sometimes loads async
        setTimeout(() => {
          const retryUser = getTelegramUser();
          if (retryUser) setUser(retryUser);
        }, 500);
      }
    }

    // Fallback: try to get user from URL hash (Telegram passes initData there)
    if (!inMiniApp && typeof window !== 'undefined') {
      try {
        const hash = window.location.hash;
        if (hash.includes('tgWebAppData')) {
          const params = new URLSearchParams(hash.slice(1));
          const initData = params.get('tgWebAppData');
          if (initData) {
            const dataParams = new URLSearchParams(initData);
            const userStr = dataParams.get('user');
            if (userStr) {
              const u = JSON.parse(decodeURIComponent(userStr));
              setUser({ id: u.id, firstName: u.first_name || '', lastName: u.last_name || '', username: u.username || '', languageCode: u.language_code || 'en' });
            }
          }
        }
      } catch { /* ignore parse errors */ }
    }

    setIsReady(true);
  }, []);

  return { user, isMiniApp, isReady };
}
