import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BrandPackDocument = BrandPack & Document;

@Schema({ _id: false })
export class EvidenceRuleSubdocument {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  ruleKey: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['image', 'video', 'document', 'audio'] })
  mediaType: string;

  @Prop({ required: true, enum: [1, 2] })
  tier: number;

  @Prop({ required: true, default: false })
  isMandatory: boolean;

  @Prop()
  minDurationSeconds?: number;

  @Prop()
  maxDurationSeconds?: number;

  @Prop({ required: true })
  namingConvention: string;

  @Prop()
  guidanceText?: string;

  @Prop({ type: [String], default: [] })
  faultCategorySpecific?: string[];
}

export const EvidenceRuleSchema = SchemaFactory.createForClass(EvidenceRuleSubdocument);

@Schema({ collection: 'brand_packs', timestamps: true })
export class BrandPack {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  brandId: string;

  @Prop({ required: true })
  brandName: string;

  @Prop({ required: true, default: 1 })
  version: number;

  @Prop({ required: true, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' })
  status: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  publishedAt?: string;

  @Prop()
  publishedBy?: string;

  @Prop({ type: [EvidenceRuleSchema], default: [] })
  rules: EvidenceRuleSubdocument[];
}

export const BrandPackSchema = SchemaFactory.createForClass(BrandPack);
