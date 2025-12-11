import { Injectable, Logger } from "@nestjs/common";
import fetch from "node-fetch";
import { createWriteStream } from "fs";
import { join } from "path";
import { mkdir } from "fs/promises";

@Injectable()
export class TelegramFileService {
  private readonly logger = new Logger(TelegramFileService.name);
  private botToken = process.env.TELEGRAM_BOT_TOKEN || "";

  async downloadFile(fileId: string) {
    try {
      const infoRes = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
      );
      const info = await infoRes.json();
      if (!info.ok) {
        this.logger.warn(`getFile failed: ${JSON.stringify(info)}`);
        return null;
      }
      const filePath = info.result.file_path;
      const url = `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
      const outDir = join(process.cwd(), "tmp", "audio");
      await mkdir(outDir, { recursive: true });
      const filename = filePath.split("/").pop() || `${Date.now()}.ogg`;
      const dest = join(outDir, filename);
      const resp = await fetch(url);
      if (!resp.ok || !resp.body) return null;
      await new Promise<void>((resolve, reject) => {
        const stream = createWriteStream(dest);
        resp.body.pipe(stream);
        resp.body.on("error", reject);
        stream.on("finish", () => resolve());
        stream.on("error", reject);
      });
      return dest;
    } catch (e) {
      this.logger.error(`downloadFile error: ${String(e)}`);
      return null;
    }
  }
}

