import { useEffect, useMemo, useState } from "react";

type TelegramWebApp = NonNullable<Window['Telegram']>['WebApp'];

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Функция для инициализации WebApp
    const initWebApp = (tg: any) => {
      if (!tg) return;
      
      // Вызываем ready() перед использованием
      tg.ready();
      tg.expand();
      
      // Проверяем initData
      const hasInitData = !!tg.initData;
      console.log("[useTelegram] WebApp initialized, initData:", hasInitData ? `present (${tg.initData.length} chars)` : "missing");
      
      if (!hasInitData) {
        console.warn("[useTelegram] WARNING: initData is missing! Telegram Mini App may not be properly initialized.");
      }
      
      setWebApp(tg);
    };
    
    // Пробуем получить WebApp из разных источников
    const tg = (window as any).Telegram?.WebApp || (window as any).tg?.WebApp;
    if (tg) {
      initWebApp(tg);
    } else {
      // Если не нашли сразу, пробуем через небольшую задержку
      const timer = setTimeout(() => {
        const retryTg = (window as any).Telegram?.WebApp || (window as any).tg?.WebApp;
        if (retryTg) {
          initWebApp(retryTg);
        } else {
          console.warn("[useTelegram] Telegram WebApp not found after retry");
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

