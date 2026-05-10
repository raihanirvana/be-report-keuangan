import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { CategoryType } from '../category-type.enum';

export class FindCategoriesQueryDto {
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  includeArchived?: boolean;
}
