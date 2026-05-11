import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  createdAt!: Date;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ lowercase: true, required: true, trim: true, unique: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ default: null, type: String })
  avatarUrl?: string | null;

  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
