import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoanReservationsService } from './loan-reservations.service';
import { ReserveLoanerDto } from './dto/reserve-loaner.dto';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ index: jest.fn() }) },
}));

describe('loan vehicle reservations', () => {
  const startAt = '2030-01-01T09:00:00.000Z';
  const endAt = '2030-01-01T17:00:00.000Z';
  const dto = { siteId: 'gwm', loanerNumber: 1, customerName: 'Customer', customerMobile: '0412345678', startAt, endAt };
  function setup() {
    const record = { id: 'gwm', loanReservations: [{ ...dto, id: 'booking', status: 'RESERVED' }] };
    const query = (value: unknown) => ({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(value) }) });
    const model = {
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      exists: jest.fn().mockResolvedValue({ id: 'gwm' }),
      find: jest.fn().mockReturnValue(query([])),
      findOne: jest.fn().mockReturnValue(query(record)),
      db: { db: { listCollections: jest.fn(() => ({ hasNext: async () => false })) } },
    };
    return { model, service: new LoanReservationsService(model as never) };
  }
  it('reserves a named slot without a registration or VIN', async () => {
    const { model, service } = setup();
    const booking = await service.reserve(dto);
    expect(booking).toMatchObject({ loanerName: 'GWM LOAN 1', status: 'RESERVED', startAt, endAt });
    expect(booking).not.toHaveProperty('rego');
    expect(model.updateOne).toHaveBeenLastCalledWith({ id: 'gwm', loanReservations: { $not: { $elemMatch: {
      loanerNumber: 1, status: { $in: ['RESERVED', 'ISSUED'] }, startAt: { $lt: endAt }, endAt: { $gt: startAt },
    } } } }, { $push: { loanReservations: expect.objectContaining({ id: expect.any(String) }) } }, { runValidators: true });
  });
  it('uses the existing sites collection without creating a slot collection', async () => {
    const { model, service } = setup();
    await service.onModuleInit();
    expect(model.db.db.listCollections).toHaveBeenCalledWith({ name: 'loan_reservation_slots' });
    expect(model.updateOne).not.toHaveBeenCalled();
  });
  it('reports a conflict when the atomic overlap check fails', async () => {
    const { model, service } = setup();
    model.updateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(service.reserve(dto)).rejects.toBeInstanceOf(ConflictException);
  });
  it('rejects invalid, reversed and expired booking times before writing', async () => {
    const { model, service } = setup();
    for (const times of [{ startAt: 'invalid' }, { endAt: startAt }, { startAt: endAt }, { startAt: '2020-01-01', endAt: '2020-01-02' }]) {
      await expect(service.reserve({ ...dto, ...times })).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(model.updateOne).not.toHaveBeenCalled();
  });
  it('validates all six slots and rejects out-of-range and fractional slot numbers', async () => {
    for (const loanerNumber of [1, 2, 3, 4, 5, 6]) {
      expect(await validate(plainToInstance(ReserveLoanerDto, { ...dto, loanerNumber }))).toHaveLength(0);
    }
    for (const loanerNumber of [0, 7, 1.5]) {
      expect((await validate(plainToInstance(ReserveLoanerDto, { ...dto, loanerNumber }))).length).toBeGreaterThan(0);
    }
  });
  it('scopes reservation reads to authorized sites', async () => {
    const { model, service } = setup();
    await service.list(['gwm']);
    expect(model.find).toHaveBeenCalledWith({ id: { $in: ['gwm'] } });
    await service.list([]);
    expect(model.find).toHaveBeenLastCalledWith({ id: { $in: [] } });
  });
  it('prevents claiming a reservation for another site or altered times', async () => {
    const { model, service } = setup();
    await expect(service.claim('booking', 'other', 'agreement', 'ABC123', startAt, endAt)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.claim('booking', 'gwm', 'agreement', 'ABC123', endAt, endAt)).rejects.toBeInstanceOf(BadRequestException);
    expect(model.updateOne).not.toHaveBeenCalled();
  });
  it('records actual registration at handover and prevents a second issue', async () => {
    const { model, service } = setup();
    await service.claim('booking', 'gwm', 'agreement', 'ABC123', startAt, endAt);
    expect(model.updateOne).toHaveBeenCalledWith({ id: 'gwm', loanReservations: { $elemMatch: { id: 'booking', status: 'RESERVED' } } }, {
      $set: { 'loanReservations.$.status': 'ISSUED', 'loanReservations.$.agreementId': 'agreement', 'loanReservations.$.rego': 'ABC123' },
    });
    model.updateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(service.claim('booking', 'gwm', 'agreement2', 'ABC123', startAt, endAt)).rejects.toBeInstanceOf(ConflictException);
  });
  it('does not cancel an issued or already cancelled booking', async () => {
    const { model, service } = setup();
    model.updateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(service.cancel('booking')).rejects.toBeInstanceOf(ConflictException);
  });
  it('returns 404 for unknown reservations', async () => {
    const { model, service } = setup();
    model.findOne.mockReturnValue({ select: () => ({ lean: jest.fn().mockResolvedValue(null) }) });
    await expect(service.find('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('returns 404 when a reservation names a nonexistent site', async () => {
    const { model, service } = setup();
    model.updateOne.mockResolvedValue({ modifiedCount: 0 });
    model.exists.mockResolvedValue(null as never);
    await expect(service.reserve(dto)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('migrates legacy reservations once without creating a new site or deleting history', async () => {
    const { model, service } = setup();
    model.db.db.listCollections.mockReturnValue({ hasNext: async () => true });
    const legacy = [{ siteId: 'gwm', loanerNumber: 2, bookings: [{ id: 'old-booking', status: 'RESERVED' }] }];
    Object.assign(model.db.db, { collection: () => ({ find: async function* () { yield* legacy; } }) });
    await service.onModuleInit();
    expect(model.updateOne).toHaveBeenCalledWith({ id: 'gwm', 'loanReservations.id': { $ne: 'old-booking' } }, {
      $push: { loanReservations: { id: 'old-booking', status: 'RESERVED', loanerNumber: 2 } },
    });
  });

});
