import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { Site, SiteDocument } from '../../schemas/site.schema';
import { ReserveLoanerDto } from './dto/reserve-loaner.dto';

@Injectable()
export class LoanReservationsService implements OnModuleInit {
  constructor(@InjectModel(Site.name) private readonly sites: Model<SiteDocument>) {}

  async onModuleInit() {
    // Read an older deployment's slots only if that collection already exists.
    // Registering a Mongoose slot model would try to create another collection on Atlas.
    const db = this.sites.db.db;
    if (!db || !(await db.listCollections({ name: 'loan_reservation_slots' }).hasNext())) return;
    for await (const slot of db.collection('loan_reservation_slots').find()) {
      for (const booking of slot.bookings || []) {
        const { _id, ...fields } = booking;
        await this.sites.updateOne({ id: slot.siteId, 'loanReservations.id': { $ne: fields.id } },
          { $push: { loanReservations: { ...fields, loanerNumber: slot.loanerNumber } } });
      }
    }
  }

  async list(siteId?: string | string[]) {
    const filter = Array.isArray(siteId) ? { id: { $in: siteId } } : siteId ? { id: siteId } : {};
    const sites = await this.sites.find(filter).select({ id: 1, loanReservations: 1 }).lean();
    return sites.flatMap(site => (site.loanReservations || []).map(booking => ({
      ...booking, siteId: site.id, loanerName: `GWM LOAN ${booking.loanerNumber}`,
    }))).sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  async reserve(dto: ReserveLoanerDto) {
    const start = new Date(dto.startAt).getTime();
    const end = new Date(dto.endAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= Date.now()) {
      throw new BadRequestException('Return time must be after the start time and in the future.');
    }
    if (!Number.isInteger(dto.loanerNumber) || dto.loanerNumber < 1 || dto.loanerNumber > 6) {
      throw new BadRequestException('Choose a loan vehicle from 1 to 6.');
    }
    if (!dto.customerName?.trim() || !dto.customerMobile?.trim()) {
      throw new BadRequestException('Customer name and mobile are required.');
    }
    const booking = {
      id: randomUUID(), loanerNumber: dto.loanerNumber,
      customerName: dto.customerName.trim(), customerMobile: dto.customerMobile.trim(),
      startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString(), status: 'RESERVED',
    };
    // A site document already exists. The conditional push is atomic across all six loaners.
    const result = await this.sites.updateOne({ id: dto.siteId, loanReservations: { $not: { $elemMatch: {
      loanerNumber: dto.loanerNumber, status: { $in: ['RESERVED', 'ISSUED'] },
      startAt: { $lt: booking.endAt }, endAt: { $gt: booking.startAt },
    } } } }, { $push: { loanReservations: booking } }, { runValidators: true });
    if (!result.modifiedCount) {
      if (!await this.sites.exists({ id: dto.siteId })) throw new NotFoundException('Dealership site not found.');
      throw new ConflictException('This loan vehicle is already reserved for those times.');
    }
    return { ...booking, siteId: dto.siteId, loanerName: `GWM LOAN ${dto.loanerNumber}` };
  }

  async find(id: string) {
    const site = await this.sites.findOne({ 'loanReservations.id': id }).select({ id: 1, loanReservations: 1 }).lean();
    if (!site) throw new NotFoundException('Reservation not found.');
    return { ...site.loanReservations!.find(b => b.id === id)!, siteId: site.id };
  }

  async cancel(id: string) {
    const result = await this.sites.updateOne({ loanReservations: { $elemMatch: { id, status: 'RESERVED' } } },
      { $set: { 'loanReservations.$.status': 'CANCELLED' } });
    if (!result.modifiedCount) throw new ConflictException('Only an unissued reservation can be cancelled.');
    return { success: true };
  }

  async claim(id: string, siteId: string, agreementId: string, rego: string, startAt: string, endAt: string) {
    const booking = await this.find(id);
    if (booking.siteId !== siteId || booking.startAt !== startAt || booking.endAt !== endAt) {
      throw new BadRequestException('Use the reserved site and booking times when issuing this loaner.');
    }
    const result = await this.sites.updateOne({ id: siteId, loanReservations: { $elemMatch: { id, status: 'RESERVED' } } },
      { $set: { 'loanReservations.$.status': 'ISSUED', 'loanReservations.$.agreementId': agreementId, 'loanReservations.$.rego': rego } });
    if (!result.modifiedCount) throw new ConflictException('This reservation has already been issued or cancelled.');
    return booking;
  }

  async releaseClaim(agreementId: string) {
    await this.sites.updateOne({ 'loanReservations.agreementId': agreementId }, {
      $set: { 'loanReservations.$.status': 'RESERVED' },
      $unset: { 'loanReservations.$.agreementId': '', 'loanReservations.$.rego': '' },
    });
  }

  async updateRego(agreementId: string, rego: string) {
    await this.sites.updateOne({ 'loanReservations.agreementId': agreementId }, { $set: { 'loanReservations.$.rego': rego } });
  }

  async complete(agreementId: string) {
    await this.sites.updateOne({ 'loanReservations.agreementId': agreementId }, { $set: { 'loanReservations.$.status': 'RETURNED' } });
  }
}
