import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class RecordCountSplitDto {
  @IsNumber()
  @Min(1)
  count: number;

  @IsString()
  @IsOptional()
  note?: string;
}
