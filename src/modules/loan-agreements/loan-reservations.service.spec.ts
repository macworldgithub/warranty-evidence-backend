import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoanReservationsService, LoanReservationSlotSchema } from './loan-reservations.service';
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
    const model = {
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ siteId: 'gwm', loanerNumber: 1, bookings: [{ ...dto, id: 'booking', status: 'RESERVED' }] }) }),
    };
    return { model, service: new LoanReservationsService(model as never) };
  }
  it('reserves a named slot without a registration or VIN', async () => {
    const { model, service } = setup();
    const booking = await service.reserve(dto);
    expect(booking).toMatchObject({ loanerName: 'GWM LOAN 1', status: 'RESERVED', startAt, endAt });
    expect(booking).not.toHaveProperty('rego');
    expect(model.updateOne).toHaveBeenLastCalledWith({ siteId: 'gwm', loanerNumber: 1, bookings: { $not: { $elemMatch: {
      status: { $in: ['RESERVED', 'ISSUED'] }, startAt: { $lt: endAt }, endAt: { $gt: startAt },
    } } } }, { $push: { bookings: expect.objectContaining({ id: expect.any(String) }) } });
  });
  it('has a unique site/slot index to protect concurrent first bookings', () => {
    expect(LoanReservationSlotSchema.index).toHaveBeenCalledWith({ siteId: 1, loanerNumber: 1 }, { unique: true });
  });
  it('reports a conflict when the atomic overlap check fails', async () => {
    const { model, service } = setup();
    model.updateOne.mockResolvedValueOnce({ modifiedCount: 0 }).mockResolvedValueOnce({ modifiedCount: 0 });
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
    expect(model.find).toHaveBeenCalledWith({ siteId: { $in: ['gwm'] } });
    await service.list([]);
    expect(model.find).toHaveBeenLastCalledWith({ siteId: { $in: [] } });
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
    expect(model.updateOne).toHaveBeenCalledWith({ siteId: 'gwm', bookings: { $elemMatch: { id: 'booking', status: 'RESERVED' } } }, {
      $set: { 'bookings.$.status': 'ISSUED', 'bookings.$.agreementId': 'agreement', 'bookings.$.rego': 'ABC123' },
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
    model.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(service.find('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
