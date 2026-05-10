import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { WalletType } from '../wallet-type.enum';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ ref: 'User', required: true, type: Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ enum: WalletType, required: true, type: String })
  type!: WalletType;

  @Prop({ required: true, trim: true })
  icon!: string;

  @Prop({ required: true, trim: true })
  color!: string;

  @Prop({ default: 0, min: 0, type: Number })
  balance!: number;

  @Prop({ default: false })
  isArchived!: boolean;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
WalletSchema.index({ isArchived: 1, userId: 1 });
