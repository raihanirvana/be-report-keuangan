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
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { PeriodsService } from './periods.service';

@Controller('periods')
@UseGuards(AccessTokenGuard)
export class PeriodsController {
  constructor(private readonly periodsService: PeriodsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return envelope(await this.periodsService.findAll(user.sub));
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() body: CreatePeriodDto) {
    return envelope(await this.periodsService.create(user.sub, body));
  }

  @Patch(':periodId')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('periodId') periodId: string,
    @Body() body: UpdatePeriodDto,
  ) {
    return envelope(await this.periodsService.update(user.sub, periodId, body));
  }

  @Delete(':periodId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('periodId') periodId: string,
  ) {
    await this.periodsService.remove(user.sub, periodId);
  }
}
