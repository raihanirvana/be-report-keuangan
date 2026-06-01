import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { envelope } from '../../common/response-envelope';
import { AccessTokenGuard } from '../auth/access-token.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';

@Controller('dashboard')
@UseGuards(AccessTokenGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(
    @CurrentUser() user: JwtPayload,
    @Query() query: DashboardSummaryQueryDto,
  ) {
    return envelope(await this.dashboardService.getSummary(user.sub, query), {
      month: query.month,
      periodId: query.periodId,
    });
  }
}
