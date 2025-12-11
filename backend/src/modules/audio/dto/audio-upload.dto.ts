import { IsNumber, IsOptional, IsString } from "class-validator";

export class AudioUploadDto {
  @IsOptional()
  @IsString()
  upload_url?: string;

  @IsOptional()
  @IsNumber()
  duration_sec?: number;

  @IsOptional()
  @IsNumber()
  size_bytes?: number;
}

