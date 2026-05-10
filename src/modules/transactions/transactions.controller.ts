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
  Query,
  UseGuards,
} from '@nestjs/common';

import { envelope } from '../../common/response-envelope';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FindTransactionsQueryDto } from './dto/find-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(AccessTokenGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindTransactionsQueryDto,
  ) {
    const result = await this.transactionsService.findAll(user.sub, query);

    return envelope(result.items, result.meta);
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateTransactionDto,
  ) {
    return envelope(await this.transactionsService.create(user.sub, body));
  }

  @Patch(':transactionId')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('transactionId') transactionId: string,
    @Body() body: UpdateTransactionDto,
  ) {
    return envelope(
      await this.transactionsService.update(user.sub, transactionId, body),
    );
  }

  @Delete(':transactionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('transactionId') transactionId: string,
  ) {
    await this.transactionsService.remove(user.sub, transactionId);
  }
}
