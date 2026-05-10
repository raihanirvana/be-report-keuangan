import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { envConfig, validateEnv } from './config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      validate: validateEnv,
    }),
    DatabaseModule.forRoot(),
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
