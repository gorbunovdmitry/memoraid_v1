import { Module } from "@nestjs/common";
import { MemoryController } from "./memory.controller";
import { MemoryService } from "./memory.service";
import { PrismaService } from "../../common/prisma.service";
import { LlmService } from "../../common/llm.service";
import { MemorySearchRepository } from "./search.repository";
import { EncryptionService } from "../../common/encryption.service";

@Module({
  controllers: [MemoryController],
  providers: [
    MemoryService,
    PrismaService,
    LlmService,
    MemorySearchRepository,
    EncryptionService,
  ],
  exports: [MemoryService]
})
export class MemoryModule {}

