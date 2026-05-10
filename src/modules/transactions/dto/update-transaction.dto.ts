import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

import { TransactionType } from '../transaction-type.enum';

export class UpdateTransactionDto {
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsString()
  @MinLength(2)
  @IsOptional()
  title?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  amount?: number;

  @IsMongoId()
  @IsOptional()
  walletId?: string;

  @IsMongoId()
  @IsOptional()
  categoryId?: string;

  @IsMongoId()
  @IsOptional()
  fromWalletId?: string;

  @IsMongoId()
  @IsOptional()
  toWalletId?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsDateString()
  @IsOptional()
  occurredAt?: string;
}
