import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AuthUserResponse } from '../auth/auth.types';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async getMe(userId: string): Promise<AuthUserResponse> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return {
      avatarUrl: user.avatarUrl ?? null,
      email: user.email,
      id: user.id,
      name: user.name,
    };
  }
}
