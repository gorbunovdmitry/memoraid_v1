import "./globals.css";
import type { ReactNode } from "react";
import Script from "next/script";

export const metadata = {
  title: "Memoraid",
  description: "AI помощник с памятью в Telegram Mini App"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Telegram WebApp SDK - загружается автоматически Telegram, но добавляем для надежности */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
          onLoad={() => {
            console.log("[Layout] Telegram WebApp SDK script loaded");
            if (typeof window !== 'undefined') {
              const tg = (window as any).Telegram?.WebApp;
              if (tg) {
                console.log("[Layout] Telegram.WebApp found after script load");
                tg.ready();
                tg.expand();
              } else {
                console.warn("[Layout] Telegram.WebApp not found after script load");
              }
            }
          }}
          onError={(e) => {
            console.error("[Layout] Failed to load Telegram WebApp SDK:", e);
          }}
        />
      </head>
      <body className="app-body">{children}</body>
    </html>
  );
}

