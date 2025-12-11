import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { PrismaService } from "../common/prisma.service";
import { AudioQueueProcessor } from "./workers/audio.processor";
import { ReminderQueueProcessor } from "./workers/reminder.processor";
import { AudioService } from "../modules/audio/audio.service";
import { TelegramFileService } from "../modules/audio/telegram-file.service";
import { LlmService } from "../common/llm.service";
import { NotificationsService } from "../modules/notifications/notifications.service";
import { TelegramService } from "../modules/notifications/telegram.service";

@Module({
  imports: [
    BullModule.forRoot({
      redis: process.env.REDIS_URL || "redis://localhost:6379"
    }),
    BullModule.registerQueue(
      { name: "audio" },
      { name: "reminder" }
    )
  ],
  providers: [
    PrismaService,
    AudioService,
    TelegramFileService,
    LlmService,
    NotificationsService,
    TelegramService,
    AudioQueueProcessor,
    ReminderQueueProcessor
  ],
  exports: [BullModule]
})
export class QueueModule {}

