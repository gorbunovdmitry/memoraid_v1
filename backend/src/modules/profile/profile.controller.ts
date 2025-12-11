import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import { ReqUserId } from "../../common/request-user.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  get(@ReqUserId() userId: bigint) {
    return this.profileService.get(userId);
  }

  @Patch()
  update(
    @ReqUserId() userId: bigint,
    @Body() body: UpdateProfileDto
  ) {
    return this.profileService.update(userId, body);
  }
}

