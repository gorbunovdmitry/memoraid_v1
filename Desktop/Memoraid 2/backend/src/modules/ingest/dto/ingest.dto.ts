import { IsOptional, IsString } from "class-validator";

export class IngestDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  audio_id?: string;

  @IsOptional()
  @IsString()
  initData?: string;

  @IsOptional()
  @IsString()
  chatId?: string;
}

