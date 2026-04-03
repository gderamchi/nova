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
      setTelegramHeaderColor('#0a0a0f');
      const tgUser = getTelegramUser();
      if (tgUser) setUser(tgUser);
    }

    setIsReady(true);
  }, []);

  return { user, isMiniApp, isReady };
}
