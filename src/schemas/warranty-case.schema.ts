import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WarrantyCaseDocument = WarrantyCase & Document;

@Schema({ _id: false })
export class EvidenceItemSubdocument {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  ruleKey: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['image', 'video', 'document', 'audio'] })
  mediaType: string;

  @Prop({ required: true })
  storageUrl: string;

  @Prop({ required: true })
  uploadedAt: string;

  @Prop()
  ocrExtractedText?: string;

  @Prop()
  ocrConfidence?: number;

  @Prop()
  durationSeconds?: number;

  @Prop({ default: false })
  isVerifiedByClerk?: boolean;
}
export const EvidenceItemSchema = SchemaFactory.createForClass(EvidenceItemSubdocument);

@Schema({ _id: false })
export class VoiceNoteSubdocument {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  recordedAt: string;

  @Prop({ required: true })
  recordedBy: string;

  @Prop({ required: true })
  durationSeconds: number;

  @Prop()
  originalAudioUrl?: string;

  @Prop({ required: true })
  transcript: string;

  @Prop()
  pinnedToEvidenceKey?: string;
}
export const VoiceNoteSchema = SchemaFactory.createForClass(VoiceNoteSubdocument);

@Schema({ _id: false })
export class FlagItemSubdocument {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  evidenceRuleKey: string;

  @Prop({ required: true })
  reasonCode: string;

  @Prop({ required: true })
  instruction: string;

  @Prop({ required: true })
  flaggedAt: string;

  @Prop({ required: true })
  flaggedBy: string;

  @Prop()
  resolvedAt?: string;
}
export const FlagItemSchema = SchemaFactory.createForClass(FlagItemSubdocument);

@Schema({ _id: false })
export class ChecklistSummarySubdocument {
  @Prop({ required: true, default: 0 })
  totalMandatory: number;

  @Prop({ required: true, default: 0 })
  completedMandatory: number;

  @Prop({ required: true, default: 0 })
  totalOptional: number;

  @Prop({ required: true, default: 0 })
  completedOptional: number;

  @Prop({ required: true, default: false })
  isReadyForSubmission: boolean;
}
export const ChecklistSummarySchema = SchemaFactory.createForClass(ChecklistSummarySubdocument);

@Schema({ collection: 'warranty_cases', timestamps: true })
export class WarrantyCase {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  siteId: string;

  @Prop({ required: true })
  siteName: string;

  @Prop({ required: true })
  brandId: string;

  @Prop({ required: true })
  brandName: string;

  @Prop({ required: true })
  roNumber: string;

  @Prop()
  claimNumber?: string;

  @Prop({ required: true })
  vin: string;

  @Prop({ required: true })
  odometer: number;

  @Prop({ required: true })
  make: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, enum: ['EV', 'Hybrid', 'PHEV', 'ICE'] })
  powertrain: string;

  @Prop({
    required: true,
    enum: ['Draft', 'Uploading', 'Awaiting Review', 'Flagged', 'Submitted', 'Closed', 'Withdrawn'],
    default: 'Draft',
  })
  status: string;

  @Prop({ required: true })
  technicianId: string;

  @Prop({ required: true })
  technicianName: string;

  @Prop({ required: true })
  concernTitle: string;

  @Prop({ required: true })
  faultCategory: string;

  @Prop({ default: false })
  partReplaced: boolean;

  @Prop({ default: false })
  noiseFault: boolean;

  @Prop({ default: true })
  diagnosticsAvailable: boolean;

  @Prop({ required: true, enum: ['Pre-repair only', 'During repair', 'Repair complete'] })
  repairStage: string;

  @Prop({ type: [EvidenceItemSchema], default: [] })
  evidenceItems: EvidenceItemSubdocument[];

  @Prop({ type: [VoiceNoteSchema], default: [] })
  voiceNotes: VoiceNoteSubdocument[];

  @Prop({ type: [FlagItemSchema], default: [] })
  flagHistory: FlagItemSubdocument[];

  @Prop({ type: ChecklistSummarySchema, required: true })
  checklistSummary: ChecklistSummarySubdocument;

  @Prop()
  clerkNotes?: string;

  @Prop()
  submittedAt?: string;
}

export const WarrantyCaseSchema = SchemaFactory.createForClass(WarrantyCase);
