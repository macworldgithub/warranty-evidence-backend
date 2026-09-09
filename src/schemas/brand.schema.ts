import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BrandDocument = Brand & Document;

@Schema({ collection: 'brands', timestamps: true })
export class Brand {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: false })
  code?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  seedChecklistReference: string;

  @Prop({ required: true })
  activeBrandPackId: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);
