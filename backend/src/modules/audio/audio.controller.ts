import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AudioService } from "./audio.service";
import { ReqUserId } from "../../common/request-user.decorator";
import { AudioUploadDto } from "./dto/audio-upload.dto";

@Controller("audio")
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post()
  upload(
    @ReqUserId() userId: bigint,
    @Body() body: AudioUploadDto
  ) {
    return this.audioService.enqueue(userId, body);
  }

  @Get(":id")
  getById(@ReqUserId() userId: bigint, @Param("id") id: string) {
    return this.audioService.get(userId, id);
  }
}

