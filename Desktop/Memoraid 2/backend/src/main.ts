import { config } from "dotenv";
config(); // Загружаем .env файл

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { json } from "express";
import { ValidationPipe } from "@nestjs/common";
import { AllExceptionsFilter } from "./common/http-exception.filter";
import * as helmet from "helmet";
import rateLimit from "express-rate-limit";

async function bootstrap() {
  // Проверяем, что переменные окружения загружены
  console.log(`[Bootstrap] NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`[Bootstrap] TELEGRAM_BOT_TOKEN=${process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET'}`);
  
  const app = await NestFactory.create(AppModule, { 
    cors: {
      origin: process.env.FRONTEND_URL || true,
      credentials: true,
    },
    logger: ['error', 'warn', 'log', 'debug', 'verbose']
  });
  
  // Security Headers (Helmet)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 год
      includeSubDomains: true,
      preload: true
    },
    crossOriginEmbedderPolicy: false, // Для Telegram Mini App
  }));
  
  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов с одного IP
    message: 'Слишком много запросов, попробуйте позже',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Пропускаем health check
      return req.path === '/health';
    }
  });
  app.use('/api/', limiter);
  
  app.use(json({ limit: "5mb" }));
  
  // HTTPS редирект в production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https' && req.header('host')?.includes('localhost') === false) {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }
  
  // Глобальный обработчик ошибок
  app.useGlobalFilters(new AllExceptionsFilter());
  
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true, // Блокируем лишние поля
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on ${port}`);
}

bootstrap();

