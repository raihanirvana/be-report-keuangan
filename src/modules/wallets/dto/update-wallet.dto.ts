import { IsHexColor, IsOptional, IsString, MinLength } from 'class-validator';

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
}
