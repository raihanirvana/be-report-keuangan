import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsHexColor,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { BudgetPeriod } from '../budget-period.enum';

class CreateBudgetCategoryDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  icon!: string;

  @IsHexColor()
  color!: string;
}

export class CreateBudgetDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsMongoId()
  @IsOptional()
  categoryId?: string;

  @ValidateNested()
  @Type(() => CreateBudgetCategoryDto)
  @IsOptional()
  category?: CreateBudgetCategoryDto;

  @IsEnum(BudgetPeriod)
  period!: BudgetPeriod;

  @IsInt()
  @Min(1)
  limitAmount!: number;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}
