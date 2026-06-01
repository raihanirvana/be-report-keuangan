import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePeriodDto {
  @IsISO8601({ strict: true })
  endDate!: string;

  @IsString()
  @MaxLength(80)
  @IsOptional()
  name?: string;

  @IsISO8601({ strict: true })
  startDate!: string;
}
