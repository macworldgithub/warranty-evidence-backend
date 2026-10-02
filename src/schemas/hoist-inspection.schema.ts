import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HoistInspectionDocument = HoistInspection & Document;

@Schema({ _id: false })
export class ChecklistItem {
  @Prop({ required: true })
  itemId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: ['PASS', 'FAULT', 'NA'], default: 'PASS' })
  status: 'PASS' | 'FAULT' | 'NA';

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String })
  photoUrl?: string;
}

export const ChecklistItemSchema = SchemaFactory.createForClass(ChecklistItem);

@Schema({ collection: 'hoist_inspections', timestamps: true })
export class HoistInspection {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, index: true })
  hoistId: string;

  @Prop({ required: true })
  hoistNumber: number;

  @Prop({ required: true, enum: ['hyundai_chery', 'byd_kia', 'general'] })
  facility: string;

  @Prop({ required: true })
  siteId: string;

  @Prop({ required: true })
  inspectorId: string;

  @Prop({ required: true })
  inspectorName: string;

  @Prop({ type: String, default: 'TECHNICIAN' })
  inspectorRole: string;

  @Prop({ required: true, index: true })
  shiftDate: string; // YYYY-MM-DD

  @Prop({ required: true, enum: ['MORNING', 'AFTERNOON', 'NIGHT', 'DAILY'], default: 'DAILY' })
  shiftType: string;

  @Prop({ required: true, enum: ['PASS', 'FAULT_IDENTIFIED', 'TAGGED_OUT'], default: 'PASS' })
  status: 'PASS' | 'FAULT_IDENTIFIED' | 'TAGGED_OUT';

  @Prop({ type: [ChecklistItemSchema], default: [] })
  checklistItems: ChecklistItem[];

  @Prop({ type: String })
  faultNotes?: string;

  @Prop({ type: String, enum: ['NONE', 'MINOR', 'MODERATE', 'CRITICAL'], default: 'NONE' })
  faultSeverity: 'NONE' | 'MINOR' | 'MODERATE' | 'CRITICAL';

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ default: false })
  lockoutTagoutApplied: boolean;

  @Prop({ default: false })
  correctiveActionRequired: boolean;

  @Prop({ type: String })
  managerNotes?: string;

  @Prop({ default: Date.now })
  signedAt: Date;
}

export const HoistInspectionSchema = SchemaFactory.createForClass(HoistInspection);
