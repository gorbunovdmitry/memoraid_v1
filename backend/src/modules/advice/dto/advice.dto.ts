import { IsNotEmpty, IsString } from "class-validator";

export class AdviceDto {
  @IsString()
  @IsNotEmpty()
  query!: string;
}

