import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import { CategoryType } from '../categories/category-type.enum';
import { Wallet, WalletDocument } from '../wallets/schemas/wallet.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FindTransactionsQueryDto } from './dto/find-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { TransactionType } from './transaction-type.enum';
import { TransactionResponse } from './transactions.types';

type PreparedTransaction = {
  amount: number;
  categoryId: Types.ObjectId | null;
  fromWalletId: Types.ObjectId | null;
  note: string | null;
  occurredAt: Date;
  title: string;
  toWalletId: Types.ObjectId | null;
  type: TransactionType;
  walletId: Types.ObjectId | null;
};

type FindAllResult = {
  items: TransactionResponse[];
  meta: {
    limit: number;
    page: number;
    total: number;
  };
};

type TransactionFilter = {
  $or?: Array<
    | { fromWalletId: Types.ObjectId }
    | { toWalletId: Types.ObjectId }
    | { walletId: Types.ObjectId }
  >;
  occurredAt?: {
    $gte: Date;
    $lt: Date;
  };
  type?: TransactionType;
  userId: Types.ObjectId;
};

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async findAll(
    userId: string,
    query: FindTransactionsQueryDto,
  ): Promise<FindAllResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = this.getFindFilter(userId, query);
    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ occurredAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.transactionModel.countDocuments(filter),
    ]);

    return {
      items: await this.toTransactionResponses(transactions),
      meta: { limit, page, total },
    };
  }

  async create(userId: string, payload: CreateTransactionDto) {
    const prepared = await this.prepareTransaction(userId, payload);
    const transaction = await this.transactionModel.create({
      ...prepared,
      userId: new Types.ObjectId(userId),
    });

    await this.applyBalanceEffect(userId, transaction, 1);

    return this.toTransactionResponse(transaction);
  }

  async update(
    userId: string,
    transactionId: string,
    payload: UpdateTransactionDto,
  ) {
    const transaction = await this.transactionModel.findOne({
      _id: this.toObjectId(transactionId),
      userId: new Types.ObjectId(userId),
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    const prepared = await this.prepareTransaction(userId, {
      amount: payload.amount ?? transaction.amount,
      categoryId:
        payload.categoryId ??
        this.optionalObjectIdToString(transaction.categoryId),
      fromWalletId:
        payload.fromWalletId ??
        this.optionalObjectIdToString(transaction.fromWalletId),
      note: payload.note ?? transaction.note ?? undefined,
      occurredAt: payload.occurredAt ?? transaction.occurredAt.toISOString(),
      title: payload.title ?? transaction.title,
      toWalletId:
        payload.toWalletId ??
        this.optionalObjectIdToString(transaction.toWalletId),
      type: payload.type ?? transaction.type,
      walletId:
        payload.walletId ?? this.optionalObjectIdToString(transaction.walletId),
    });

    await this.applyBalanceEffect(userId, transaction, -1);
    transaction.set(prepared);
    await transaction.save();
    await this.applyBalanceEffect(userId, transaction, 1);

    return this.toTransactionResponse(transaction);
  }

  async remove(userId: string, transactionId: string) {
    const transaction = await this.transactionModel.findOne({
      _id: this.toObjectId(transactionId),
      userId: new Types.ObjectId(userId),
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    await this.applyBalanceEffect(userId, transaction, -1);
    await transaction.deleteOne();
  }

  private async prepareTransaction(
    userId: string,
    payload: CreateTransactionDto,
  ): Promise<PreparedTransaction> {
    if (payload.type === TransactionType.Transfer) {
      return this.prepareTransfer(userId, payload);
    }

    return this.prepareIncomeOrExpense(userId, payload);
  }

  private async prepareIncomeOrExpense(
    userId: string,
    payload: CreateTransactionDto,
  ): Promise<PreparedTransaction> {
    if (!payload.walletId || !payload.categoryId) {
      throw new BadRequestException('Dompet dan kategori wajib diisi');
    }

    const [wallet, category] = await Promise.all([
      this.findUserWallet(userId, payload.walletId),
      this.findAvailableCategory(userId, payload.categoryId),
    ]);

    const expectedCategoryType =
      payload.type === TransactionType.Expense
        ? CategoryType.Expense
        : CategoryType.Income;

    if (category.type !== expectedCategoryType) {
      throw new BadRequestException('Tipe kategori tidak sesuai transaksi');
    }

    return {
      amount: payload.amount,
      categoryId: category._id,
      fromWalletId: null,
      note: this.normalizeNote(payload.note),
      occurredAt: payload.occurredAt
        ? new Date(payload.occurredAt)
        : new Date(),
      title: payload.title.trim(),
      toWalletId: null,
      type: payload.type,
      walletId: wallet._id,
    };
  }

  private async prepareTransfer(
    userId: string,
    payload: CreateTransactionDto,
  ): Promise<PreparedTransaction> {
    if (!payload.fromWalletId || !payload.toWalletId) {
      throw new BadRequestException('Dompet asal dan tujuan wajib diisi');
    }

    if (payload.fromWalletId === payload.toWalletId) {
      throw new BadRequestException('Dompet asal dan tujuan harus berbeda');
    }

    const [fromWallet, toWallet] = await Promise.all([
      this.findUserWallet(userId, payload.fromWalletId),
      this.findUserWallet(userId, payload.toWalletId),
    ]);

    return {
      amount: payload.amount,
      categoryId: null,
      fromWalletId: fromWallet._id,
      note: this.normalizeNote(payload.note),
      occurredAt: payload.occurredAt
        ? new Date(payload.occurredAt)
        : new Date(),
      title: payload.title.trim(),
      toWalletId: toWallet._id,
      type: payload.type,
      walletId: null,
    };
  }

  private async findUserWallet(userId: string, walletId: string) {
    const wallet = await this.walletModel.findOne({
      _id: this.toObjectId(walletId),
      isArchived: false,
      userId: new Types.ObjectId(userId),
    });

    if (!wallet) {
      throw new NotFoundException('Dompet tidak ditemukan');
    }

    return wallet;
  }

  private async findAvailableCategory(userId: string, categoryId: string) {
    const category = await this.categoryModel.findOne({
      $or: [{ userId: new Types.ObjectId(userId) }, { userId: null }],
      _id: this.toObjectId(categoryId),
      isArchived: false,
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    return category;
  }

  private async applyBalanceEffect(
    userId: string,
    transaction: TransactionDocument,
    multiplier: 1 | -1,
  ) {
    const amount = transaction.amount * multiplier;

    if (transaction.type === TransactionType.Income && transaction.walletId) {
      await this.incrementWallet(userId, transaction.walletId, amount);
      return;
    }

    if (transaction.type === TransactionType.Expense && transaction.walletId) {
      await this.incrementWallet(userId, transaction.walletId, -amount);
      return;
    }

    if (
      transaction.type === TransactionType.Transfer &&
      transaction.fromWalletId &&
      transaction.toWalletId
    ) {
      await Promise.all([
        this.incrementWallet(userId, transaction.fromWalletId, -amount),
        this.incrementWallet(userId, transaction.toWalletId, amount),
      ]);
    }
  }

  private async incrementWallet(
    userId: string,
    walletId: Types.ObjectId,
    amount: number,
  ) {
    await this.walletModel.updateOne(
      {
        _id: walletId,
        isArchived: false,
        userId: new Types.ObjectId(userId),
      },
      { $inc: { balance: amount } },
    );
  }

  private async toTransactionResponse(transaction: TransactionDocument) {
    const [response] = await this.toTransactionResponses([transaction]);

    return response;
  }

  private async toTransactionResponses(transactions: TransactionDocument[]) {
    const walletIds = new Set<string>();
    const categoryIds = new Set<string>();

    for (const transaction of transactions) {
      this.addOptionalId(walletIds, transaction.walletId);
      this.addOptionalId(walletIds, transaction.fromWalletId);
      this.addOptionalId(walletIds, transaction.toWalletId);
      this.addOptionalId(categoryIds, transaction.categoryId);
    }

    const [wallets, categories] = await Promise.all([
      this.walletModel.find({ _id: { $in: [...walletIds] } }),
      this.categoryModel.find({ _id: { $in: [...categoryIds] } }),
    ]);
    const walletMap = new Map(wallets.map((wallet) => [wallet.id, wallet]));
    const categoryMap = new Map(
      categories.map((category) => [category.id, category]),
    );

    return transactions.map((transaction) => {
      const wallet = this.getOptionalDocument(walletMap, transaction.walletId);
      const fromWallet = this.getOptionalDocument(
        walletMap,
        transaction.fromWalletId,
      );
      const toWallet = this.getOptionalDocument(
        walletMap,
        transaction.toWalletId,
      );
      const category = this.getOptionalDocument(
        categoryMap,
        transaction.categoryId,
      );

      return {
        amount: transaction.amount,
        category: category
          ? {
              color: category.color,
              icon: category.icon,
              id: category.id,
              name: category.name,
            }
          : null,
        formattedAmount: this.formatAmount(transaction),
        fromWallet: fromWallet
          ? { id: fromWallet.id, name: fromWallet.name }
          : null,
        id: transaction.id,
        note: transaction.note ?? null,
        occurredAt: transaction.occurredAt.toISOString(),
        title: transaction.title,
        toWallet: toWallet ? { id: toWallet.id, name: toWallet.name } : null,
        type: transaction.type,
        wallet: wallet ? { id: wallet.id, name: wallet.name } : null,
      };
    });
  }

  private getFindFilter(
    userId: string,
    query: FindTransactionsQueryDto,
  ): TransactionFilter {
    const filter: TransactionFilter = {
      userId: new Types.ObjectId(userId),
      ...(query.type ? { type: query.type } : {}),
    };

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      filter.occurredAt = { $gte: start, $lt: end };
    }

    if (query.walletId) {
      const walletId = this.toObjectId(query.walletId);
      filter.$or = [
        { walletId },
        { fromWalletId: walletId },
        { toWalletId: walletId },
      ];
    }

    return filter;
  }

  private formatAmount(transaction: TransactionDocument) {
    const formatted = new Intl.NumberFormat('id-ID').format(transaction.amount);

    if (transaction.type === TransactionType.Income) {
      return `+ Rp ${formatted}`;
    }

    if (transaction.type === TransactionType.Expense) {
      return `- Rp ${formatted}`;
    }

    return `Rp ${formatted}`;
  }

  private normalizeNote(note?: string | null) {
    if (!note) {
      return null;
    }

    const trimmedNote = note.trim();

    return trimmedNote ? trimmedNote : null;
  }

  private optionalObjectIdToString(id?: Types.ObjectId | null) {
    return id ? id.toString() : undefined;
  }

  private addOptionalId(ids: Set<string>, id?: Types.ObjectId | null) {
    if (id) {
      ids.add(id.toString());
    }
  }

  private getOptionalDocument<TDocument extends { id: string }>(
    documents: Map<string, TDocument>,
    id?: Types.ObjectId | null,
  ) {
    return id ? documents.get(id.toString()) : undefined;
  }

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Data tidak ditemukan');
    }

    return new Types.ObjectId(id);
  }
}
