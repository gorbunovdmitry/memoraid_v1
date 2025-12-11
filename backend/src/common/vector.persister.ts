import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { toPgVector } from "./vector";

@Injectable()
export class VectorPersister {
  private readonly logger = new Logger(VectorPersister.name);
  constructor(private readonly prisma: PrismaService) {}

  async updateMemoryEmbedding(memoryId: bigint, embedding: number[]) {
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Memory" SET embedding = $1::vector WHERE id = $2`,
        `[${embedding.join(",")}]`,
        memoryId.toString()
      );
    } catch (e) {
      this.logger.warn(`updateMemoryEmbedding failed: ${String(e)}`);
    }
  }
}

