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
        />
      </head>
      <body className="app-body">{children}</body>
    </html>
  );
}

