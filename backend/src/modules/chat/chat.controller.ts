import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ReqUserId } from "../../common/request-user.decorator";
import { CreateChatDto } from "./dto/create-chat.dto";
import { AddMessageDto } from "./dto/add-message.dto";

@Controller("chats")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async create(@ReqUserId() userId: bigint, @Body() body?: CreateChatDto) {
    return this.chatService.create(userId, body?.title);
  }

  @Get()
  async list(@ReqUserId() userId: bigint) {
    return { items: await this.chatService.list(userId) };
  }

  @Get(":id/messages")
  async getMessages(@ReqUserId() userId: bigint, @Param("id") chatId: string) {
    return { items: await this.chatService.getMessages(BigInt(chatId), userId) };
  }

  @Post(":id/messages")
  async addMessage(
    @ReqUserId() userId: bigint,
    @Param("id") chatId: string,
    @Body() body: AddMessageDto
  ) {
    return this.chatService.addMessage(BigInt(chatId), userId, body.role, body.text, body.metadata);
  }
}

