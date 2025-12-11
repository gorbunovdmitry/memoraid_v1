import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Memoraid",
  description: "AI помощник с памятью в Telegram Mini App"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="app-body">{children}</body>
    </html>
  );
}

