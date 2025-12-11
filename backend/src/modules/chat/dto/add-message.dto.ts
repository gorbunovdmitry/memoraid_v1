import { IsEnum, IsString, IsOptional } from "class-validator";

export class AddMessageDto {
  @IsEnum(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  text!: string;

  @IsOptional()
  metadata?: any;
}

