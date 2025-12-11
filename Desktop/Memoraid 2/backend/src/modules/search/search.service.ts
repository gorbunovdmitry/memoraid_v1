import { Injectable, Logger } from "@nestjs/common";
import { MemoryService } from "../memory/memory.service";
import { CalendarService } from "../calendar/calendar.service";

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly memoryService: MemoryService,
    private readonly calendarService: CalendarService
  ) {}

  async search(params: { userId: bigint; q: string }) {
    try {
      this.logger.log(`[search] Searching for: "${params.q}"`);
      
      // Параллельно ищем воспоминания и события
      const [memoriesResult, eventsResult] = await Promise.all([
        this.memoryService.search({ userId: params.userId, q: params.q }),
        this.calendarService.search({ userId: params.userId, q: params.q, limit: 5 })
      ]);

      // Форматируем результаты для фронтенда
      const memories = (memoriesResult.items || []).slice(0, 5).map((m: any) => ({
        id: m.id,
        type: 'memory' as const,
        title: m.title,
        snippet: m.snippet || m.content?.slice(0, 100) || '',
        folder: m.folder,
        createdAt: m.created_at
      }));

      const events = (eventsResult.items || []).map((e: any) => ({
        id: e.id,
        type: 'event' as const,
        title: e.title,
        snippet: e.description || '',
        startsAt: e.startsAt,
        createdAt: e.createdAt
      }));

      const total = memories.length + events.length;
      
      this.logger.log(`[search] Found ${memories.length} memories and ${events.length} events`);

      return {
        memories,
        events,
        total
      };
    } catch (error: any) {
      this.logger.error(`[search] Error searching: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      return { memories: [], events: [], total: 0 };
    }
  }
}

