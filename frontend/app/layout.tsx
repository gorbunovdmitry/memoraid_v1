import "./globals.css";
import "./material-design.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Memoraid",
  description: "AI помощник с памятью в Telegram Mini App"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Google Fonts - Roboto для Material Design */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
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

