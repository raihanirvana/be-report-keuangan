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

export class CreateWalletDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(WalletType)
  type!: WalletType;

  @IsString()
  @MinLength(2)
  icon!: string;

  @IsHexColor()
  color!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  initialBalance?: number;
}
