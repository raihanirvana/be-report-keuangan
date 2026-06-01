import { IsInt, IsMongoId, IsOptional, Matches, Min } from 'class-validator';

export class UpdateBudgetDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  limitAmount?: number;

  @Matches(/^\d{4}-\d{2}$/)
  @IsOptional()
  month?: string;

  @IsMongoId()
  @IsOptional()
  periodId?: string;
}
