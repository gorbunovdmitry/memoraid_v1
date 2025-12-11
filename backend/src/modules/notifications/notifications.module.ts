import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { TelegramService } from "./telegram.service";
import { PrismaService } from "../../common/prisma.service";
import { NotificationsController } from "./notifications.controller";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, TelegramService, PrismaService],
  exports: [NotificationsService, TelegramService]
})
export class NotificationsModule {}

