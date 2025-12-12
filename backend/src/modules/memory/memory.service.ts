import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { LlmService } from "../../common/llm.service";
import { MemorySearchRepository } from "./search.repository";
import { EncryptionService } from "../../common/encryption.service";

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly searchRepo: MemorySearchRepository,
    private readonly encryption: EncryptionService
  ) {}

  async create(body: { userId?: bigint; folder: string; title: string; content: string }) {
    const userId = body.userId!;
    const folder = await this.ensureFolder(userId, body.folder);
    
    // Шифруем sensitive данные перед сохранением
    const encryptedTitle = this.encryption.encrypt(body.title);
    const encryptedContent = this.encryption.encrypt(body.content);
    
    // Если title пустой, используем только content для embedding
    const textToEmbed = body.title ? [body.title, body.content].join("\n") : body.content;
    this.logger.log(`[create] Creating memory in folder "${body.folder}"`); // Не логируем sensitive данные
    const embedding = await this.llm.embed(textToEmbed);
    this.logger.log(`[create] Generated embedding, length: ${embedding.length}`);
    const embeddingStr = `[${embedding.join(",")}]`;
    
    // Сохраняем зашифрованные данные
    const result = await this.prisma.$queryRawUnsafe<Array<{ 
      id: bigint; 
      createdAt: Date;
      title: string;
      content: string;
      folderName: string;
    }>>(
      `INSERT INTO "Memory" ("userId", "folderId", title, content, embedding, "createdAt")
       VALUES ($1::bigint, $2::bigint, $3, $4, $5::vector, NOW())
       RETURNING id, "createdAt", title, content, (SELECT name FROM "Folder" WHERE id = $2::bigint) as "folderName"`,
      userId.toString(),
      folder.id.toString(),
      encryptedTitle, // Зашифровано
      encryptedContent, // Зашифровано
      embeddingStr
    );
    
    if (!result || result.length === 0) throw new Error("Failed to create memory");
    const created = result[0];
    
    this.logger.log(`[create] Memory created successfully with id: ${created.id}`);
    
    // Расшифровываем для возврата пользователю
    return { 
      id: created.id.toString(), 
      title: this.encryption.decrypt(created.title), // Расшифровываем при чтении
      content: this.encryption.decrypt(created.content),
      folder: created.folderName, 
      created_at: created.createdAt instanceof Date ? created.createdAt.toISOString() : new Date(created.createdAt).toISOString()
    };
  }

  async search(params: { userId: bigint; folder?: string; q?: string }) {
    try {
      if (params.q && params.q.trim().length > 0) {
        try {
          this.logger.log(`[search] Performing semantic search`); // Не логируем query (может содержать sensitive данные)
          const embedding = await this.llm.embed(params.q);
          this.logger.log(`[search] Generated embedding, length: ${embedding.length}`);
          const sem = await this.searchRepo.semanticSearch(params.userId, embedding, 10);
          this.logger.log(`[search] Found ${sem.length} semantic matches`); // Не логируем содержимое заметок
      return {
        items: sem.map((m) => {
          // Автоматически расшифровываем при чтении
          const decryptedTitle = this.encryption.isEncrypted(m.title) ? this.encryption.decrypt(m.title) : m.title;
          const decryptedContent = m.content && this.encryption.isEncrypted(m.content) ? this.encryption.decrypt(m.content) : m.content;
          return {
            id: typeof m.id === 'bigint' ? m.id.toString() : String(m.id),
            folder: m.folderName || '',
            title: decryptedTitle || '',
            snippet: decryptedContent ? decryptedContent.slice(0, 160) : '',
            created_at: m.createdAt instanceof Date ? m.createdAt.toISOString() : (m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString())
          };
        }),
            total: sem.length,
            folder: params.folder,
            q: params.q
          };
        } catch (error) {
          // Если semantic search не сработал, возвращаем пустой результат
          this.logger.warn(`[search] Semantic search failed: ${String(error)}`, error instanceof Error ? error.stack : undefined);
          return {
            items: [],
            total: 0,
            folder: params.folder,
            q: params.q
          };
        }
      }
      
      this.logger.log(`[search] Listing memories for folder: "${params.folder || 'all'}"`);
      const items = await this.prisma.memory.findMany({
        where: {
          userId: params.userId,
          folder: params.folder ? { name: params.folder } : undefined
        },
        orderBy: { createdAt: "desc" },
        take: 50, // Увеличено для лучшего UX
        select: { id: true, title: true, content: true, createdAt: true, folder: { select: { name: true } } }
      });
      
      this.logger.log(`[search] Found ${items.length} memories`);
      
      return {
        items: items.map((m) => {
          // Автоматически расшифровываем при чтении
          const decryptedTitle = this.encryption.isEncrypted(m.title) ? this.encryption.decrypt(m.title) : m.title;
          const decryptedContent = m.content && this.encryption.isEncrypted(m.content) ? this.encryption.decrypt(m.content) : m.content;
          return {
            id: m.id.toString(),
            folder: m.folder?.name || '',
            title: decryptedTitle || '',
            snippet: decryptedContent ? decryptedContent.slice(0, 160) : '',
            created_at: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString()
          };
        }),
        total: items.length,
        folder: params.folder,
        q: params.q
      };
    } catch (error) {
      this.logger.error(`[search] Error searching memories: ${String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async findOne(userId: bigint, id: bigint) {
    try {
      const memory = await this.prisma.memory.findFirst({
        where: {
          id,
          userId
        },
        include: {
          folder: true
        }
      });

      if (!memory) {
        this.logger.warn(`[findOne] Memory not found: id=${id}, userId=${userId}`);
        throw new Error("Memory not found");
      }

      // Автоматически расшифровываем при чтении
      const decryptedTitle = this.encryption.isEncrypted(memory.title) ? this.encryption.decrypt(memory.title) : memory.title;
      const decryptedContent = memory.content && this.encryption.isEncrypted(memory.content) ? this.encryption.decrypt(memory.content) : memory.content;
      
      return {
        id: memory.id.toString(),
        title: decryptedTitle || '',
        content: decryptedContent || '',
        folder: memory.folder?.name || '',
        created_at: memory.createdAt instanceof Date ? memory.createdAt.toISOString() : new Date(memory.createdAt).toISOString()
      };
    } catch (error) {
      this.logger.error(`[findOne] Error finding memory: ${String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async update(userId: bigint, id: bigint, data: { title?: string; content?: string; folder?: string }) {
    try {
      // Проверяем, что заметка существует и принадлежит пользователю
      const existing = await this.prisma.memory.findFirst({
        where: { id, userId },
        include: { folder: true }
      });

      if (!existing) {
        this.logger.warn(`[update] Memory not found: id=${id}, userId=${userId}`);
        throw new Error("Memory not found");
      }

      // Если меняется папка, нужно получить или создать новую папку
      let folderId = existing.folderId;
      if (data.folder && data.folder !== existing.folder.name) {
        const folder = await this.ensureFolder(userId, data.folder);
        folderId = folder.id;
      }

      // Генерация embedding отложена - будет выполнена в фоне
      // Это значительно ускоряет сохранение заметок
      // Для сравнения расшифровываем существующие данные
      const existingTitle = this.encryption.isEncrypted(existing.title) ? this.encryption.decrypt(existing.title) : existing.title;
      const existingContent = existing.content && this.encryption.isEncrypted(existing.content) ? this.encryption.decrypt(existing.content) : existing.content;
      const titleChanged = data.title !== undefined && data.title !== existingTitle;
      const contentChanged = data.content !== undefined && data.content !== existingContent;
      const needsEmbeddingUpdate = titleChanged || contentChanged;

      // Обновляем заметку с автоматическим шифрованием
      const updateData: any = {};
      if (data.title !== undefined) {
        // Шифруем перед сохранением
        updateData.title = this.encryption.encrypt(data.title || '');
      }
      if (data.content !== undefined) {
        // Шифруем перед сохранением
        updateData.content = this.encryption.encrypt(data.content || '');
      }
      if (folderId !== existing.folderId) updateData.folderId = folderId;
      
      this.logger.log(`[update] Updating memory id=${id} with data:`, { 
        titleChanged: data.title !== undefined, 
        contentChanged: data.content !== undefined,
        folderChanged: folderId !== existing.folderId,
        needsEmbeddingUpdate
      });
      
      // Обновляем обычные поля через Prisma (быстро)
      if (Object.keys(updateData).length > 0) {
        try {
          await this.prisma.memory.update({
            where: { id },
            data: updateData
          });
          this.logger.log(`[update] Memory fields updated successfully`);
        } catch (error) {
          this.logger.error(`[update] Failed to update memory fields: ${String(error)}`, error instanceof Error ? error.stack : undefined);
          throw error;
        }
      }
      
      // Генерация embedding выполняется асинхронно в фоне (не блокирует ответ)
      if (needsEmbeddingUpdate) {
        // Запускаем обновление embedding в фоне без ожидания
        // Используем оригинальный текст (не зашифрованный) для embedding
        const titleForEmbedding = data.title !== undefined ? (data.title || '') : existingTitle;
        const contentForEmbedding = data.content !== undefined ? (data.content || '') : existingContent;
        this.updateEmbeddingAsync(id, titleForEmbedding, contentForEmbedding)
          .catch(error => {
            this.logger.error(`[update] Background embedding update failed: ${String(error)}`);
          });
      }

      // Возвращаем обновленную заметку
      const updated = await this.prisma.memory.findUnique({
        where: { id },
        include: { folder: true }
      });

      if (!updated) throw new Error("Failed to retrieve updated memory");

      this.logger.log(`[update] Memory updated successfully: id=${id}`);
      
      // Автоматически расшифровываем при чтении
      const decryptedTitle = this.encryption.isEncrypted(updated.title) ? this.encryption.decrypt(updated.title) : updated.title;
      const decryptedContent = updated.content && this.encryption.isEncrypted(updated.content) ? this.encryption.decrypt(updated.content) : updated.content;
      
      return {
        id: updated.id.toString(),
        title: decryptedTitle || '',
        content: decryptedContent || '',
        folder: updated.folder?.name || '',
        created_at: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : new Date(updated.createdAt).toISOString()
      };
    } catch (error) {
      this.logger.error(`[update] Error updating memory: ${String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  private async updateEmbeddingAsync(id: bigint, title: string, content: string) {
    // Выполняется асинхронно в фоне, не блокирует основной поток
    // Используем оригинальный текст для embedding (не зашифрованный)
    // Если title пустой, используем только content для embedding
    const textToEmbed = title ? [title, content].join("\n").trim() : content.trim();
    
    if (textToEmbed.length === 0) {
      this.logger.warn(`[updateEmbeddingAsync] Skipping embedding update: empty text for memory id=${id}`);
      return;
    }
    
    try {
      this.logger.log(`[updateEmbeddingAsync] Starting embedding generation for memory id=${id}`);
      const embedding = await this.llm.embed(textToEmbed);
      const embeddingStr = `[${embedding.join(",")}]`;
      
      await this.prisma.$executeRawUnsafe(
        `UPDATE "Memory" SET embedding = $1::vector WHERE id = $2::bigint`,
        embeddingStr,
        id.toString()
      );
      this.logger.log(`[updateEmbeddingAsync] Embedding updated successfully for memory id=${id}`);
    } catch (error) {
      this.logger.error(`[updateEmbeddingAsync] Failed to update embedding: ${String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  private async ensureFolder(userId: bigint, name: string) {
    const existing = await this.prisma.folder.findFirst({ where: { userId, name } });
    if (existing) return existing;
    return this.prisma.folder.create({ data: { userId, name } });
  }
}

