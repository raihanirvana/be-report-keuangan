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
import { PeriodsService } from '../periods/periods.service';
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
  fromWalletName: string | null;
  note: string | null;
  occurredAt: Date;
  title: string;
  toWalletName: string | null;
  type: TransactionType;
  walletName: string | null;
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
    | { fromWalletName: string }
    | { toWalletName: string }
    | { walletName: string }
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
    private readonly periodsService: PeriodsService,
  ) {}

  async findAll(
    userId: string,
    query: FindTransactionsQueryDto,
  ): Promise<FindAllResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = await this.getFindFilter(userId, query);
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
        (await this.findWalletIdByName(userId, transaction.fromWalletName)),
      note: payload.note ?? transaction.note ?? undefined,
      occurredAt: payload.occurredAt ?? transaction.occurredAt.toISOString(),
      title: payload.title ?? transaction.title,
      toWalletId:
        payload.toWalletId ??
        (await this.findWalletIdByName(userId, transaction.toWalletName)),
      type: payload.type ?? transaction.type,
      walletId:
        payload.walletId ??
        (await this.findWalletIdByName(userId, transaction.walletName)),
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
      fromWalletName: null,
      note: this.normalizeNote(payload.note),
      occurredAt: payload.occurredAt
        ? new Date(payload.occurredAt)
        : new Date(),
      title: payload.title.trim(),
      toWalletName: null,
      type: payload.type,
      walletName: wallet.name,
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
      fromWalletName: fromWallet.name,
      note: this.normalizeNote(payload.note),
      occurredAt: payload.occurredAt
        ? new Date(payload.occurredAt)
        : new Date(),
      title: payload.title.trim(),
      toWalletName: toWallet.name,
      type: payload.type,
      walletName: null,
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
    const walletName =
      transaction.walletName ??
      (await this.findLegacyWalletName(userId, transaction, 'walletId'));
    const fromWalletName =
      transaction.fromWalletName ??
      (await this.findLegacyWalletName(userId, transaction, 'fromWalletId'));
    const toWalletName =
      transaction.toWalletName ??
      (await this.findLegacyWalletName(userId, transaction, 'toWalletId'));

    if (transaction.type === TransactionType.Income && walletName) {
      await this.incrementWallet(userId, walletName, amount);
      return;
    }

    if (transaction.type === TransactionType.Expense && walletName) {
      await this.incrementWallet(userId, walletName, -amount);
      return;
    }

    if (
      transaction.type === TransactionType.Transfer &&
      fromWalletName &&
      toWalletName
    ) {
      await Promise.all([
        this.incrementWallet(userId, fromWalletName, -amount),
        this.incrementWallet(userId, toWalletName, amount),
      ]);
    }
  }

  private async incrementWallet(
    userId: string,
    walletName: string,
    amount: number,
  ) {
    await this.walletModel.updateOne(
      {
        isArchived: false,
        name: walletName,
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
    const categoryIds = new Set<string>();
    const walletIds = new Set<string>();

    for (const transaction of transactions) {
      this.addLegacyWalletId(walletIds, transaction, 'walletId');
      this.addLegacyWalletId(walletIds, transaction, 'fromWalletId');
      this.addLegacyWalletId(walletIds, transaction, 'toWalletId');
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
      const wallet = this.getWalletSummary(
        walletMap,
        this.getLegacyWalletId(transaction, 'walletId'),
        transaction.walletName,
      );
      const fromWallet = this.getWalletSummary(
        walletMap,
        this.getLegacyWalletId(transaction, 'fromWalletId'),
        transaction.fromWalletName,
      );
      const toWallet = this.getWalletSummary(
        walletMap,
        this.getLegacyWalletId(transaction, 'toWalletId'),
        transaction.toWalletName,
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
        fromWallet,
        id: transaction.id,
        note: transaction.note ?? null,
        occurredAt: transaction.occurredAt.toISOString(),
        title: transaction.title,
        toWallet,
        type: transaction.type,
        wallet,
      };
    });
  }

  private async getFindFilter(
    userId: string,
    query: FindTransactionsQueryDto,
  ): Promise<TransactionFilter> {
    const filter: TransactionFilter = {
      userId: new Types.ObjectId(userId),
      ...(query.type ? { type: query.type } : {}),
    };

    if (query.month || query.periodId) {
      const range = await this.periodsService.resolveRange(userId, query);
      filter.occurredAt = { $gte: range.start, $lt: range.end };
    }

    if (query.walletId) {
      const wallet = await this.findUserWallet(userId, query.walletId);
      filter.$or = [
        { walletName: wallet.name },
        { fromWalletName: wallet.name },
        { toWalletName: wallet.name },
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

  private addLegacyWalletId(
    ids: Set<string>,
    transaction: TransactionDocument,
    fieldName: 'fromWalletId' | 'toWalletId' | 'walletId',
  ) {
    this.addOptionalId(ids, this.getLegacyWalletId(transaction, fieldName));
  }

  private async findWalletIdByName(userId: string, walletName?: string | null) {
    if (!walletName) {
      return undefined;
    }

    const wallet = await this.walletModel.findOne({
      isArchived: false,
      name: walletName,
      userId: new Types.ObjectId(userId),
    });

    return wallet?.id;
  }

  private async findLegacyWalletName(
    userId: string,
    transaction: TransactionDocument,
    fieldName: 'fromWalletId' | 'toWalletId' | 'walletId',
  ) {
    const walletId = this.getLegacyWalletId(transaction, fieldName);

    if (!walletId) {
      return null;
    }

    const wallet = await this.walletModel.findOne({
      _id: walletId,
      isArchived: false,
      userId: new Types.ObjectId(userId),
    });

    return wallet?.name ?? null;
  }

  private getOptionalDocument<TDocument extends { id: string }>(
    documents: Map<string, TDocument>,
    id?: Types.ObjectId | null,
  ) {
    return id ? documents.get(id.toString()) : undefined;
  }

  private getWalletSummary(
    wallets: Map<string, WalletDocument>,
    id?: Types.ObjectId | null,
    snapshotName?: string | null,
  ) {
    const wallet = id ? this.getOptionalDocument(wallets, id) : undefined;
    const walletName = snapshotName ?? wallet?.name;

    if (!walletName) {
      return null;
    }

    return {
      name: walletName,
    };
  }

  private getLegacyWalletId(
    transaction: TransactionDocument,
    fieldName: 'fromWalletId' | 'toWalletId' | 'walletId',
  ) {
    const legacyValue = transaction.get(fieldName) as unknown;

    if (legacyValue instanceof Types.ObjectId) {
      return legacyValue;
    }

    if (
      typeof legacyValue === 'string' &&
      Types.ObjectId.isValid(legacyValue)
    ) {
      return new Types.ObjectId(legacyValue);
    }

    return null;
  }

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Data tidak ditemukan');
    }

    return new Types.ObjectId(id);
  }
}
