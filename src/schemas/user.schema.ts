import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({
    required: true,
    enum: ['ADMIN', 'TECHNICIAN'],
    default: 'ADMIN',
  })
  role: string;

  @Prop({ required: true })
  defaultSiteId: string;

  @Prop({ type: [String], default: [] })
  authorizedSiteIds: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: [
      {
        token: { type: String, required: true },
        platform: { type: String, enum: ['android', 'ios', 'web'], default: 'android' },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  fcmTokens: { token: string; platform: 'android' | 'ios' | 'web'; updatedAt: Date }[];
}

export const UserSchema = SchemaFactory.createForClass(User);
