import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HoistDocument = Hoist & Document;

@Schema({ _id: false })
class HoistAssignment {
  @Prop({ required: true }) id: string;
  @Prop() jobNumber?: string;
  @Prop() vehicleRego?: string;
  @Prop({ required: true }) assignedBy: string;
  @Prop({ required: true }) assignedAt: string;
}

@Schema({ collection: 'hoists', timestamps: true })
export class Hoist {
  @Prop({ type: SchemaFactory.createForClass(HoistAssignment) })
  assignment?: HoistAssignment;

  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  hoistNumber: number;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['hyundai_chery', 'byd_kia', 'general'], default: 'hyundai_chery' })
  facility: string;

  @Prop({ required: true })
  facilityName: string;

  @Prop({ required: true })
  siteId: string;

  @Prop({ required: true })
  brand: string;

  @Prop({ default: 4500 })
  capacityKg: number;

  @Prop({ default: '2-Post Clearfloor' })
  type: string;

  @Prop({ required: true, enum: ['OPERATIONAL', 'FAULT_IDENTIFIED', 'OUT_OF_SERVICE'], default: 'OPERATIONAL' })
  status: 'OPERATIONAL' | 'FAULT_IDENTIFIED' | 'OUT_OF_SERVICE';

  @Prop({ type: Date })
  lastInspectionDate?: Date;

  @Prop({ type: String, enum: ['PASS', 'FAULT_IDENTIFIED', 'TAGGED_OUT'] })
  lastInspectionStatus?: 'PASS' | 'FAULT_IDENTIFIED' | 'TAGGED_OUT';

  @Prop({ type: String })
  lastInspectedBy?: string;

  @Prop({ type: String })
  lastInspectedByName?: string;

  @Prop({ type: String })
  activeFaultNotes?: string;

  @Prop({ default: false })
  lockoutTagoutActive: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const HoistSchema = SchemaFactory.createForClass(Hoist);
