/**
 * Telegram Mini-App SDK helpers
 */

export function getTelegramWebApp(): typeof window.Telegram.WebApp | null {
  if (typeof window === 'undefined') return null;
  return window?.Telegram?.WebApp ?? null;
}

export function isTelegramMiniApp(): boolean {
  return getTelegramWebApp() !== null;
}

export function getTelegramUser() {
  const webapp = getTelegramWebApp();
  if (!webapp?.initDataUnsafe?.user) return null;
  const user = webapp.initDataUnsafe.user;
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name ?? '',
    username: user.username ?? '',
    languageCode: user.language_code ?? 'en',
  };
}

export function expandTelegramApp() {
  const webapp = getTelegramWebApp();
  if (webapp) {
    webapp.expand();
    webapp.ready();
  }
}

export function setTelegramHeaderColor(color: string) {
  const webapp = getTelegramWebApp();
  if (webapp) {
    webapp.setHeaderColor(color as `#${string}`);
    webapp.setBackgroundColor(color as `#${string}`);
  }
}

// Global type augmentation for Telegram WebApp
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        expand: () => void;
        ready: () => void;
        setHeaderColor: (color: `#${string}`) => void;
        setBackgroundColor: (color: `#${string}`) => void;
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
        };
        close: () => void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
      };
    };
  }
}
