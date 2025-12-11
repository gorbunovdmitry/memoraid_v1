import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { EncryptionService } from "../../common/encryption.service";

@Injectable()
export class MemorySearchRepository {
  private readonly logger = new Logger(MemorySearchRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService
  ) {}

  async semanticSearch(userId: bigint, queryEmbedding: number[], limit = 10) {
    // pgvector negative inner product: embedding <#> query
    // <#> returns negative values for similar vectors, so we order ASC to get most similar first
    const vec = `[${queryEmbedding.join(",")}]`;
    
    this.logger.log(`[semanticSearch] Executing query for userId=${userId}, embedding length=${queryEmbedding.length}, limit=${limit}`);
    
    if (!this.prisma) {
      this.logger.error(`[semanticSearch] PrismaService is undefined!`);
      throw new Error("PrismaService is not initialized");
    }
    
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT m.id, m.title, m.content, m."createdAt", m."folderId", f.name as folder_name
       FROM "Memory" m
       LEFT JOIN "Folder" f ON m."folderId" = f.id
       WHERE m."userId" = $1::bigint AND m.embedding IS NOT NULL
       ORDER BY m.embedding <#> $2::vector ASC
       LIMIT $3`,
      userId.toString(),
      vec,
      limit.toString()
    );
    
    this.logger.log(`[semanticSearch] Found ${rows.length} raw results`);
    
    return rows.map((row: any) => {
      // Автоматически расшифровываем при чтении из БД
      const decryptedTitle = this.encryption.isEncrypted(row.title) ? this.encryption.decrypt(row.title) : row.title;
      const decryptedContent = row.content && this.encryption.isEncrypted(row.content) ? this.encryption.decrypt(row.content) : row.content;
      
      return {
        id: typeof row.id === 'bigint' ? row.id.toString() : String(row.id),
        title: decryptedTitle,
        content: decryptedContent,
        createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
        folderId: typeof row.folderId === 'bigint' ? row.folderId.toString() : (row.folderId ? String(row.folderId) : null),
        folderName: row.folder_name || null
      };
    });
  }
}

