import { Injectable, Logger } from "@nestjs/common";
import fetch from "node-fetch";

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private botToken = process.env.TELEGRAM_BOT_TOKEN || "";

  async sendMessage(chatId: string | number, text: string) {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text })
      });
      const data = await res.json();
      if (!data.ok) {
        this.logger.warn(`sendMessage failed: ${JSON.stringify(data)}`);
      }
      return data;
    } catch (e) {
      this.logger.error(`sendMessage error: ${String(e)}`);
      return { ok: false };
    }
  }
}

