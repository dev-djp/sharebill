import { IsString, IsOptional, Length } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;
}
