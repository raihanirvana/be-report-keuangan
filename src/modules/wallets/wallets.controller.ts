import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { envelope } from '../../common/response-envelope';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
@UseGuards(AccessTokenGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return envelope(await this.walletsService.findAll(user.sub));
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateWalletDto) {
    return envelope(await this.walletsService.create(user.sub, body));
  }

  @Patch(':walletId')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('walletId') walletId: string,
    @Body() body: UpdateWalletDto,
  ) {
    return envelope(await this.walletsService.update(user.sub, walletId, body));
  }

  @Delete(':walletId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @CurrentUser() user: JwtPayload,
    @Param('walletId') walletId: string,
  ) {
    await this.walletsService.archive(user.sub, walletId);
  }
}
