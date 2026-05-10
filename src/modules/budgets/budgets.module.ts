import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { Budget, BudgetSchema } from './schemas/budget.schema';

@Module({
  controllers: [BudgetsController],
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: Budget.name,
        schema: BudgetSchema,
      },
      {
        name: Category.name,
        schema: CategorySchema,
      },
      {
        name: Transaction.name,
        schema: TransactionSchema,
      },
    ]),
  ],
  providers: [BudgetsService],
})
export class BudgetsModule {}
