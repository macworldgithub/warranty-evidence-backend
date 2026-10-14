import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InvitationDocument = HydratedDocument<Invitation>;
@Schema({ collection: 'invitations', timestamps: true })
export class Invitation {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) email: string;
  @Prop({ required: true }) siteId: string;
  @Prop({ required: true }) invitedBy: string;
  @Prop({ required: true, select: false }) tokenHash: string;
  @Prop({ required: true }) expiresAt: Date;
  @Prop({ required: true, enum: ['SENDING', 'PENDING', 'DELIVERY_FAILED', 'CANCELLED', 'ACCEPTED'] }) status: string;
  @Prop() acceptedAt?: Date;
  @Prop() acceptedUserId?: string;
  @Prop() sentAt?: Date;
  @Prop() deliveryError?: string;
  createdAt: Date;
  updatedAt: Date;
}
export const InvitationSchema = SchemaFactory.createForClass(Invitation);
// Only one active invitation per email; cancelled/accepted history is retained.
InvitationSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['SENDING', 'PENDING', 'DELIVERY_FAILED'] } } });
