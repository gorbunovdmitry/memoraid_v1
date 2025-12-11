import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { LlmService } from "../../common/llm.service";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService
  ) {}

  async create(userId: bigint, title?: string): Promise<{ id: string; title: string; createdAt: string }> {
    try {
      const chatTitle = title || "Новый чат";
      const chat = await this.prisma.chat.create({
        data: {
          userId,
          title: chatTitle
        }
      });

      this.logger.log(`[create] Created chat id=${chat.id} for userId=${userId}`);
      return {
        id: chat.id.toString(),
        title: chat.title,
        createdAt: chat.createdAt.toISOString()
      };
    } catch (error) {
      this.logger.error(`[create] Error creating chat: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async list(userId: bigint): Promise<Array<{ id: string; title: string; updatedAt: string }>> {
    try {
      const chats = await this.prisma.chat.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 50
      });

      return chats.map(chat => ({
        id: chat.id.toString(),
        title: chat.title,
        updatedAt: chat.updatedAt.toISOString()
      }));
    } catch (error) {
      this.logger.error(`[list] Error listing chats: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getMessages(chatId: bigint, userId: bigint): Promise<Array<{ id: string; role: string; text: string; createdAt: string }>> {
    try {
      // Проверяем, что чат принадлежит пользователю
      const chat = await this.prisma.chat.findFirst({
        where: { id: chatId, userId }
      });

      if (!chat) {
        throw new Error("Chat not found or access denied");
      }

      const messages = await this.prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" }
      });

      return messages.map(msg => ({
        id: msg.id.toString(),
        role: msg.role,
        text: msg.text,
        createdAt: msg.createdAt.toISOString()
      }));
    } catch (error) {
      this.logger.error(`[getMessages] Error getting messages: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async addMessage(chatId: bigint, userId: bigint, role: "user" | "assistant", text: string, metadata?: any): Promise<{ id: string }> {
    try {
      // Проверяем, что чат принадлежит пользователю
      const chat = await this.prisma.chat.findFirst({
        where: { id: chatId, userId }
      });

      if (!chat) {
        throw new Error("Chat not found or access denied");
      }

      const message = await this.prisma.message.create({
        data: {
          chatId,
          role,
          text,
          metadata: metadata || null
        }
      });

      // Обновляем updatedAt чата
      await this.prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() }
      });

      this.logger.log(`[addMessage] Added message id=${message.id} to chat id=${chatId}`);
      return { id: message.id.toString() };
    } catch (error) {
      this.logger.error(`[addMessage] Error adding message: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async generateChatTitle(firstMessage: string): Promise<string> {
    this.logger.log(`[generateChatTitle] Starting title generation for: "${firstMessage}"`);
    try {
      const title = await this.llm.generateChatTitle(firstMessage);
      this.logger.log(`[generateChatTitle] Successfully generated title: "${title}"`);
      return title;
    } catch (error) {
      this.logger.error(`[generateChatTitle] Error generating title: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      // Fallback: используем первые 50 символов первого сообщения
      const fallbackTitle = firstMessage.slice(0, 50).trim() || "Новый чат";
      this.logger.warn(`[generateChatTitle] Using fallback title: "${fallbackTitle}"`);
      return fallbackTitle;
    }
  }

  async updateTitle(chatId: bigint, userId: bigint, title: string): Promise<void> {
    try {
      // Проверяем, что чат принадлежит пользователю
      const chat = await this.prisma.chat.findFirst({
        where: { id: chatId, userId }
      });

      if (!chat) {
        throw new Error("Chat not found or access denied");
      }

      await this.prisma.chat.update({
        where: { id: chatId },
        data: { title }
      });

      this.logger.log(`[updateTitle] Updated chat id=${chatId} title to: "${title}"`);
    } catch (error) {
      this.logger.error(`[updateTitle] Error updating chat title: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

