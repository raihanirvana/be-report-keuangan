import { IsEnum, IsHexColor, IsString, MinLength } from 'class-validator';

import { CategoryType } from '../category-type.enum';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;

  @IsString()
  @MinLength(2)
  icon!: string;

  @IsHexColor()
  color!: string;
}
