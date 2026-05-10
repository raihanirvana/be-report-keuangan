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

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsInt()
  @Min(1)
  amount!: number;

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
