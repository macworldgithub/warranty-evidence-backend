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
    enum: ['ADMIN', 'CLERK', 'TECHNICIAN'],
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

  @Prop({ type: String, enum: ['ON_SITE', 'OFF_SITE'], default: 'ON_SITE' })
  presenceStatus?: 'ON_SITE' | 'OFF_SITE';

  @Prop({ type: Number })
  presenceLatitude?: number;

  @Prop({ type: Number })
  presenceLongitude?: number;

  @Prop({ type: Number })
  presenceDistanceMeters?: number;

  @Prop({ type: Number })
  presenceSpeedKmh?: number;

  @Prop({ type: Number })
  presenceAccuracy?: number;

  @Prop({ type: String, enum: ['INSPECTION', 'ROAD_TEST', 'WORKSHOP', 'IDLE'], default: 'WORKSHOP' })
  presenceActivity?: string;

  @Prop({ type: String })
  presenceSiteId?: string;

  @Prop({ type: String })
  presenceSiteName?: string;

  @Prop({ type: String })
  presenceRoNumber?: string;

  @Prop({ type: Date })
  presenceLastPingAt?: Date;

  @Prop({
    type: [
      {
        eventType: { type: String },
        siteId: { type: String },
        siteName: { type: String },
        latitude: { type: Number },
        longitude: { type: Number },
        distanceMeters: { type: Number },
        activeRoNumber: { type: String },
        notes: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  geofenceEvents?: {
    eventType: string;
    siteId: string;
    siteName?: string;
    latitude: number;
    longitude: number;
    distanceMeters?: number;
    activeRoNumber?: string;
    notes?: string;
    timestamp: Date;
  }[];
}

export const UserSchema = SchemaFactory.createForClass(User);
