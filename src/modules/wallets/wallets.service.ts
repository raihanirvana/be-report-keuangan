import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { WalletResponse } from './wallets.types';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async findAll(userId: string): Promise<WalletResponse[]> {
    const wallets = await this.walletModel
      .find({ isArchived: false, userId: new Types.ObjectId(userId) })
      .sort({ createdAt: 1 });

    return wallets.map((wallet) => this.toWalletResponse(wallet));
  }

  async create(userId: string, payload: CreateWalletDto) {
    const existingWallet = await this.walletModel.exists({
      isArchived: false,
      name: payload.name.trim(),
      userId: new Types.ObjectId(userId),
    });

    if (existingWallet) {
      throw new BadRequestException('Nama dompet sudah dipakai');
    }

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
    const wallet = await this.walletModel.findOne({
      _id: new Types.ObjectId(walletId),
      userId: new Types.ObjectId(userId),
    });

    if (!wallet) {
      throw new NotFoundException('Dompet tidak ditemukan');
    }

    const nextName = payload.name?.trim();

    if (nextName && nextName !== wallet.name) {
      const existingWallet = await this.walletModel.exists({
        _id: { $ne: wallet._id },
        isArchived: false,
        name: nextName,
        userId: new Types.ObjectId(userId),
      });

      if (existingWallet) {
        throw new BadRequestException('Nama dompet sudah dipakai');
      }

      wallet.name = nextName;
    }

    if (payload.icon) {
      wallet.icon = payload.icon;
    }

    if (payload.color) {
      wallet.color = payload.color;
    }

    if (payload.type) {
      wallet.type = payload.type;
    }

    if (typeof payload.balance === 'number') {
      wallet.balance = payload.balance;
    }

    await wallet.save();

    return this.toWalletResponse(wallet);
  }

  async archive(userId: string, walletId: string) {
    const wallet = await this.walletModel.findOne({
      _id: new Types.ObjectId(walletId),
      userId: new Types.ObjectId(userId),
    });

    if (!wallet) {
      throw new NotFoundException('Dompet tidak ditemukan');
    }

    await this.snapshotWalletNameOnTransactions(
      userId,
      wallet._id,
      wallet.name,
    );
    await wallet.deleteOne();
  }

  private async snapshotWalletNameOnTransactions(
    userId: string,
    walletId: Types.ObjectId,
    walletName: string,
  ) {
    const userObjectId = new Types.ObjectId(userId);

    await Promise.all([
      this.transactionModel.updateMany(
        { userId: userObjectId, walletId, walletName: null },
        { $set: { walletName } },
      ),
      this.transactionModel.updateMany(
        { fromWalletId: walletId, fromWalletName: null, userId: userObjectId },
        { $set: { fromWalletName: walletName } },
      ),
      this.transactionModel.updateMany(
        { toWalletId: walletId, toWalletName: null, userId: userObjectId },
        { $set: { toWalletName: walletName } },
      ),
    ]);
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
