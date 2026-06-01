import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PayrollPeriodDocument = HydratedDocument<PayrollPeriod>;

@Schema({ timestamps: true })
export class PayrollPeriod {
  createdAt!: Date;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, type: Date })
  startsAt!: Date;

  @Prop({ required: true, type: Date })
  endsAt!: Date;

  @Prop({ default: false, type: Boolean })
  isArchived!: boolean;

  @Prop({ ref: 'User', required: true, type: Types.ObjectId })
  userId!: Types.ObjectId;

  updatedAt!: Date;
}

export const PayrollPeriodSchema = SchemaFactory.createForClass(PayrollPeriod);
PayrollPeriodSchema.index({ startsAt: 1, userId: 1 });
PayrollPeriodSchema.index({ isArchived: 1, userId: 1 });
