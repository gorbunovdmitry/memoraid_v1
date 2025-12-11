import { IsOptional, IsString, IsBoolean, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class NotificationsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  tz?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsDto)
  notifications?: NotificationsDto;
}

