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
import { BudgetsService } from './budgets.service';
import { CopyPreviousMonthDto } from './dto/copy-previous-month.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { FindBudgetsQueryDto } from './dto/find-budgets-query.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
@UseGuards(AccessTokenGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: FindBudgetsQueryDto,
  ) {
    const result = await this.budgetsService.findAll(user.sub, query);

    return envelope(result, { month: query.month });
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreateBudgetDto) {
    return envelope(await this.budgetsService.create(user.sub, body));
  }

  @Post('copy-previous-month')
  async copyPreviousMonth(
    @CurrentUser() user: JwtPayload,
    @Body() body: CopyPreviousMonthDto,
  ) {
    return envelope(
      await this.budgetsService.copyPreviousMonth(user.sub, body),
      {
        sourceMonth: body.sourceMonth,
        targetMonth: body.targetMonth,
      },
    );
  }

  @Patch(':budgetId')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('budgetId') budgetId: string,
    @Body() body: UpdateBudgetDto,
  ) {
    return envelope(await this.budgetsService.update(user.sub, budgetId, body));
  }

  @Delete(':budgetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('budgetId') budgetId: string,
    @Query() query: FindBudgetsQueryDto,
  ) {
    await this.budgetsService.remove(user.sub, budgetId, query.month);
  }
}
