import { useEffect, useMemo, useState } from "react";

type TelegramWebApp = NonNullable<Window['Telegram']>['WebApp'];

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [initDataState, setInitDataState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Функция для получения initData из разных источников
    const getInitData = (tg: any): string | null => {
      if (!tg) return null;
      
      // Способ 1: Прямой доступ к initData
      if (tg.initData && typeof tg.initData === 'string' && tg.initData.length > 0) {
        return tg.initData;
      }
      
      // Способ 2: Через initDataUnsafe (если доступен)
      if (tg.initDataUnsafe) {
        // Если initDataUnsafe - это объект, пытаемся получить query_id или другую строку
        if (typeof tg.initDataUnsafe === 'string' && tg.initDataUnsafe.length > 0) {
          return tg.initDataUnsafe;
        }
        // Если это объект, пытаемся сериализовать его
        if (typeof tg.initDataUnsafe === 'object') {
          try {
            const serialized = new URLSearchParams(tg.initDataUnsafe as any).toString();
            if (serialized.length > 0) {
              return serialized;
            }
          } catch (e) {
            // Игнорируем ошибку сериализации
          }
        }
      }
      
      // Способ 3: Через window.location.search (если Telegram передает через URL)
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        const tgWebAppData = params.get('tgWebAppData');
        if (tgWebAppData && tgWebAppData.length > 0) {
          return tgWebAppData;
        }
      }
      
      return null;
    };
    
    // Функция для инициализации WebApp
    const initWebApp = (tg: any) => {
      if (!tg) return;
      
      // Принудительно устанавливаем светлую тему
      try {
        if (tg.setHeaderColor) {
          tg.setHeaderColor('#ffffff');
        }
        if (tg.setBackgroundColor) {
          tg.setBackgroundColor('#ffffff');
        }
        // Отключаем темную тему через colorScheme
        if (typeof tg.colorScheme !== 'undefined') {
          (tg as any).colorScheme = 'light';
        }
      } catch (e) {
        console.warn("[useTelegram] Could not set theme colors:", e);
      }
      
      // Вызываем ready() перед использованием
      tg.ready();
      tg.expand();
      
      // Получаем initData
      const initData = getInitData(tg);
      
      console.log("[useTelegram] WebApp initialized");
      console.log("[useTelegram] tg.initData:", tg.initData ? `present (${tg.initData.length} chars)` : "missing");
      console.log("[useTelegram] tg.initDataUnsafe:", tg.initDataUnsafe ? (typeof tg.initDataUnsafe === 'object' ? `object: ${JSON.stringify(tg.initDataUnsafe).substring(0, 100)}` : `string: ${tg.initDataUnsafe.length} chars`) : "missing");
      console.log("[useTelegram] window.location.search:", typeof window !== 'undefined' ? window.location.search : "N/A");
      console.log("[useTelegram] Final initData:", initData ? `present (${initData.length} chars)` : "missing");
      
      if (!initData) {
        console.error("[useTelegram] ERROR: initData is missing!");
        console.error("[useTelegram] Possible reasons:");
        console.error("  1. Mini App is not opened through Telegram");
        console.error("  2. Mini App URL is not correctly configured in BotFather");
        console.error("  3. Telegram WebApp SDK is not properly initialized");
        console.error("[useTelegram] Full tg object:", JSON.stringify(tg, null, 2).substring(0, 500));
      }
      
      setWebApp(tg);
      setInitDataState(initData);
      
      // Пробуем получить initData через событие (если доступно)
      if (tg.onEvent) {
        tg.onEvent('viewportChanged', () => {
          const newInitData = getInitData(tg);
          if (newInitData && newInitData !== initDataState) {
            console.log("[useTelegram] initData updated via event");
            setInitDataState(newInitData);
          }
        });
      }
    };
    
    // Функция для проверки и инициализации WebApp
    const checkAndInit = () => {
      const tg = (window as any).Telegram?.WebApp || (window as any).tg?.WebApp;
      if (tg) {
        initWebApp(tg);
        return true;
      }
      return false;
    };
    
    // Пробуем получить WebApp сразу
    if (checkAndInit()) {
      return;
    }
    
    // Если не нашли сразу, пробуем несколько раз с увеличивающейся задержкой
    let attempts = 0;
    const maxAttempts = 10;
    const delays = [100, 200, 300, 500, 1000, 2000];
    
    const tryInit = () => {
      attempts++;
      if (checkAndInit()) {
        return;
      }
      
      if (attempts < maxAttempts) {
        const delay = delays[attempts - 1] || 2000;
        setTimeout(tryInit, delay);
      } else {
        console.error("[useTelegram] Telegram WebApp not found after all retries");
        console.error("[useTelegram] window.Telegram:", (window as any).Telegram ? "exists" : "missing");
        console.error("[useTelegram] window.tg:", (window as any).tg ? "exists" : "missing");
        console.error("[useTelegram] window keys:", Object.keys(window).filter(k => k.toLowerCase().includes('telegram')));
        console.error("[useTelegram] This usually means:");
        console.error("  1. Mini App is not opened through Telegram");
        console.error("  2. Telegram WebApp SDK script is not loaded");
        console.error("  3. Mini App URL is not correctly configured in BotFather");
      }
    };
    
    // Начинаем попытки
    const timer = setTimeout(tryInit, 100);
    return () => clearTimeout(timer);
  }, [initDataState]);

  return useMemo(() => {
    // Используем initData из состояния или из webApp
    const initData = initDataState || webApp?.initData || null;
    
    // Логируем для отладки
    if (webApp && !initData) {
      console.warn("[useTelegram] initData is null in return value");
      console.warn("[useTelegram] initDataState:", initDataState);
      console.warn("[useTelegram] webApp.initData:", webApp.initData);
      console.warn("[useTelegram] webApp.initDataUnsafe:", webApp.initDataUnsafe);
    }
    
    return {
      webApp,
      initData,
      initDataUnsafe: webApp?.initDataUnsafe
    };
  }, [webApp, initDataState]);
}

