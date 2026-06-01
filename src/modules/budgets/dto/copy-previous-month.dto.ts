import { IsMongoId, IsOptional, Matches } from 'class-validator';

export class CopyPreviousMonthDto {
  @Matches(/^\d{4}-\d{2}$/)
  @IsOptional()
  sourceMonth!: string;

  @Matches(/^\d{4}-\d{2}$/)
  @IsOptional()
  targetMonth!: string;

  @IsMongoId()
  @IsOptional()
  sourcePeriodId?: string;

  @IsMongoId()
  @IsOptional()
  targetPeriodId?: string;
}
