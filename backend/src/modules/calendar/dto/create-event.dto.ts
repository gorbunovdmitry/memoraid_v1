import { IsISO8601, IsOptional, IsString } from "class-validator";

export class CreateEventDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  starts_at!: string;

  @IsOptional()
  @IsISO8601()
  ends_at?: string;

  @IsOptional()
  @IsString()
  tz?: string;
}

