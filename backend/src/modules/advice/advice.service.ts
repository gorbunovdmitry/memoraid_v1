import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { LlmService } from "../../common/llm.service";
import { MemoryService } from "../memory/memory.service";

@Injectable()
export class AdviceService {
  private readonly logger = new Logger(AdviceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly memoryService: MemoryService
  ) {}

  async advise(userId: bigint, query: string) {
    try {
      this.logger.log(`[advise] Generating advice for userId=${userId}, query="${query}"`);
      
      // Получаем релевантные воспоминания через semantic search
      let searchResults;
      try {
        searchResults = await this.memoryService.search({
          userId,
          q: query
        });
        this.logger.log(`[advise] Found ${searchResults.items.length} relevant memories`);
        if (searchResults.items.length > 0) {
          this.logger.log(`[advise] Top memories: ${JSON.stringify(searchResults.items.slice(0, 3).map(i => ({ title: i.title, folder: i.folder })))}`);
        }
      } catch (searchError) {
        this.logger.warn(`[advise] Search failed: ${String(searchError)}, continuing without context`);
        searchResults = { items: [], total: 0 };
      }
      
      // Если semantic search не нашел результатов, пробуем получить последние воспоминания
      if (searchResults.items.length === 0) {
        this.logger.log(`[advise] No semantic matches, trying to get recent memories`);
        try {
          const recentMemories = await this.memoryService.search({
            userId
          });
          searchResults = recentMemories;
          this.logger.log(`[advise] Found ${searchResults.items.length} recent memories`);
        } catch (recentError) {
          this.logger.warn(`[advise] Failed to get recent memories: ${String(recentError)}`);
        }
      }
      
      // Формируем контекст из воспоминаний (берем топ-5)
      const context = searchResults.items.slice(0, 5).map(item => ({
        title: item.title,
        content: item.snippet || item.title,
        folder: item.folder
      }));
      
      this.logger.log(`[advise] Using context: ${JSON.stringify(context.map(c => ({ title: c.title, folder: c.folder })))}`);
      
      const used_context = context.map(c => `${c.folder ? `[${c.folder}] ` : ""}${c.title}: ${c.content}`);
      
      // Генерируем совет через LLM с контекстом
      let answer: string;
      try {
        answer = await this.llm.generateAdvice(query, context);
        this.logger.log(`[advise] Generated advice: ${answer.substring(0, 100)}...`);
      } catch (llmError) {
        this.logger.error(`[advise] LLM generation failed: ${String(llmError)}`);
        answer = "Извините, не могу дать совет в данный момент. Попробуйте позже.";
      }
      
      // Сохраняем в лог
      try {
        await this.prisma.adviceLog.create({
          data: { userId, query, answer }
        });
      } catch (logError) {
        this.logger.warn(`[advise] Failed to save log: ${String(logError)}`);
      }
      
      return { answer, used_context, query };
    } catch (error) {
      this.logger.error(`[advise] Unexpected error: ${String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}

