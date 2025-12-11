import { Injectable, Logger } from "@nestjs/common";
import { MemoryService } from "../memory/memory.service";
import { CalendarService } from "../calendar/calendar.service";
import { AdviceService } from "../advice/advice.service";
import { AudioService } from "../audio/audio.service";
import { ChatService } from "../chat/chat.service";
import * as chrono from "chrono-node";
import { LlmService } from "../../common/llm.service";

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly memoryService: MemoryService,
    private readonly calendarService: CalendarService,
    private readonly adviceService: AdviceService,
    private readonly audioService: AudioService,
    private readonly chatService: ChatService,
    private readonly llm: LlmService
  ) {}

  async route(body: { userId?: bigint; text?: string; audio_id?: string; chatId?: string }) {
    try {
      if (!body.userId) {
        this.logger.error(`[route] userId is missing in request body`);
        throw new Error("userId required");
      }

      if (body.audio_id) {
        return this.audioService.get(body.userId, body.audio_id);
      }

      const text = body.text || "";
      this.logger.log(`[route] Processing text: "${text}", chatId=${body.chatId || "none"}`);
      
      // Получаем или создаем чат
      let chatId: bigint | undefined;
      let isNewChat = false;
      let isFirstMessage = false;
      
      if (body.chatId) {
        chatId = BigInt(body.chatId);
        // Проверяем, является ли это первым сообщением в чате
        const messages = await this.chatService.getMessages(chatId, body.userId);
        isFirstMessage = messages.length === 0;
        this.logger.log(`[route] Using existing chat id=${chatId}, messages count=${messages.length}, isFirstMessage=${isFirstMessage}`);
      } else {
        // Создаем новый чат, если не указан
        const newChat = await this.chatService.create(body.userId);
        chatId = BigInt(newChat.id);
        isNewChat = true;
        isFirstMessage = true;
        this.logger.log(`[route] Created new chat id=${chatId}, will generate title after processing`);
      }
      
      // Сохраняем сообщение пользователя в чат
      if (chatId) {
        await this.chatService.addMessage(chatId, body.userId, "user", text);
      }
      
      const classification = await this.llm.classify(text);
      this.logger.log(`[route] Classification: kind=${classification.kind}, folder=${classification.kind === "memory" ? classification.folder || "undefined" : "N/A"}`);

      let response: any;
      
      if (classification.kind === "calendar") {
        try {
          this.logger.log(`[route] Parsing date from text: "${text}"`);
          const parsed = chrono.ru.parseDate(text, new Date());
          
          if (!parsed) {
            this.logger.warn(`[route] Could not parse date from text: "${text}", using current time + 1 hour`);
            // Если не удалось распарсить дату, используем текущее время + 1 час как fallback
            const fallbackDate = new Date();
            fallbackDate.setHours(fallbackDate.getHours() + 1);
            const starts_at = fallbackDate.toISOString();
            this.logger.log(`[route] Using fallback date: starts_at="${starts_at}"`);
            
            // Извлекаем название события даже для fallback даты
            const title = await this.llm.extractEventTitle(text);
            this.logger.log(`[route] Extracted event title (fallback date): "${title}"`);
            
            response = await this.calendarService.create({
              userId: body.userId,
              title: title,
              starts_at
            });
          } else {
            const starts_at = parsed.toISOString();
            this.logger.log(`[route] Parsed date successfully: starts_at="${starts_at}"`);
            
            // Извлекаем название события (убираем слова-триггеры и временные маркеры)
            const title = await this.llm.extractEventTitle(text);
            this.logger.log(`[route] Extracted event title: "${title}"`);
            
            response = await this.calendarService.create({
              userId: body.userId,
              title: title,
              starts_at
            });
          }
        } catch (calendarError) {
          this.logger.error(`[route] Error creating calendar event: ${calendarError instanceof Error ? calendarError.message : String(calendarError)}`, calendarError instanceof Error ? calendarError.stack : undefined);
          throw calendarError;
        }
      } else if (classification.kind === "advice") {
        response = await this.adviceService.advise(body.userId, text);
      }

      else if (classification.kind === "audio") {
        response = { note: "audio flow", audio_id: body.audio_id };
      } else {
        // memory
        let folder = classification.kind === "memory" && classification.folder 
          ? classification.folder 
          : undefined;
        
        // Если папка не определена, пытаемся определить через fallback классификацию
        if (!folder) {
          const fallback = this.llm.fallbackClassify(text);
          if (fallback.kind === "memory" && fallback.folder) {
            folder = fallback.folder;
          } else {
            // Если все еще не определена, используем "Хобби и проекты" как более универсальный подраздел
            folder = "Хобби и проекты";
          }
        }
        
        // Валидация: проверяем, что подраздел существует в списке доступных
        const validSubcategories = [
          "Проекты и задачи", "Коллеги", "Контакты и нетворк", "Идеи и инсайты", "Расшифровки встреч",
          "Спорт и активность", "Визиты к врачам", "Анализы", "Лекарства", "Питание", "Сон", "Привычки",
          "Семья", "Друзья", "Коллеги и партнеры", "Новые знакомства", "Дни рождения и важные даты",
          "Домашние дела", "Покупки для дома", "Ремонт и обслуживание",
          "Курсы и программы", "Книги и конспекты", "Навыки", "Домашка и упражнения", "Планы развития", "Записи лекций и уроков",
          "Хобби и проекты", "Книги", "Фильмы и сериалы", "Музыка и подкасты", "Игры", "Творчество",
          "Места", "Поездки", "Мероприятия",
          "Ветеринары", "Прививки и лечение", "Корм и вкусняшки", "Особенности поведения",
          "Рецепты и любимые блюда", "Рестораны и кафе",
          "Паспорт, визы", "Договоры", "Полисы и страховки", "Гарантии на технику",
          "Обслуживание и ТО", "Страховки", "Пробег и расходы"
        ];
        
        if (folder && !validSubcategories.includes(folder)) {
          this.logger.warn(`[route] Invalid subcategory "${folder}", using fallback`);
          const fallback = this.llm.fallbackClassify(text);
          folder = (fallback.kind === "memory" && fallback.folder) ? fallback.folder : "Хобби и проекты";
        }
        
        this.logger.log(`[route] Creating memory in subcategory: "${folder}"`);
        
        response = await this.memoryService.create({
          userId: body.userId,
          folder,
          title: text.slice(0, 32) || "Заметка",
          content: text
        });
      }
      
      // Форматируем ответ для сохранения в чат
      let responseText = "";
      if (typeof response === "string") {
        responseText = response;
      } else if (response.answer) {
        responseText = response.answer;
      } else if (response.message) {
        responseText = response.message;
      } else if (response.id && response.folder) {
        // Используем content вместо title, чтобы показать полный текст (title обрезается до 32 символов)
        const displayText = (response as any).content || response.title || "Заметка";
        responseText = `✅ Сохранено в папку "${response.folder}": ${displayText}`;
      } else if (response.title && response.starts_at) {
        const date = new Date(response.starts_at).toLocaleString("ru-RU");
        responseText = `📅 Событие создано: "${response.title}" на ${date}`;
      } else {
        responseText = JSON.stringify(response, null, 2);
      }
      
      // Сохраняем ответ ассистента в чат
      if (chatId) {
        await this.chatService.addMessage(chatId, body.userId, "assistant", responseText, { classification: classification.kind });
        this.logger.log(`[route] Saved assistant message to chat id=${chatId}`);
        
        // Если это первое сообщение в чате (новый или существующий без сообщений), генерируем название
        if (isFirstMessage) {
          try {
            this.logger.log(`[route] Generating title for new chat id=${chatId} based on: "${text}"`);
            const chatTitle = await this.chatService.generateChatTitle(text);
            this.logger.log(`[route] Generated title: "${chatTitle}"`);
            await this.chatService.updateTitle(chatId, body.userId, chatTitle);
            this.logger.log(`[route] Successfully updated chat title to: "${chatTitle}"`);
          } catch (titleError) {
            this.logger.error(`[route] Error generating/updating chat title: ${titleError instanceof Error ? titleError.message : String(titleError)}`);
            // Продолжаем выполнение даже если генерация названия не удалась
          }
        }
      }
      
      return { ...response, chatId: chatId?.toString() };
    } catch (error) {
      this.logger.error(`[route] Error processing request: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}

