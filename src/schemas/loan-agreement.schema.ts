import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LoanAgreementDocument = LoanAgreement & Document;

@Schema({ _id: false })
export class CustomerSubdocument {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  dob: string;

  @Prop({ required: true })
  mobile: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  residentialAddress: string;

  @Prop({ required: true })
  licenceNumber: string;

  @Prop({ required: true, default: 'VIC' })
  licenceState: string;

  @Prop({ required: true })
  licenceExpiry: string;

  @Prop({ default: 'C' })
  licenceClass: string;

  @Prop()
  licencePhotoUrl?: string;

  @Prop({ default: true })
  licenceSighted: boolean;
}
export const CustomerSubdocumentSchema = SchemaFactory.createForClass(CustomerSubdocument);

@Schema({ _id: false })
export class VehicleSubdocument {
  @Prop({ required: true })
  vin: string;

  @Prop({ required: true })
  rego: string;

  @Prop({ required: true })
  make: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  year: number;

  @Prop({ default: 'White' })
  colour?: string;

  @Prop()
  stockNumber?: string;
}
export const VehicleSubdocumentSchema = SchemaFactory.createForClass(VehicleSubdocument);

@Schema({ _id: false })
export class InspectionPhotosSubdocument {
  @Prop()
  front?: string;

  @Prop()
  rear?: string;

  @Prop()
  driverSide?: string;

  @Prop()
  passengerSide?: string;

  @Prop()
  odometerDash?: string;
}
export const InspectionPhotosSchema = SchemaFactory.createForClass(InspectionPhotosSubdocument);

@Schema({ _id: false })
export class OutboundInspectionSubdocument {
  @Prop({ required: true })
  odometerOut: number;

  @Prop({ required: true, default: 100 })
  fuelLevelOutPercent: number;

  @Prop({ default: 'Clean, no existing damage observed.' })
  damageNotes?: string;

  @Prop({ type: InspectionPhotosSchema, default: {} })
  photos: InspectionPhotosSubdocument;

  @Prop({ required: true })
  issuedAt: string;

  @Prop({ required: true })
  issuedByStaffId: string;

  @Prop({ required: true })
  issuedByStaffName: string;
}
export const OutboundInspectionSchema = SchemaFactory.createForClass(OutboundInspectionSubdocument);

@Schema({ _id: false })
export class InboundInspectionSubdocument {
  @Prop()
  odometerIn?: number;

  @Prop()
  fuelLevelInPercent?: number;

  @Prop()
  returnDamageNotes?: string;

  @Prop({ type: InspectionPhotosSchema, default: {} })
  photos?: InspectionPhotosSubdocument;

  @Prop()
  returnedAt?: string;

  @Prop()
  receivedByStaffId?: string;

  @Prop()
  receivedByStaffName?: string;

  @Prop({ default: 0 })
  totalKmTravelled?: number;

  @Prop({ default: 0 })
  allowableKm?: number;

  @Prop({ default: 0 })
  excessKm?: number;

  @Prop({ default: 0 })
  excessKmChargeAmount?: number;

  @Prop({ default: false })
  hasDamageIncident?: boolean;

  @Prop()
  applicableExcessBand?: string;

  @Prop({ default: 0 })
  applicableExcessAmount?: number;
}
export const InboundInspectionSchema = SchemaFactory.createForClass(InboundInspectionSubdocument);

@Schema({ _id: false })
export class SignaturesSubdocument {
  @Prop({ required: true })
  borrowerSignatureDataUrl: string;

  @Prop({ required: true })
  borrowerSignedAt: string;

  @Prop({ default: true })
  readAndAgreed: boolean;

  @Prop({ default: true })
  electronicConsent: boolean;

  @Prop({ default: true })
  privacyNoticeAcknowledged: boolean;

  @Prop({ default: false })
  marketingConsent: boolean;

  @Prop()
  staffSignatureDataUrl?: string;

  @Prop()
  staffSignedAt?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  deviceUserAgent?: string;
}
export const SignaturesSchema = SchemaFactory.createForClass(SignaturesSubdocument);

@Schema({ timestamps: true, collection: 'loan_agreements' })
export class LoanAgreement {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, unique: true, index: true })
  agreementNumber: string; // e.g. BMG-CRANBOURNE-2026-0001

  @Prop({ required: true, index: true })
  siteId: string; // e.g. site_cranbourne_byd

  @Prop({ required: true })
  siteName: string;

  @Prop({ index: true })
  roNumber?: string; // Optional link to warranty case / repair order

  @Prop({ required: true, enum: ['SERVICE_LOANER', 'TEST_DRIVE', 'COURTESY_LOAN', 'DEMO'], default: 'SERVICE_LOANER' })
  purpose: string;

  @Prop({ required: true, enum: ['DRAFT', 'ACTIVE', 'DUE_SOON', 'OVERDUE', 'RETURNED', 'DISPUTED'], default: 'DRAFT', index: true })
  status: string;

  @Prop({ type: CustomerSubdocumentSchema, required: true })
  customer: CustomerSubdocument;

  @Prop({ type: VehicleSubdocumentSchema, required: true })
  vehicle: VehicleSubdocument;

  @Prop({ required: true })
  loanStartDateTime: string;

  @Prop({ required: true })
  dueBackDateTime: string;

  @Prop({ default: 50 })
  dailyKmCap: number; // default 50 km/day

  @Prop({ default: 0.50 })
  excessKmRate: number; // default $0.50/km

  @Prop({ default: 2500 })
  basicInsuranceExcess: number; // default $2,500

  @Prop({ type: OutboundInspectionSchema, required: true })
  outbound: OutboundInspectionSubdocument;

  @Prop({ type: InboundInspectionSchema })
  inbound?: InboundInspectionSubdocument;

  @Prop({ type: SignaturesSchema })
  signatures?: SignaturesSubdocument;

  @Prop()
  pdfStorageUrl?: string;

  @Prop()
  pdfSha256Hash?: string;

  @Prop({ default: 'v1.0-2026' })
  templateVersion: string;
}

export const LoanAgreementSchema = SchemaFactory.createForClass(LoanAgreement);
