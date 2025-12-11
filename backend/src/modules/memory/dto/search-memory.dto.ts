import { IsOptional, IsString } from "class-validator";

export class SearchMemoryDto {
  @IsOptional()
  @IsString()
  folder?: string;

  @IsOptional()
  @IsString()
  q?: string;
}

