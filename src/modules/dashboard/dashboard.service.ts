import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { TransactionType } from '../transactions/transaction-type.enum';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Wallet, WalletDocument } from '../wallets/schemas/wallet.schema';
import { PeriodsService } from '../periods/periods.service';
import type { PeriodRange } from '../periods/periods.types';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';
import { DashboardSummaryResponse } from './dashboard.types';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    private readonly periodsService: PeriodsService,
  ) {}

  async getSummary(
    userId: string,
    query: DashboardSummaryQueryDto,
  ): Promise<DashboardSummaryResponse> {
    const periodRange = await this.periodsService.resolveRange(userId, query);
    const userObjectId = new Types.ObjectId(userId);
    const selectedWallet = await this.getSelectedWallet(userId, query.walletId);
    const walletFilter = this.getWalletFilter(selectedWallet.name);
    const [
      user,
      wallets,
      monthlyTransactions,
      latestTransactions,
      firstTransaction,
      budget,
    ] = await Promise.all([
      this.userModel.findById(userObjectId),
      this.walletModel.find({ isArchived: false, userId: userObjectId }),
      this.transactionModel
        .find({
          ...walletFilter,
          occurredAt: { $gte: periodRange.start, $lt: periodRange.end },
          userId: userObjectId,
        })
        .sort({ occurredAt: -1, createdAt: -1 }),
      this.transactionModel
        .find({
          ...walletFilter,
          userId: userObjectId,
        })
        .sort({ occurredAt: -1, createdAt: -1 })
        .limit(4),
      this.transactionModel
        .findOne({
          userId: userObjectId,
        })
        .sort({ occurredAt: 1, createdAt: 1 }),
      this.budgetModel.findOne({
        month: periodRange.budgetKey,
        userId: userObjectId,
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const expenseTransactions = monthlyTransactions.filter(
      (transaction) => transaction.type === TransactionType.Expense,
    );
    const incomeAmount = this.sumTransactions(
      monthlyTransactions,
      TransactionType.Income,
    );
    const expenseAmount = this.sumTransactions(
      monthlyTransactions,
      TransactionType.Expense,
    );
    const balanceAmount =
      selectedWallet.id === 'all'
        ? wallets.reduce((total, wallet) => total + wallet.balance, 0)
        : selectedWallet.balance;
    const chartCategories = await this.getChartCategories(expenseTransactions);
    const budgetLimit = await this.getBudgetLimit(
      userId,
      budget,
      periodRange,
      selectedWallet.id,
    );

    return {
      activePeriod: {
        endDate: periodRange.end.toISOString(),
        id: periodRange.periodId ?? null,
        label: periodRange.label,
        startDate: periodRange.start.toISOString(),
      },
      availablePeriod: this.getAvailablePeriod(user, firstTransaction),
      balance: {
        amount: balanceAmount,
        formatted: this.formatRupiah(balanceAmount),
      },
      budgetLimit,
      chart: {
        categories: chartCategories,
        expenseTotal: expenseAmount,
      },
      expense: {
        amount: expenseAmount,
        formatted: this.formatCompactRupiah(expenseAmount),
      },
      income: {
        amount: incomeAmount,
        formatted: this.formatCompactRupiah(incomeAmount),
      },
      latestTransactions: latestTransactions.map((transaction) => ({
        amount: transaction.amount,
        formattedAmount: this.formatTransactionAmount(transaction),
        id: transaction.id,
        occurredAt: transaction.occurredAt.toISOString(),
        title: transaction.title,
        type: transaction.type,
      })),
      selectedWallet: {
        id: selectedWallet.id,
        name: selectedWallet.name,
      },
      user: {
        avatarUrl: user.avatarUrl ?? null,
        name: user.name,
      },
    };
  }

  private async getSelectedWallet(userId: string, walletId?: string) {
    if (!walletId || walletId === 'all') {
      return {
        balance: 0,
        id: 'all',
        name: 'Total Asset Saya',
      };
    }

    if (!Types.ObjectId.isValid(walletId)) {
      throw new NotFoundException('Dompet tidak ditemukan');
    }

    const wallet = await this.walletModel.findOne({
      _id: new Types.ObjectId(walletId),
      isArchived: false,
      userId: new Types.ObjectId(userId),
    });

    if (!wallet) {
      throw new NotFoundException('Dompet tidak ditemukan');
    }

    return {
      balance: wallet.balance,
      id: wallet.id,
      name: wallet.name,
    };
  }

  private getWalletFilter(walletName: string) {
    if (walletName === 'Total Asset Saya') {
      return {};
    }

    return {
      $or: [
        { walletName },
        { fromWalletName: walletName },
        { toWalletName: walletName },
      ],
    };
  }

  private async getChartCategories(transactions: TransactionDocument[]) {
    const amountMap = new Map<string, number>();

    for (const transaction of transactions) {
      if (!transaction.categoryId) {
        continue;
      }

      const categoryId = transaction.categoryId.toString();
      amountMap.set(
        categoryId,
        (amountMap.get(categoryId) ?? 0) + transaction.amount,
      );
    }

    const categories = await this.categoryModel.find({
      _id: { $in: [...amountMap.keys()] },
    });
    const expenseTotal = [...amountMap.values()].reduce(
      (total, amount) => total + amount,
      0,
    );

    return categories.map((category) => {
      const amount = amountMap.get(category.id) ?? 0;

      return {
        amount,
        categoryId: category.id,
        color: category.color,
        name: category.name,
        percentage: this.getPercentage(amount, expenseTotal),
      };
    });
  }

  private async getBudgetLimit(
    userId: string,
    budget: BudgetDocument | null,
    periodRange: PeriodRange,
    selectedWalletId: string,
  ) {
    const usedAmount =
      selectedWalletId === 'all'
        ? await this.getBudgetUsedAmount(userId, budget, periodRange)
        : 0;
    const limitAmount =
      selectedWalletId === 'all'
        ? (budget?.items ?? []).reduce(
            (total, item) => total + item.limitAmount,
            0,
          )
        : 0;

    return {
      limitAmount,
      percentage: this.getPercentage(usedAmount, limitAmount),
      usedAmount,
    };
  }

  private async getBudgetUsedAmount(
    userId: string,
    budget: BudgetDocument | null,
    periodRange: PeriodRange,
  ) {
    const budgetCategoryIds = (budget?.items ?? []).map(
      (item) => item.categoryId,
    );

    if (!budgetCategoryIds.length) {
      return 0;
    }

    const transactions = await this.transactionModel.find({
      categoryId: { $in: budgetCategoryIds },
      occurredAt: { $gte: periodRange.start, $lt: periodRange.end },
      type: TransactionType.Expense,
      userId: new Types.ObjectId(userId),
    });

    return transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    );
  }

  private sumTransactions(
    transactions: TransactionDocument[],
    type: TransactionType,
  ) {
    return transactions
      .filter((transaction) => transaction.type === type)
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

  private formatTransactionAmount(transaction: TransactionDocument) {
    const formatted = this.formatRupiah(transaction.amount);

    if (transaction.type === TransactionType.Income) {
      return `+ ${formatted}`;
    }

    if (transaction.type === TransactionType.Expense) {
      return `- ${formatted}`;
    }

    return formatted;
  }

  private formatCompactRupiah(amount: number) {
    if (amount >= 1000) {
      return `Rp ${new Intl.NumberFormat('id-ID').format(amount / 1000)}k`;
    }

    return this.formatRupiah(amount);
  }

  private formatRupiah(amount: number) {
    return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
  }

  private getPercentage(amount: number, total: number) {
    if (total <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((amount / total) * 100));
  }

  private getAvailablePeriod(
    user: UserDocument,
    firstTransaction: TransactionDocument | null,
  ) {
    return {
      maxMonth: this.formatMonth(new Date()),
      minMonth: this.formatMonth(
        firstTransaction?.occurredAt ?? user.createdAt,
      ),
    };
  }

  private formatMonth(date: Date) {
    return date.toISOString().slice(0, 7);
  }
}
