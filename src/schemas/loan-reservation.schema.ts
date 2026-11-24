import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class LoanReservation {
  @Prop({ required: true }) id: string;
  @Prop({ required: true, min: 1, max: 6 }) loanerNumber: number;
  @Prop({ required: true }) customerName: string;
  @Prop({ required: true }) customerMobile: string;
  @Prop({ required: true }) startAt: string;
  @Prop({ required: true }) endAt: string;
  @Prop({ required: true, enum: ['RESERVED', 'ISSUED', 'CANCELLED', 'RETURNED'] }) status: string;
  @Prop() agreementId?: string;
  @Prop({ trim: true, uppercase: true, maxlength: 20 }) rego?: string;
}
export const LoanReservationSchema = SchemaFactory.createForClass(LoanReservation);
