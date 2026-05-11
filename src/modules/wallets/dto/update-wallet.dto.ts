import {
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

import { WalletType } from '../wallet-type.enum';

export class UpdateWalletDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  icon?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsEnum(WalletType)
  @IsOptional()
  type?: WalletType;

  @IsInt()
  @Min(0)
  @IsOptional()
  balance?: number;
}
