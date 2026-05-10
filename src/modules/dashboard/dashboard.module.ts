import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { Budget, BudgetSchema } from '../budgets/schemas/budget.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Wallet, WalletSchema } from '../wallets/schemas/wallet.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Wallet.name,
        schema: WalletSchema,
      },
      {
        name: Transaction.name,
        schema: TransactionSchema,
      },
      {
        name: Category.name,
        schema: CategorySchema,
      },
      {
        name: Budget.name,
        schema: BudgetSchema,
      },
    ]),
  ],
  providers: [DashboardService],
})
export class DashboardModule {}
