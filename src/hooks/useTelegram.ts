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
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const inMiniApp = isTelegramMiniApp();
    setIsMiniApp(inMiniApp);

    let resolved = false;

    if (inMiniApp) {
      expandTelegramApp();
      setTelegramHeaderColor('#0d0a17');
      const tgUser = getTelegramUser();
      if (tgUser) {
        setUser(tgUser);
        resolved = true;
      } else {
        // Retry after a short delay - TMA SDK sometimes loads async
        setTimeout(() => {
          const retryUser = getTelegramUser();
          if (retryUser) {
            setUser(retryUser);
          } else {
            // All retries exhausted inside Telegram context — fall back to guest
            assignGuestUser();
          }
          setIsReady(true);
        }, 500);
        return; // defer setIsReady to the timeout
      }
    }

    // Fallback: try to get user from URL hash (Telegram passes initData there)
    if (!resolved && typeof window !== 'undefined') {
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
              resolved = true;
            }
          }
        }
      } catch { /* ignore parse errors */ }
    }

    // No Telegram user found — assign a persistent guest identity
    if (!resolved) {
      assignGuestUser();
    }

    setIsReady(true);

    function assignGuestUser() {
      const STORAGE_KEY = 'nova_guest_id';
      let guestId = Number(localStorage.getItem(STORAGE_KEY));
      if (!guestId) {
        // Generate a random numeric ID in a safe range that won't collide with real Telegram IDs
        guestId = Math.floor(Math.random() * 900_000_000) + 100_000_000;
        localStorage.setItem(STORAGE_KEY, String(guestId));
      }
      setUser({ id: guestId, firstName: 'Guest', lastName: '', username: 'guest', languageCode: 'en' });
      setIsGuest(true);
    }
  }, []);

  return { user, isMiniApp, isReady, isGuest };
}
