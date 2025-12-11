import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AppController } from "./app.controller";
import { IngestModule } from "./modules/ingest/ingest.module";
import { MemoryModule } from "./modules/memory/memory.module";
import { CalendarModule } from "./modules/calendar/calendar.module";
import { AdviceModule } from "./modules/advice/advice.module";
import { AudioModule } from "./modules/audio/audio.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { BillingModule } from "./modules/billing/billing.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ChatModule } from "./modules/chat/chat.module";
import { SearchModule } from "./modules/search/search.module";
import { PrismaService } from "./common/prisma.service";
import { UserContextMiddleware } from "./common/user-context.middleware";
import { LlmService } from "./common/llm.service";
import { BullModule } from "@nestjs/bull";

@Module({
  imports: [
    BullModule.forRoot({
      redis: process.env.REDIS_URL || "redis://localhost:6379"
    }),
    IngestModule,
    MemoryModule,
    CalendarModule,
    AdviceModule,
    AudioModule,
    ProfileModule,
    BillingModule,
    NotificationsModule,
    ChatModule,
    SearchModule
  ],
  controllers: [AppController],
  providers: [PrismaService, LlmService],
  exports: [PrismaService, LlmService] // Экспортируем для использования в других модулях
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const nodeEnv = process.env.NODE_ENV;
    const isDev = !nodeEnv || nodeEnv === "" || nodeEnv === "development";
    
    console.log(`[AppModule] Configuring middleware. NODE_ENV="${nodeEnv}", isDev=${isDev}`);
    
    // В dev режиме middleware всегда создает тестового пользователя без проверки авторизации
    // В production применяем middleware с проверкой авторизации
    consumer
      .apply(UserContextMiddleware)
      .exclude("/health", "/health/(.*)", "/")
      .forRoutes("*");
  }
}

