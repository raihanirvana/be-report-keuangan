import { IsInt, IsMongoId, IsOptional, Matches, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsMongoId()
  categoryId!: string;

  @IsInt()
  @Min(1)
  limitAmount!: number;

  @Matches(/^\d{4}-\d{2}$/)
  @IsOptional()
  month?: string;

  @IsMongoId()
  @IsOptional()
  periodId?: string;
}
