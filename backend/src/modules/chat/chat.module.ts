import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { LlmService } from "../../common/llm.service";
import { PrismaService } from "../../common/prisma.service";

@Module({
  controllers: [ChatController],
  providers: [ChatService, LlmService, PrismaService],
  exports: [ChatService]
})
export class ChatModule {}

