import { Matches } from 'class-validator';

export class CopyPreviousMonthDto {
  @Matches(/^\d{4}-\d{2}$/)
  sourceMonth!: string;

  @Matches(/^\d{4}-\d{2}$/)
  targetMonth!: string;
}
