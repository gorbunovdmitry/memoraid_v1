import { IsNotEmpty, IsString } from "class-validator";

export class CreateMemoryDto {
  @IsString()
  @IsNotEmpty()
  folder!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

