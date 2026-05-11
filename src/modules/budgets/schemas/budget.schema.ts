import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BudgetDocument = HydratedDocument<Budget>;

@Schema({ _id: false })
export class BudgetItem {
  @Prop({ ref: 'Category', required: true, type: Types.ObjectId })
  categoryId!: Types.ObjectId;

  @Prop({ min: 1, required: true, type: Number })
  limitAmount!: number;
}

const BudgetItemSchema = SchemaFactory.createForClass(BudgetItem);

@Schema({ timestamps: true })
export class Budget {
  @Prop({ ref: 'User', required: true, type: Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  month!: string;

  @Prop({ required: true, type: Date })
  startsAt!: Date;

  @Prop({ required: true, type: Date })
  endsAt!: Date;

  @Prop({ default: [], type: [BudgetItemSchema] })
  items!: BudgetItem[];
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);
BudgetSchema.index({ month: 1, userId: 1 }, { unique: true });
