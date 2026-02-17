import { IsString, IsNumber, IsOptional, IsEnum, IsArray, IsDateString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SplitType } from '@prisma/client';

class TimeSplitConfigDto {
  @IsNumber()
  @Min(1)
  days: number;

  @IsDateString()
  startDate: string;
}

class CountSplitConfigDto {
  @IsNumber()
  @Min(1)
  totalCount: number;
}

export class CreateExpenseDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsDateString()
  expenseDate: string;

  @IsEnum(SplitType)
  @IsOptional()
  splitType?: SplitType;

  @IsOptional()
  splitConfig?: TimeSplitConfigDto | CountSplitConfigDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}
