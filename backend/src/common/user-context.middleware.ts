import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { verifyInitData, parseInitData } from "./telegram";
import { PrismaService } from "./prisma.service";

declare global {
  namespace Express {
    interface Request {
      userId?: bigint;
      tgId?: bigint;
    }
  }
}

@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const nodeEnv = process.env.NODE_ENV;
    // В dev режиме всегда true, если NODE_ENV не установлен или равен "development"
    const isDev = !nodeEnv || nodeEnv === "" || nodeEnv === "development";

    // Явный лог для отладки
    console.log(`[UserContextMiddleware] ${req.path} - NODE_ENV="${nodeEnv}", isDev=${isDev}`);

    // В режиме разработки ВСЕГДА создаем тестового пользователя без проверки авторизации
    // Авторизация полностью отключена для разработки
    if (isDev) {
      console.log(`[UserContextMiddleware] DEV MODE: Creating test user (auth disabled)`);
      try {
        const testTgId = BigInt(123456789);
        const user = await this.prisma.user.upsert({
          where: { tgId: testTgId },
          update: {},
          create: { tgId: testTgId, locale: "ru" }
        });
        req.userId = user.id;
        req.tgId = user.tgId;
        return next();
      } catch (error) {
        // Если ошибка при создании пользователя, все равно пропускаем запрос
        console.error("[UserContextMiddleware] Error creating test user:", error);
        req.userId = BigInt(1);
        req.tgId = BigInt(123456789);
        return next();
      }
    }

    // Production: проверка авторизации через Telegram initData
    const initDataHeader = req.headers["x-telegram-init-data"] as string;
    const initDataBody = req.body?.initData as string;
    const initData = initDataHeader || initDataBody || "";
    const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";

    // Логирование для отладки
    console.log(`[UserContextMiddleware] initData header: ${initDataHeader ? "present" : "missing"}`);
    console.log(`[UserContextMiddleware] initData body: ${initDataBody ? "present" : "missing"}`);
    console.log(`[UserContextMiddleware] initData final: ${initData ? `present (${initData.length} chars)` : "missing"}`);
    console.log(`[UserContextMiddleware] botToken: ${botToken ? "SET" : "NOT SET"}`);

    if (!initData || !botToken) {
      const errorMsg = `missing initData or botToken (initData: ${initData ? "present" : "missing"}, botToken: ${botToken ? "present" : "missing"})`;
      console.error(`[UserContextMiddleware] ${errorMsg}`);
      throw new UnauthorizedException(errorMsg);
    }
    
    let isValid = false;
    try {
      isValid = verifyInitData(initData, botToken);
    } catch (e) {
      throw new UnauthorizedException("invalid initData format");
    }
    
    if (!isValid) {
      throw new UnauthorizedException("invalid initData signature");
    }
    
    const parsed = parseInitData(initData);
    const tgId = parsed?.user?.id;
    if (!tgId) {
      throw new UnauthorizedException("no tg id");
    }
    
    // find or create user
    const user = await this.prisma.user.upsert({
      where: { tgId: BigInt(tgId) },
      update: { locale: parsed.user?.language_code ?? "ru" },
      create: { tgId: BigInt(tgId), locale: parsed.user?.language_code ?? "ru" }
    });
    req.userId = user.id;
    req.tgId = user.tgId;
    next();
  }
}
