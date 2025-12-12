import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Memoraid",
  description: "AI помощник с памятью в Telegram Mini App"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Telegram WebApp SDK загружается автоматически Telegram при открытии Mini App */}
        {/* Если Mini App открыт правильно через Telegram, SDK будет доступен */}
        <script
          src="https://telegram.org/js/telegram-web-app.js"
          async
        />
      </head>
      <body className="app-body">{children}</body>
    </html>
  );
}

