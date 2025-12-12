import { useEffect, useMemo, useState } from "react";

type TelegramWebApp = NonNullable<Window['Telegram']>['WebApp'];

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Пробуем получить WebApp из разных источников
    const tg = (window as any).Telegram?.WebApp || (window as any).tg?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setWebApp(tg);
      console.log("[useTelegram] WebApp initialized, initData:", tg.initData ? "present" : "missing");
    } else {
      // Если не нашли сразу, пробуем через небольшую задержку
      const timer = setTimeout(() => {
        const retryTg = (window as any).Telegram?.WebApp || (window as any).tg?.WebApp;
        if (retryTg) {
          retryTg.ready();
          retryTg.expand();
          setWebApp(retryTg);
          console.log("[useTelegram] WebApp initialized after delay, initData:", retryTg.initData ? "present" : "missing");
        } else {
          console.warn("[useTelegram] Telegram WebApp not found");
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return useMemo(
    () => ({
      webApp,
      initData: webApp?.initData,
      initDataUnsafe: webApp?.initDataUnsafe
    }),
    [webApp]
  );
}

