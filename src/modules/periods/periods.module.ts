import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { PeriodsController } from './periods.controller';
import { PeriodsService } from './periods.service';
import {
  PayrollPeriod,
  PayrollPeriodSchema,
} from './schemas/payroll-period.schema';

@Module({
  controllers: [PeriodsController],
  exports: [PeriodsService],
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: PayrollPeriod.name,
        schema: PayrollPeriodSchema,
      },
    ]),
  ],
  providers: [PeriodsService],
})
export class PeriodsModule {}
