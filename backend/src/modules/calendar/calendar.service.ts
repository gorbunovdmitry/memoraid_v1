import { Injectable, Logger, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(body: {
    userId?: bigint;
    title: string;
    description?: string;
    starts_at: string;
    ends_at?: string;
    tz?: string;
  }) {
    try {
      if (!body.userId) {
        throw new Error("userId is required");
      }
      
      const userId = body.userId;
      this.logger.log(`[create] Creating event for userId=${userId}, title="${body.title}", starts_at="${body.starts_at}"`);
      
      // Валидация и парсинг даты
      const startsAtDate = new Date(body.starts_at);
      if (isNaN(startsAtDate.getTime())) {
        this.logger.error(`[create] Invalid starts_at date: "${body.starts_at}"`);
        throw new Error(`Invalid date format: ${body.starts_at}`);
      }
      
      let endsAtDate: Date | null = null;
      if (body.ends_at) {
        endsAtDate = new Date(body.ends_at);
        if (isNaN(endsAtDate.getTime())) {
          this.logger.error(`[create] Invalid ends_at date: "${body.ends_at}"`);
          throw new Error(`Invalid date format: ${body.ends_at}`);
        }
      }
      
      this.logger.log(`[create] Parsed dates - startsAt: ${startsAtDate.toISOString()}, endsAt: ${endsAtDate?.toISOString() || 'null'}`);
      this.logger.log(`[create] userId type: ${typeof userId}, value: ${userId.toString()}`);
      
      // Проверка на дубли: ищем события с таким же title и startsAt
      const existingEvent = await this.prisma.event.findFirst({
        where: {
          userId: BigInt(userId.toString()),
          title: body.title,
          startsAt: startsAtDate
        }
      });
      
      if (existingEvent) {
        this.logger.log(`[create] Duplicate event found: id=${existingEvent.id}, title="${body.title}", startsAt=${startsAtDate.toISOString()}`);
        const formattedDate = startsAtDate.toLocaleString("ru-RU", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
        throw new ConflictException(`Событие "${body.title}" на ${formattedDate} уже существует`);
      }
      
      try {
        const created = await this.prisma.event.create({
          data: {
            userId: BigInt(userId.toString()), // Убеждаемся, что это BigInt
            title: body.title,
            description: body.description,
            startsAt: startsAtDate,
            endsAt: endsAtDate,
            tz: body.tz ?? "Europe/Moscow"
          }
        });
        
        this.logger.log(`[create] Event created successfully: id=${created.id}`);
        return { 
          id: created.id.toString(), 
          title: body.title,
          description: body.description,
          starts_at: body.starts_at,
          ends_at: body.ends_at || null,
          tz: body.tz || "Europe/Moscow",
          created_at: created.createdAt.toISOString()
        };
      } catch (prismaError: any) {
        this.logger.error(`[create] Prisma error: ${prismaError.message}`, prismaError.stack);
        this.logger.error(`[create] Prisma error code: ${prismaError.code}`);
        this.logger.error(`[create] Prisma error meta: ${JSON.stringify(prismaError.meta)}`);
        throw prismaError;
      }
      
    } catch (error: any) {
      this.logger.error(`[create] Error creating event: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      if (error.code) {
        this.logger.error(`[create] Error code: ${error.code}`);
      }
      if (error.meta) {
        this.logger.error(`[create] Error meta: ${JSON.stringify(error.meta)}`);
      }
      throw error;
    }
  }

  async list(params: { userId: bigint; from?: string; to?: string }) {
    try {
      this.logger.log(`[list] Fetching events for userId=${params.userId}, from=${params.from}, to=${params.to}`);
      
      const where: any = { userId: params.userId };
      if (params.from) where.startsAt = { gte: new Date(params.from) };
      if (params.to) {
        where.startsAt = where.startsAt
          ? { ...where.startsAt, lte: new Date(params.to) }
          : { lte: new Date(params.to) };
      }
      
      const items = await this.prisma.event.findMany({
        where,
        orderBy: { startsAt: "asc" },
        take: 50
      });
      
      this.logger.log(`[list] Found ${items.length} events`);
      
      // Фильтруем дубли: оставляем только одно событие для каждой комбинации (title, startsAt)
      const uniqueEvents = new Map<string, typeof items[0]>();
      for (const event of items) {
        const key = `${event.title}|${event.startsAt.toISOString()}`;
        if (!uniqueEvents.has(key)) {
          uniqueEvents.set(key, event);
        }
      }
      
      const deduplicatedItems = Array.from(uniqueEvents.values());
      this.logger.log(`[list] After deduplication: ${deduplicatedItems.length} unique events`);
      
      // Преобразуем BigInt в строки и форматируем даты
      const formattedItems = deduplicatedItems.map(event => ({
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt ? event.endsAt.toISOString() : null,
        tz: event.tz || "Europe/Moscow",
        createdAt: event.createdAt.toISOString()
      }));
      
      return { items: formattedItems };
    } catch (error: any) {
      this.logger.error(`[list] Error fetching events: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async search(params: { userId: bigint; q: string; limit?: number }) {
    try {
      const searchQuery = params.q.trim();
      if (!searchQuery || searchQuery.length === 0) {
        return { items: [], total: 0 };
      }

      this.logger.log(`[search] Searching events for userId=${params.userId}, query="${searchQuery}"`);
      
      const limit = params.limit || 10;
      
      // Простой текстовый поиск по title и description
      // Используем ILIKE через raw query для case-insensitive поиска в PostgreSQL
      const searchLower = searchQuery.toLowerCase();
      const items = await this.prisma.$queryRawUnsafe<Array<{
        id: bigint;
        userId: bigint;
        title: string;
        description: string | null;
        startsAt: Date;
        endsAt: Date | null;
        tz: string | null;
        createdAt: Date;
      }>>(
        `SELECT * FROM "Event" 
         WHERE "userId" = $1::bigint 
         AND (
           LOWER(title) LIKE $2 
           OR (description IS NOT NULL AND LOWER(description) LIKE $2)
         )
         ORDER BY "startsAt" DESC
         LIMIT $3`,
        params.userId.toString(),
        `%${searchLower}%`,
        limit.toString()
      );
      
      this.logger.log(`[search] Found ${items.length} events matching "${searchQuery}"`);
      
      // Преобразуем BigInt в строки и форматируем даты
      const formattedItems = items.map((event: any) => ({
        id: event.id.toString(),
        title: event.title,
        description: event.description || null,
        startsAt: event.startsAt instanceof Date ? event.startsAt.toISOString() : new Date(event.startsAt).toISOString(),
        endsAt: event.endsAt ? (event.endsAt instanceof Date ? event.endsAt.toISOString() : new Date(event.endsAt).toISOString()) : null,
        tz: event.tz || "Europe/Moscow",
        createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : new Date(event.createdAt).toISOString()
      }));
      
      return { items: formattedItems, total: formattedItems.length };
    } catch (error: any) {
      this.logger.error(`[search] Error searching events: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}

