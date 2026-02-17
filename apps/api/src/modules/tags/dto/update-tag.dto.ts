import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateTagDto {
  @IsString()
  @Length(1, 50)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;
}
