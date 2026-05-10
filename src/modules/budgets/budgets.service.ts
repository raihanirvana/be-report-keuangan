import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CategoryType } from '../categories/category-type.enum';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { TransactionType } from '../transactions/transaction-type.enum';
import {
  BudgetItemResponse,
  BudgetsResponse,
  BudgetSummaryResponse,
} from './budgets.types';
import { CopyPreviousMonthDto } from './dto/copy-previous-month.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { FindBudgetsQueryDto } from './dto/find-budgets-query.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { Budget, BudgetDocument } from './schemas/budget.schema';

type MonthRange = {
  end: Date;
  month: string;
  start: Date;
};

@Injectable()
export class BudgetsService {
  constructor(
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async findAll(
    userId: string,
    query: FindBudgetsQueryDto,
  ): Promise<BudgetsResponse> {
    const monthRange = this.getMonthRange(query.month);

    return this.getBudgetSummary(userId, monthRange);
  }

  async create(userId: string, payload: CreateBudgetDto) {
    const category = await this.resolveCategory(userId, payload);
    const startsAt = new Date(payload.startsAt);
    const endsAt = new Date(payload.endsAt);

    if (startsAt >= endsAt) {
      throw new BadRequestException(
        'Tanggal mulai harus sebelum tanggal akhir',
      );
    }

    const budget = await this.budgetModel.findOneAndUpdate(
      {
        categoryId: category._id,
        isArchived: false,
        startsAt,
        userId: new Types.ObjectId(userId),
      },
      {
        categoryId: category._id,
        endsAt,
        limitAmount: payload.limitAmount,
        name: payload.name?.trim() ?? category.name,
        period: payload.period,
      },
      { new: true, upsert: true },
    );

    return this.toBudgetItemResponse(budget, category, 0);
  }

  async copyPreviousMonth(userId: string, payload: CopyPreviousMonthDto) {
    const sourceRange = this.getMonthRange(payload.sourceMonth);
    const targetRange = this.getMonthRange(payload.targetMonth);
    const sourceBudgets = await this.budgetModel.find({
      isArchived: false,
      startsAt: { $gte: sourceRange.start, $lt: sourceRange.end },
      userId: new Types.ObjectId(userId),
    });

    await Promise.all(
      sourceBudgets.map((budget) =>
        this.budgetModel.findOneAndUpdate(
          {
            categoryId: budget.categoryId,
            isArchived: false,
            startsAt: targetRange.start,
            userId: new Types.ObjectId(userId),
          },
          {
            categoryId: budget.categoryId,
            endsAt: targetRange.end,
            limitAmount: budget.limitAmount,
            name: budget.name,
            period: budget.period,
          },
          { new: true, upsert: true },
        ),
      ),
    );

    return this.getBudgetSummary(userId, targetRange);
  }

  async update(userId: string, budgetId: string, payload: UpdateBudgetDto) {
    const budget = await this.budgetModel.findOneAndUpdate(
      {
        _id: this.toObjectId(budgetId),
        isArchived: false,
        userId: new Types.ObjectId(userId),
      },
      {
        ...(payload.limitAmount ? { limitAmount: payload.limitAmount } : {}),
        ...(payload.name ? { name: payload.name.trim() } : {}),
      },
      { new: true },
    );

    if (!budget) {
      throw new NotFoundException('Batas pengeluaran tidak ditemukan');
    }

    const category = await this.findCategoryById(userId, budget.categoryId);
    const usedAmount = await this.getUsedAmountByCategory(
      userId,
      budget.categoryId,
      budget.startsAt,
      budget.endsAt,
    );

    return this.toBudgetItemResponse(budget, category, usedAmount);
  }

  async remove(userId: string, budgetId: string) {
    const budget = await this.budgetModel.findOneAndUpdate(
      {
        _id: this.toObjectId(budgetId),
        isArchived: false,
        userId: new Types.ObjectId(userId),
      },
      { isArchived: true },
    );

    if (!budget) {
      throw new NotFoundException('Batas pengeluaran tidak ditemukan');
    }
  }

  private async getBudgetSummary(
    userId: string,
    monthRange: MonthRange,
  ): Promise<BudgetsResponse> {
    const budgets = await this.budgetModel
      .find({
        isArchived: false,
        startsAt: { $gte: monthRange.start, $lt: monthRange.end },
        userId: new Types.ObjectId(userId),
      })
      .sort({ createdAt: 1 });
    const categories = await this.categoryModel.find({
      _id: { $in: budgets.map((budget) => budget.categoryId) },
    });
    const categoryMap = new Map(
      categories.map((category) => [category.id, category]),
    );
    const usedAmountMap = await this.getUsedAmountMap(userId, monthRange);
    const items = budgets.map((budget) => {
      const category = categoryMap.get(budget.categoryId.toString());
      const usedAmount = usedAmountMap.get(budget.categoryId.toString()) ?? 0;

      if (!category) {
        throw new NotFoundException(
          'Kategori batas pengeluaran tidak ditemukan',
        );
      }

      return this.toBudgetItemResponse(budget, category, usedAmount);
    });
    const summary = this.toSummary(items);

    return {
      items,
      previousMonth: items.length
        ? undefined
        : await this.getPreviousMonthState(userId, monthRange.month),
      summary,
    };
  }

  private async resolveCategory(userId: string, payload: CreateBudgetDto) {
    if (payload.categoryId) {
      return this.findCategoryById(userId, this.toObjectId(payload.categoryId));
    }

    if (!payload.category) {
      throw new BadRequestException('Kategori wajib diisi');
    }

    return this.categoryModel.create({
      color: payload.category.color,
      icon: payload.category.icon,
      name: payload.category.name.trim(),
      type: CategoryType.Expense,
      userId: new Types.ObjectId(userId),
    });
  }

  private async findCategoryById(userId: string, categoryId: Types.ObjectId) {
    const category = await this.categoryModel.findOne({
      $or: [{ userId: new Types.ObjectId(userId) }, { userId: null }],
      _id: categoryId,
      isArchived: false,
      type: CategoryType.Expense,
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    return category;
  }

  private async getUsedAmountByCategory(
    userId: string,
    categoryId: Types.ObjectId,
    start: Date,
    end: Date,
  ) {
    const transactions = await this.transactionModel.find({
      categoryId,
      occurredAt: { $gte: start, $lt: end },
      type: TransactionType.Expense,
      userId: new Types.ObjectId(userId),
    });

    return transactions.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    );
  }

  private async getUsedAmountMap(userId: string, monthRange: MonthRange) {
    const transactions = await this.transactionModel.find({
      occurredAt: { $gte: monthRange.start, $lt: monthRange.end },
      type: TransactionType.Expense,
      userId: new Types.ObjectId(userId),
    });
    const usedAmountMap = new Map<string, number>();

    for (const transaction of transactions) {
      if (!transaction.categoryId) {
        continue;
      }

      const categoryId = transaction.categoryId.toString();
      const currentAmount = usedAmountMap.get(categoryId) ?? 0;
      usedAmountMap.set(categoryId, currentAmount + transaction.amount);
    }

    return usedAmountMap;
  }

  private async getPreviousMonthState(userId: string, month: string) {
    const previousMonth = this.getPreviousMonth(month);
    const previousRange = this.getMonthRange(previousMonth);
    const previousBudgetCount = await this.budgetModel.countDocuments({
      isArchived: false,
      startsAt: { $gte: previousRange.start, $lt: previousRange.end },
      userId: new Types.ObjectId(userId),
    });

    return {
      available: previousBudgetCount > 0,
      month: previousMonth,
    };
  }

  private toBudgetItemResponse(
    budget: BudgetDocument,
    category: CategoryDocument,
    usedAmount: number,
  ): BudgetItemResponse {
    const percentage = this.getPercentage(usedAmount, budget.limitAmount);

    return {
      categoryId: category.id,
      color: category.color,
      icon: category.icon,
      id: budget.id,
      limitAmount: budget.limitAmount,
      name: budget.name,
      percentage,
      statusLabel: `${percentage}%`,
      usedAmount,
    };
  }

  private toSummary(items: BudgetItemResponse[]): BudgetSummaryResponse {
    const usedAmount = items.reduce(
      (total, item) => total + item.usedAmount,
      0,
    );
    const limitAmount = items.reduce(
      (total, item) => total + item.limitAmount,
      0,
    );

    return {
      limitAmount,
      percentage: this.getPercentage(usedAmount, limitAmount),
      usedAmount,
    };
  }

  private getPercentage(usedAmount: number, limitAmount: number) {
    if (limitAmount <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((usedAmount / limitAmount) * 100));
  }

  private getMonthRange(month?: string): MonthRange {
    const normalizedMonth = month ?? this.getCurrentMonth();
    const [year, monthNumber] = normalizedMonth.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));

    return {
      end,
      month: normalizedMonth,
      start,
    };
  }

  private getCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
  }

  private getPreviousMonth(month: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, monthNumber - 2, 1));

    return date.toISOString().slice(0, 7);
  }

  private toObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Data tidak ditemukan');
    }

    return new Types.ObjectId(id);
  }
}
