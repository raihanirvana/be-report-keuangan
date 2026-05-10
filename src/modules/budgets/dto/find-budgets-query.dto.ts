import { IsOptional, Matches } from 'class-validator';

export class FindBudgetsQueryDto {
  @Matches(/^\d{4}-\d{2}$/)
  @IsOptional()
  month?: string;
}
