import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { AudioController } from "./audio.controller";
import { AudioService } from "./audio.service";
import { PrismaService } from "../../common/prisma.service";
import { TelegramFileService } from "./telegram-file.service";
import { LlmService } from "../../common/llm.service";

@Module({
  imports: [
    BullModule.registerQueue({ name: "audio" })
  ],
  controllers: [AudioController],
  providers: [AudioService, PrismaService, TelegramFileService, LlmService],
  exports: [AudioService]
})
export class AudioModule {}

