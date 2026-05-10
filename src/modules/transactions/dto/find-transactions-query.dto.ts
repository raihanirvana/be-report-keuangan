import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

import { TransactionType } from '../transaction-type.enum';

export class FindTransactionsQueryDto {
  @Matches(/^\d{4}-\d{2}$/)
  @IsOptional()
  month?: string;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsMongoId()
  @IsOptional()
  walletId?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
