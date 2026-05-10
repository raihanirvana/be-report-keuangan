import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { envConfig, validateEnv } from './config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      validate: validateEnv,
    }),
    DatabaseModule.forRoot(),
    AuthModule,
    BudgetsModule,
    CategoriesModule,
    DashboardModule,
    HealthModule,
    TransactionsModule,
    UsersModule,
    WalletsModule,
  ],
})
export class AppModule {}
