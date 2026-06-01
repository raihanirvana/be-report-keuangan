import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import {
  PayrollPeriod,
  PayrollPeriodDocument,
} from './schemas/payroll-period.schema';
import { PayrollPeriodResponse, PeriodRange } from './periods.types';

type PeriodRangeQuery = {
  month?: string;
  periodId?: string;
};

@Injectable()
export class PeriodsService {
  constructor(
    @InjectModel(PayrollPeriod.name)
    private readonly periodModel: Model<PayrollPeriodDocument>,
  ) {}

  async findAll(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const periods = await this.periodModel
      .find({ isArchived: false, userId: userObjectId })
      .sort({ startsAt: -1 });

    if (periods.length) {
      return periods.map((period) => this.toResponse(period));
    }

    return [this.toResponse(await this.createDefaultCurrentPeriod(userId))];
  }

  async create(userId: string, payload: CreatePeriodDto) {
    const dates = this.parsePeriodDates(payload.startDate, payload.endDate);
    const period = await this.periodModel.create({
      endsAt: dates.end,
      isArchived: false,
      name:
        payload.name?.trim() || this.formatPeriodLabel(dates.start, dates.end),
      startsAt: dates.start,
      userId: new Types.ObjectId(userId),
    });

    return this.toResponse(period);
  }

  async update(userId: string, periodId: string, payload: UpdatePeriodDto) {
    const period = await this.findPeriodDocument(userId, periodId);
    const dates = this.getUpdatedDates(period, payload);

    period.name = payload.name?.trim() || period.name;
    period.startsAt = dates.start;
    period.endsAt = dates.end;
    await period.save();

    return this.toResponse(period);
  }

  async remove(userId: string, periodId: string) {
    const period = await this.findPeriodDocument(userId, periodId);

    period.isArchived = true;
    await period.save();
  }

  async resolveRange(
    userId: string,
    query: PeriodRangeQuery,
  ): Promise<PeriodRange> {
    if (query.periodId) {
      return this.getPeriodRange(userId, query.periodId);
    }

    return this.getMonthRange(query.month);
  }

  async getPreviousPeriodState(userId: string, range: PeriodRange) {
    if (!range.periodId) {
      return {
        available: false,
        periodId: undefined,
      };
    }

    const previous = await this.periodModel
      .findOne({
        endsAt: { $lte: range.start },
        isArchived: false,
        userId: new Types.ObjectId(userId),
      })
      .sort({ endsAt: -1 });

    return {
      available: Boolean(previous),
      budgetKey: previous ? this.getPeriodBudgetKey(previous) : undefined,
      periodId: previous?.id,
    };
  }

  async findById(userId: string, periodId: string) {
    return this.findPeriodDocument(userId, periodId);
  }

  private async getPeriodRange(userId: string, periodId: string) {
    const period = await this.findPeriodDocument(userId, periodId);

    return {
      budgetKey: this.getPeriodBudgetKey(period),
      end: period.endsAt,
      label: this.formatPeriodLabel(period.startsAt, period.endsAt),
      periodId: period.id,
      start: period.startsAt,
    };
  }

  private async findPeriodDocument(userId: string, periodId: string) {
    if (!Types.ObjectId.isValid(periodId)) {
      throw new NotFoundException('Periode tidak ditemukan');
    }

    const period = await this.periodModel.findOne({
      _id: new Types.ObjectId(periodId),
      isArchived: false,
      userId: new Types.ObjectId(userId),
    });

    if (!period) {
      throw new NotFoundException('Periode tidak ditemukan');
    }

    return period;
  }

  private async createDefaultCurrentPeriod(userId: string) {
    const range = this.getMonthRange();

    return this.periodModel.findOneAndUpdate(
      {
        startsAt: range.start,
        userId: new Types.ObjectId(userId),
      },
      {
        $setOnInsert: {
          endsAt: range.end,
          isArchived: false,
          name: range.label,
          startsAt: range.start,
          userId: new Types.ObjectId(userId),
        },
      },
      { new: true, upsert: true },
    );
  }

  private getUpdatedDates(
    period: PayrollPeriodDocument,
    payload: UpdatePeriodDto,
  ) {
    const startDate = payload.startDate ?? period.startsAt.toISOString();
    const endDate = payload.endDate ?? period.endsAt.toISOString();

    return this.parsePeriodDates(startDate, endDate);
  }

  private parsePeriodDates(startDate: string, endDate: string) {
    const start = this.toPeriodDate(startDate);
    const end = this.toPeriodDate(endDate);

    if (end <= start) {
      throw new BadRequestException('Waktu akhir harus setelah waktu mulai');
    }

    return { end, start };
  }

  private getMonthRange(month?: string): PeriodRange {
    const normalizedMonth = month ?? new Date().toISOString().slice(0, 7);
    const [year, monthNumber] = normalizedMonth.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));

    return {
      budgetKey: normalizedMonth,
      end,
      label: this.formatPeriodLabel(start, end),
      month: normalizedMonth,
      start,
    };
  }

  private getPeriodBudgetKey(period: PayrollPeriodDocument) {
    const calendarMonth = this.getCalendarMonthKey(period);

    return calendarMonth ?? `period:${period.id}`;
  }

  private getCalendarMonthKey(period: PayrollPeriodDocument) {
    const month = period.startsAt.toISOString().slice(0, 7);
    const monthRange = this.getMonthRange(month);

    if (
      period.startsAt.getTime() === monthRange.start.getTime() &&
      period.endsAt.getTime() === monthRange.end.getTime()
    ) {
      return month;
    }

    return null;
  }

  private toPeriodDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Tanggal periode tidak valid');
    }

    return date;
  }

  private toResponse(period: PayrollPeriodDocument): PayrollPeriodResponse {
    return {
      endDate: period.endsAt.toISOString(),
      id: period.id,
      isCurrent: this.isCurrentPeriod(period),
      label: this.formatPeriodLabel(period.startsAt, period.endsAt),
      name: period.name,
      startDate: period.startsAt.toISOString(),
    };
  }

  private isCurrentPeriod(period: PayrollPeriodDocument) {
    const now = new Date();

    return now >= period.startsAt && now < period.endsAt;
  }

  private formatPeriodLabel(start: Date, end: Date) {
    const startLabel = start.toLocaleString('id-ID', {
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      timeZone: 'Asia/Jakarta',
    });
    const endLabel = end.toLocaleString('id-ID', {
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
    });

    return `${startLabel} - ${endLabel}`;
  }
}
