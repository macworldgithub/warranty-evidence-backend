import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SiteDocument = Site & Document;

@Schema({ collection: 'sites', timestamps: true })
export class Site {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: false })
  code?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  location: string;

  @Prop({ required: true })
  roPrefix: string;

  @Prop({ type: [String], default: [] })
  authorizedBrandIds: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: false, type: Number })
  latitude?: number;

  @Prop({ required: false, type: Number })
  longitude?: number;

  @Prop({ required: false, type: Number, default: 200 })
  geofenceRadiusMeters?: number;

  @Prop({ default: true })
  geofenceEnabled?: boolean;
}

export const SiteSchema = SchemaFactory.createForClass(Site);
