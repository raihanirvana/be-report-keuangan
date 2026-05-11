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
    const monthRange = this.getMonthRange(payload.month);
    const category = await this.findCategoryById(
      userId,
      this.toObjectId(payload.categoryId),
    );
    const budget = await this.findOrCreateMonthlyBudget(userId, monthRange);
    const existingItem = budget.items.find((item) =>
      item.categoryId.equals(category._id),
    );

    if (existingItem) {
      existingItem.limitAmount = payload.limitAmount;
    } else {
      budget.items.push({
        categoryId: category._id,
        limitAmount: payload.limitAmount,
      });
    }

    await budget.save();

    return this.toBudgetItemResponse(
      budget.id,
      category,
      payload.limitAmount,
      await this.getUsedAmountByCategory(
        userId,
        category._id,
        monthRange.start,
        monthRange.end,
      ),
    );
  }

  async copyPreviousMonth(userId: string, payload: CopyPreviousMonthDto) {
    const sourceRange = this.getMonthRange(payload.sourceMonth);
    const targetRange = this.getMonthRange(payload.targetMonth);
    const sourceBudget = await this.budgetModel.findOne({
      month: sourceRange.month,
      userId: new Types.ObjectId(userId),
    });

    if (!sourceBudget?.items.length) {
      throw new BadRequestException('Batas bulan kemarin belum tersedia');
    }

    await this.budgetModel.findOneAndUpdate(
      {
        month: targetRange.month,
        userId: new Types.ObjectId(userId),
      },
      {
        endsAt: targetRange.end,
        items: sourceBudget.items.map((item) => ({
          categoryId: item.categoryId,
          limitAmount: item.limitAmount,
        })),
        month: targetRange.month,
        startsAt: targetRange.start,
        userId: new Types.ObjectId(userId),
      },
      { new: true, upsert: true },
    );

    return this.getBudgetSummary(userId, targetRange);
  }

  async update(userId: string, budgetId: string, payload: UpdateBudgetDto) {
    const monthRange = this.getMonthRange(payload.month);
    const categoryId = this.toObjectId(budgetId);
    const budget = await this.budgetModel.findOne({
      month: monthRange.month,
      userId: new Types.ObjectId(userId),
    });

    if (!budget) {
      throw new NotFoundException('Batas pengeluaran tidak ditemukan');
    }

    const item = budget.items.find((budgetItem) =>
      budgetItem.categoryId.equals(categoryId),
    );

    if (!item) {
      throw new NotFoundException('Batas pengeluaran tidak ditemukan');
    }

    if (payload.limitAmount) {
      item.limitAmount = payload.limitAmount;
    }

    await budget.save();

    const category = await this.findCategoryById(userId, categoryId);
    const usedAmount = await this.getUsedAmountByCategory(
      userId,
      categoryId,
      monthRange.start,
      monthRange.end,
    );

    return this.toBudgetItemResponse(
      budget.id,
      category,
      item.limitAmount,
      usedAmount,
    );
  }

  async remove(userId: string, budgetId: string, month?: string) {
    const monthRange = this.getMonthRange(month);
    const categoryId = this.toObjectId(budgetId);
    const budget = await this.budgetModel.findOne({
      month: monthRange.month,
      userId: new Types.ObjectId(userId),
    });

    if (!budget) {
      throw new NotFoundException('Batas pengeluaran tidak ditemukan');
    }

    const currentLength = budget.items.length;
    budget.items = budget.items.filter(
      (item) => !item.categoryId.equals(categoryId),
    );

    if (budget.items.length === currentLength) {
      throw new NotFoundException('Batas pengeluaran tidak ditemukan');
    }

    await budget.save();
  }

  private async getBudgetSummary(
    userId: string,
    monthRange: MonthRange,
  ): Promise<BudgetsResponse> {
    const budget = await this.budgetModel.findOne({
      month: monthRange.month,
      userId: new Types.ObjectId(userId),
    });

    if (!budget?.items.length) {
      return {
        documentId: budget?.id ?? null,
        items: [],
        month: monthRange.month,
        previousMonth: await this.getPreviousMonthState(
          userId,
          monthRange.month,
        ),
        summary: this.toSummary([]),
      };
    }

    const categories = await this.categoryModel.find({
      _id: { $in: budget.items.map((item) => item.categoryId) },
    });
    const categoryMap = new Map(
      categories.map((category) => [category.id, category]),
    );
    const usedAmountMap = await this.getUsedAmountMap(userId, monthRange);
    const items = budget.items.map((budgetItem) => {
      const category = categoryMap.get(budgetItem.categoryId.toString());
      const usedAmount =
        usedAmountMap.get(budgetItem.categoryId.toString()) ?? 0;

      if (!category) {
        throw new NotFoundException(
          'Kategori batas pengeluaran tidak ditemukan',
        );
      }

      return this.toBudgetItemResponse(
        budget.id,
        category,
        budgetItem.limitAmount,
        usedAmount,
      );
    });

    return {
      documentId: budget.id,
      items,
      month: monthRange.month,
      previousMonth: undefined,
      summary: this.toSummary(items),
    };
  }

  private async findOrCreateMonthlyBudget(
    userId: string,
    monthRange: MonthRange,
  ) {
    return this.budgetModel.findOneAndUpdate(
      {
        month: monthRange.month,
        userId: new Types.ObjectId(userId),
      },
      {
        $setOnInsert: {
          endsAt: monthRange.end,
          items: [],
          month: monthRange.month,
          startsAt: monthRange.start,
          userId: new Types.ObjectId(userId),
        },
      },
      { new: true, upsert: true },
    );
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
    const previousBudget = await this.budgetModel.findOne({
      month: previousMonth,
      userId: new Types.ObjectId(userId),
    });

    return {
      available: Boolean(previousBudget?.items.length),
      month: previousMonth,
    };
  }

  private toBudgetItemResponse(
    documentId: string,
    category: CategoryDocument,
    limitAmount: number,
    usedAmount: number,
  ): BudgetItemResponse {
    const percentage = this.getPercentage(usedAmount, limitAmount);

    return {
      categoryId: category.id,
      color: category.color,
      documentId,
      icon: category.icon,
      id: category.id,
      limitAmount,
      name: category.name,
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
