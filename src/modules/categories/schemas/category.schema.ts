import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { CategoryType } from '../category-type.enum';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ default: null, ref: 'User', type: Types.ObjectId })
  userId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ enum: CategoryType, required: true, type: String })
  type!: CategoryType;

  @Prop({ required: true, trim: true })
  icon!: string;

  @Prop({ required: true, trim: true })
  color!: string;

  @Prop({ default: false })
  isDefault!: boolean;

  @Prop({ default: false })
  isArchived!: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ isArchived: 1, type: 1, userId: 1 });
