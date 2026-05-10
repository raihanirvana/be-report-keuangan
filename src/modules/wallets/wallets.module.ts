import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  controllers: [WalletsController],
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: Wallet.name,
        schema: WalletSchema,
      },
    ]),
  ],
  providers: [WalletsService],
})
export class WalletsModule {}
