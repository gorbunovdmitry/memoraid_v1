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
      
      // Проверяем initData из разных источников
      const initData = tg.initData || tg.initDataUnsafe?.query_id || null;
      const hasInitData = !!initData;
      
      console.log("[useTelegram] WebApp initialized");
      console.log("[useTelegram] tg.initData:", tg.initData ? `present (${tg.initData.length} chars)` : "missing");
      console.log("[useTelegram] tg.initDataUnsafe:", tg.initDataUnsafe ? "present" : "missing");
      console.log("[useTelegram] Final initData:", hasInitData ? `present (${initData.length} chars)` : "missing");
      
      if (!hasInitData) {
        console.warn("[useTelegram] WARNING: initData is missing!");
        console.warn("[useTelegram] Make sure Mini App is opened through Telegram (not in browser)");
        console.warn("[useTelegram] Check that Mini App URL is correctly configured in BotFather");
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
          console.warn("[useTelegram] window.Telegram:", (window as any).Telegram ? "exists" : "missing");
          console.warn("[useTelegram] window.tg:", (window as any).tg ? "exists" : "missing");
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return useMemo(() => {
    // Пробуем получить initData из разных источников
    const initData = webApp?.initData || null;
    
    // Логируем для отладки
    if (webApp && !initData) {
      console.warn("[useTelegram] initData is null in return value");
      console.warn("[useTelegram] webApp.initData:", webApp.initData);
      console.warn("[useTelegram] webApp.initDataUnsafe:", webApp.initDataUnsafe);
    }
    
    return {
      webApp,
      initData,
      initDataUnsafe: webApp?.initDataUnsafe
    };
  }, [webApp]);
}

