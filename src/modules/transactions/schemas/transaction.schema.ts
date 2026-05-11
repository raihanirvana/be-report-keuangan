import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { TransactionType } from '../transaction-type.enum';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ ref: 'User', required: true, type: Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({ enum: TransactionType, required: true, type: String })
  type!: TransactionType;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ min: 1, required: true, type: Number })
  amount!: number;

  @Prop({ default: null, trim: true, type: String })
  note?: string | null;

  @Prop({ required: true, type: Date })
  occurredAt!: Date;

  @Prop({ default: null, trim: true, type: String })
  walletName?: string | null;

  @Prop({ default: null, ref: 'Category', type: Types.ObjectId })
  categoryId?: Types.ObjectId | null;

  @Prop({ default: null, trim: true, type: String })
  fromWalletName?: string | null;

  @Prop({ default: null, trim: true, type: String })
  toWalletName?: string | null;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ occurredAt: -1, type: 1, userId: 1 });
TransactionSchema.index({ userId: 1, walletName: 1 });
TransactionSchema.index({ fromWalletName: 1, toWalletName: 1, userId: 1 });
