import { Body, Controller, Post } from "@nestjs/common";
import { AdviceService } from "./advice.service";
import { ReqUserId } from "../../common/request-user.decorator";
import { AdviceDto } from "./dto/advice.dto";

@Controller("advice")
export class AdviceController {
  constructor(private readonly adviceService: AdviceService) {}

  @Post()
  async advise(@ReqUserId() userId: bigint, @Body() body: AdviceDto) {
    return this.adviceService.advise(userId, body.query);
  }
}

