import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ collection: 'otps', timestamps: true })
export class Otp {
  @Prop({ required: true, index: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  otp: string;

  @Prop({ required: true, default: 'REGISTRATION', enum: ['REGISTRATION', 'PASSWORD_RESET'] })
  purpose: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: Date.now, expires: 600 })
  createdAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
OtpSchema.index({ email: 1, purpose: 1 });
