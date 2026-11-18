import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { ReserveLoanerDto } from './dto/reserve-loaner.dto';

@Schema({ _id: false })
class Reservation {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) customerName: string;
  @Prop({ required: true }) customerMobile: string;
  @Prop({ required: true }) startAt: string;
  @Prop({ required: true }) endAt: string;
  @Prop({ required: true, enum: ['RESERVED', 'ISSUED', 'CANCELLED', 'RETURNED'] }) status: string;
  @Prop() agreementId?: string;
  @Prop() rego?: string;
}
// One document per site/slot makes overlap checks and booking atomic.
@Schema({ collection: 'loan_reservation_slots', timestamps: true })
export class LoanReservationSlot {
  @Prop({ required: true }) siteId: string;
  @Prop({ required: true }) loanerNumber: number;
  @Prop({ type: [SchemaFactory.createForClass(Reservation)], default: [] }) bookings: Reservation[];
}
export const LoanReservationSlotSchema = SchemaFactory.createForClass(LoanReservationSlot);
LoanReservationSlotSchema.index({ siteId: 1, loanerNumber: 1 }, { unique: true });

@Injectable()
export class LoanReservationsService {
  constructor(@InjectModel(LoanReservationSlot.name) private readonly slots: Model<LoanReservationSlot>) {}

  async list(siteId?: string | string[]) {
    const filter = Array.isArray(siteId) ? { siteId: { $in: siteId } } : siteId ? { siteId } : {};
    const slots = await this.slots.find(filter).lean();
    return slots.flatMap(slot => slot.bookings.map(booking => ({
      ...booking, siteId: slot.siteId, loanerNumber: slot.loanerNumber,
      loanerName: `GWM LOAN ${slot.loanerNumber}`,
    }))).sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  async reserve(dto: ReserveLoanerDto) {
    const start = new Date(dto.startAt).getTime();
    const end = new Date(dto.endAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= Date.now()) {
      throw new BadRequestException('Return time must be after the start time and in the future.');
    }
    if (!dto.customerName.trim() || !dto.customerMobile.trim()) {
      throw new BadRequestException('Customer name and mobile are required.');
    }
    const startAt = new Date(start).toISOString();
    const endAt = new Date(end).toISOString();
    const slot = { siteId: dto.siteId, loanerNumber: dto.loanerNumber };
    try {
      await this.slots.updateOne(slot, { $setOnInsert: { ...slot, bookings: [] } }, { upsert: true });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
    }
    const booking = {
      id: randomUUID(), customerName: dto.customerName.trim(), customerMobile: dto.customerMobile.trim(),
      startAt, endAt, status: 'RESERVED',
    };
    const result = await this.slots.updateOne({ ...slot, bookings: { $not: { $elemMatch: {
      status: { $in: ['RESERVED', 'ISSUED'] }, startAt: { $lt: endAt }, endAt: { $gt: startAt },
    } } } }, { $push: { bookings: booking } });
    if (!result.modifiedCount) throw new ConflictException('This loan vehicle is already reserved for those times.');
    return { ...booking, ...slot, loanerName: `GWM LOAN ${dto.loanerNumber}` };
  }

  async find(id: string) {
    const slot = await this.slots.findOne({ 'bookings.id': id }).lean();
    if (!slot) throw new NotFoundException('Reservation not found.');
    return { ...slot.bookings.find(b => b.id === id)!, siteId: slot.siteId, loanerNumber: slot.loanerNumber };
  }

  async cancel(id: string) {
    const result = await this.slots.updateOne({ bookings: { $elemMatch: { id, status: 'RESERVED' } } },
      { $set: { 'bookings.$.status': 'CANCELLED' } });
    if (!result.modifiedCount) throw new ConflictException('Only an unissued reservation can be cancelled.');
    return { success: true };
  }

  async claim(id: string, siteId: string, agreementId: string, rego: string, startAt: string, endAt: string) {
    const booking = await this.find(id);
    if (booking.siteId !== siteId || booking.startAt !== startAt || booking.endAt !== endAt) {
      throw new BadRequestException('Use the reserved site and booking times when issuing this loaner.');
    }
    const result = await this.slots.updateOne({ siteId, bookings: { $elemMatch: { id, status: 'RESERVED' } } },
      { $set: { 'bookings.$.status': 'ISSUED', 'bookings.$.agreementId': agreementId, 'bookings.$.rego': rego } });
    if (!result.modifiedCount) throw new ConflictException('This reservation has already been issued or cancelled.');
    return booking;
  }

  async releaseClaim(agreementId: string) {
    await this.slots.updateOne({ 'bookings.agreementId': agreementId }, {
      $set: { 'bookings.$.status': 'RESERVED' },
      $unset: { 'bookings.$.agreementId': '', 'bookings.$.rego': '' },
    });
  }

  async updateRego(agreementId: string, rego: string) {
    await this.slots.updateOne({ 'bookings.agreementId': agreementId }, { $set: { 'bookings.$.rego': rego } });
  }

  async complete(agreementId: string) {
    await this.slots.updateOne({ 'bookings.agreementId': agreementId }, { $set: { 'bookings.$.status': 'RETURNED' } });
  }
}
