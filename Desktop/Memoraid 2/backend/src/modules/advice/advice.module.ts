import { Module } from "@nestjs/common";
import { AdviceController } from "./advice.controller";
import { AdviceService } from "./advice.service";
import { PrismaService } from "../../common/prisma.service";
import { LlmService } from "../../common/llm.service";
import { MemoryModule } from "../memory/memory.module";

@Module({
  imports: [MemoryModule],
  controllers: [AdviceController],
  providers: [AdviceService, PrismaService, LlmService],
  exports: [AdviceService]
})
export class AdviceModule {}

