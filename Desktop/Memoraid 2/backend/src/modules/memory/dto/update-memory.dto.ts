import { IsOptional, IsString } from "class-validator";

export class UpdateMemoryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  folder?: string;
}

