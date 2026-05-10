import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';

import { DEFAULT_CATEGORIES } from '../categories/default-categories';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import {
  AuthRefreshResponse,
  AuthTokenResponse,
  AuthUserResponse,
  JwtPayload,
} from './auth.types';

const REFRESH_TOKEN_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto): Promise<AuthTokenResponse> {
    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.userModel.exists({ email });

    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await this.userModel.create({
      email,
      name: payload.name.trim(),
      passwordHash,
    });
    await this.seedDefaultCategories(user.id);

    return this.issueAuthTokens(user);
  }

  async login(payload: LoginDto): Promise<AuthTokenResponse> {
    const user = await this.userModel.findOne({
      email: payload.email.trim().toLowerCase(),
    });

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const isPasswordValid = await bcrypt.compare(
      payload.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    return this.issueAuthTokens(user);
  }

  async refresh(payload: RefreshTokenDto): Promise<AuthRefreshResponse> {
    const jwtPayload = await this.verifyRefreshToken(payload.refreshToken);
    const tokenHash = this.hashToken(payload.refreshToken);
    const storedToken = await this.refreshTokenModel.findOne({
      revokedAt: null,
      tokenHash,
      userId: new Types.ObjectId(jwtPayload.sub),
    });

    if (!storedToken || storedToken.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    const user = await this.findUserById(jwtPayload.sub);
    await this.revokeRefreshToken(payload.refreshToken);

    return this.issueTokenPair(user);
  }

  async logout(payload: RefreshTokenDto) {
    await this.revokeRefreshToken(payload.refreshToken);
  }

  private async issueAuthTokens(
    user: UserDocument,
  ): Promise<AuthTokenResponse> {
    return {
      ...(await this.issueTokenPair(user)),
      user: this.toAuthUser(user),
    };
  }

  private async issueTokenPair(
    user: UserDocument,
  ): Promise<AuthRefreshResponse> {
    const refreshToken = await this.signRefreshToken(user);
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      accessToken: await this.signAccessToken(user),
      refreshToken,
    };
  }

  private async findUserById(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    return user;
  }

  private async signAccessToken(user: UserDocument) {
    return this.jwtService.signAsync(this.getJwtPayload(user), {
      expiresIn: this.getJwtExpiresIn('env.jwt.accessExpiresIn', '15m'),
      secret: this.configService.getOrThrow<string>('env.jwt.accessSecret'),
    });
  }

  private async signRefreshToken(user: UserDocument) {
    return this.jwtService.signAsync(this.getJwtPayload(user), {
      expiresIn: this.getJwtExpiresIn('env.jwt.refreshExpiresIn', '30d'),
      secret: this.configService.getOrThrow<string>('env.jwt.refreshSecret'),
    });
  }

  private async verifyRefreshToken(refreshToken: string) {
    return this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
      secret: this.configService.getOrThrow<string>('env.jwt.refreshSecret'),
    });
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    await this.refreshTokenModel.create({
      expiresAt: this.getRefreshTokenExpiryDate(),
      tokenHash: this.hashToken(refreshToken),
      userId: new Types.ObjectId(userId),
    });
  }

  private async revokeRefreshToken(refreshToken: string) {
    await this.refreshTokenModel.updateOne(
      { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  private async seedDefaultCategories(userId: string) {
    await this.categoryModel.insertMany(
      DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        isDefault: true,
        userId: new Types.ObjectId(userId),
      })),
    );
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getJwtExpiresIn(
    configKey: string,
    fallback: SignOptions['expiresIn'],
  ): SignOptions['expiresIn'] {
    return (this.configService.get<string>(configKey) ??
      fallback) as SignOptions['expiresIn'];
  }

  private getJwtPayload(user: UserDocument): JwtPayload {
    return {
      email: user.email,
      sub: user.id,
    };
  }

  private getRefreshTokenExpiryDate() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    return expiresAt;
  }

  private toAuthUser(user: UserDocument): AuthUserResponse {
    return {
      avatarUrl: user.avatarUrl ?? null,
      email: user.email,
      id: user.id,
      name: user.name,
    };
  }
}
