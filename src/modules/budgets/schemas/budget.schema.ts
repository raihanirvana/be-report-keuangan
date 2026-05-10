import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { BudgetPeriod } from '../budget-period.enum';

export type BudgetDocument = HydratedDocument<Budget>;

@Schema({ timestamps: true })
export class Budget {
  @Prop({ ref: 'User', required: true, type: Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({ ref: 'Category', required: true, type: Types.ObjectId })
  categoryId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ enum: BudgetPeriod, required: true, type: String })
  period!: BudgetPeriod;

  @Prop({ min: 1, required: true, type: Number })
  limitAmount!: number;

  @Prop({ required: true, type: Date })
  startsAt!: Date;

  @Prop({ required: true, type: Date })
  endsAt!: Date;

  @Prop({ default: false })
  isArchived!: boolean;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);
BudgetSchema.index({ categoryId: 1, isArchived: 1, startsAt: 1, userId: 1 });
