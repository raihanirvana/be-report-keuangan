import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { envConfig, validateEnv } from './config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { HealthModule } from './modules/health/health.module';
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
    CategoriesModule,
    HealthModule,
    UsersModule,
    WalletsModule,
  ],
})
export class AppModule {}
