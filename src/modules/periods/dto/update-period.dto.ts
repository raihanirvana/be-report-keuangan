import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePeriodDto {
  @IsISO8601({ strict: true })
  @IsOptional()
  endDate?: string;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  name?: string;

  @IsISO8601({ strict: true })
  @IsOptional()
  startDate?: string;
}
