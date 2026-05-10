import { IsOptional, Matches } from 'class-validator';

export class DashboardSummaryQueryDto {
  @Matches(/^\d{4}-\d{2}$/)
  @IsOptional()
  month?: string;

  @IsOptional()
  walletId?: string;
}
