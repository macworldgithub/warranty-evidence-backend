import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TestDriveLogDocument = TestDriveLog & Document;

@Schema({ _id: false })
export class RoutePointSubdocument {
  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ default: 0 })
  speed: number;

  @Prop()
  timestamp?: number;

  @Prop({ default: 50 })
  x: number;

  @Prop({ default: 50 })
  y: number;
}
export const RoutePointSchema = SchemaFactory.createForClass(RoutePointSubdocument);

@Schema({ collection: 'test_drive_logs', timestamps: true })
export class TestDriveLog {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  repairOrder: string;

  @Prop({ required: true, index: true })
  registration: string;

  @Prop({ default: '' })
  vin: string;

  @Prop({ required: true })
  vehicleLabel: string;

  @Prop()
  make?: string;

  @Prop()
  model?: string;

  @Prop()
  year?: number;

  @Prop()
  variant?: string;

  @Prop()
  colour?: string;

  @Prop({ default: 0 })
  odometerKm?: number;

  @Prop({ default: '' })
  customerName?: string;

  @Prop({ default: '' })
  customerConcern?: string;

  @Prop({ required: true, index: true })
  technicianId: string;

  @Prop({ required: true })
  technicianName: string;

  @Prop({ required: true, index: true })
  siteId: string;

  @Prop({ required: true })
  siteName: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ default: '0m 00s' })
  duration: string;

  @Prop({ default: 0 })
  durationSeconds: number;

  @Prop({ default: 0 })
  distanceKm: number;

  @Prop({ default: 0 })
  maxSpeedKph: number;

  @Prop({ default: 0 })
  avgSpeedKph?: number;

  @Prop({
    required: true,
    enum: ['Passed', 'Flagged', 'Pending'],
    default: 'Pending',
    index: true,
  })
  outcome: 'Passed' | 'Flagged' | 'Pending';

  @Prop({ default: '' })
  technicianNotes?: string;

  @Prop()
  geofenceExitAt?: Date;

  @Prop()
  geofenceReturnAt?: Date;

  @Prop({ default: false })
  geofenceAutoVerified: boolean;

  @Prop({
    required: true,
    enum: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'IN_PROGRESS',
    index: true,
  })
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @Prop({ default: true })
  isLiveGps: boolean;

  @Prop({ type: [RoutePointSchema], default: [] })
  routePoints: RoutePointSubdocument[];
}

export const TestDriveLogSchema = SchemaFactory.createForClass(TestDriveLog);
