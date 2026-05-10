import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AccessTokenGuard } from './access-token.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';

@Module({
  controllers: [AuthController],
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      {
        name: RefreshToken.name,
        schema: RefreshTokenSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Category.name,
        schema: CategorySchema,
      },
    ]),
  ],
  providers: [AccessTokenGuard, AuthService],
  exports: [AccessTokenGuard, JwtModule],
})
export class AuthModule {}
