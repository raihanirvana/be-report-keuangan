import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { WalletResponse } from './wallets.types';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
  ) {}

  async findAll(userId: string): Promise<WalletResponse[]> {
    const wallets = await this.walletModel
      .find({ isArchived: false, userId: new Types.ObjectId(userId) })
      .sort({ createdAt: 1 });

    return wallets.map((wallet) => this.toWalletResponse(wallet));
  }

  async create(userId: string, payload: CreateWalletDto) {
    const wallet = await this.walletModel.create({
      balance: payload.initialBalance ?? 0,
      color: payload.color,
      icon: payload.icon,
      name: payload.name.trim(),
      type: payload.type,
      userId: new Types.ObjectId(userId),
    });

    return this.toWalletResponse(wallet);
  }

  async update(userId: string, walletId: string, payload: UpdateWalletDto) {
    const wallet = await this.walletModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(walletId),
        isArchived: false,
        userId: new Types.ObjectId(userId),
      },
      this.getUpdatePayload(payload),
      { new: true },
    );

    if (!wallet) {
      throw new NotFoundException('Dompet tidak ditemukan');
    }

    return this.toWalletResponse(wallet);
  }

  async archive(userId: string, walletId: string) {
    const wallet = await this.walletModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(walletId),
        isArchived: false,
        userId: new Types.ObjectId(userId),
      },
      { isArchived: true },
    );

    if (!wallet) {
      throw new NotFoundException('Dompet tidak ditemukan');
    }
  }

  private getUpdatePayload(payload: UpdateWalletDto) {
    return {
      ...(payload.color ? { color: payload.color } : {}),
      ...(payload.icon ? { icon: payload.icon } : {}),
      ...(payload.name ? { name: payload.name.trim() } : {}),
    };
  }

  private toWalletResponse(wallet: WalletDocument): WalletResponse {
    return {
      balance: wallet.balance,
      color: wallet.color,
      formattedBalance: this.formatCompactRupiah(wallet.balance),
      icon: wallet.icon,
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
    };
  }

  private formatCompactRupiah(amount: number) {
    if (amount >= 1000) {
      return `Rp ${new Intl.NumberFormat('id-ID').format(amount / 1000)}k`;
    }

    return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
  }
}
