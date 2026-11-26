import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLoanAgreementDto } from './dto/create-loan-agreement.dto';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ index: jest.fn() }) },
}));
jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));
jest.mock('./loan-agreement-pdf.service', () => ({ LoanAgreementPdfService: class {} }));

import { LoanAgreementsController } from './loan-agreements.controller';
import { LoanAgreementsService } from './loan-agreements.service';

const dto = {
  siteId: 'clerk-site', siteName: 'Assigned Rooftop', purpose: 'SERVICE_LOANER',
  customer: { name: 'Customer', dob: '1990-04-20', mobile: '0412345678', email: 'customer@example.com',
    residentialAddress: '1 Example St', licenceNumber: '12345678', licenceState: 'VIC', licenceExpiry: '2030-04-20', licenceSighted: true },
  vehicle: { rego: 'ABC123', vin: '1HGCM82633A004352', make: 'Honda', model: 'Accord', year: 2003 },
  dueBackDateTime: '2030-05-01T17:00:00Z', securityDepositHeld: 0, depositPaymentMethod: 'NONE',
  outbound: { odometerOut: 0, fuelLevelOutPercent: 0, photos: {
    front: 'data:image/jpeg;base64,front', rear: 'data:image/jpeg;base64,rear',
    driverSide: 'data:image/jpeg;base64,driver', passengerSide: 'data:image/jpeg;base64,passenger',
    odometerDash: 'data:image/jpeg;base64,odometer',
  } },
};

describe('Warranty Clerk loan handover', () => {
  it('allows clerks to list, create and cancel bookings only at their assigned rooftops', async () => {
    const staff = { id: 'clerk', role: 'CLERK', authorizedSiteIds: ['clerk-site'] };
    const reservations = {
      list: jest.fn(async () => []), reserve: jest.fn(async () => ({ id: 'booking' })),
      find: jest.fn(async () => ({ id: 'booking', siteId: 'clerk-site' })),
      cancel: jest.fn(async () => ({ success: true })),
    };
    const controller = new LoanAgreementsController({} as never, reservations as never,
      { resolveUserFromAuthorization: async () => staff } as never);
    await controller.listReservations('all', 'Bearer clerk-session');
    expect(reservations.list).toHaveBeenCalledWith(['clerk-site']);
    const booking = { siteId: 'clerk-site', loanerNumber: 1, customerName: 'Customer', customerMobile: '0412345678', rego: 'TBA', startAt: '2030-05-01T09:00:00Z', endAt: '2030-05-01T17:00:00Z' };
    await expect(controller.reserveLoaner(booking, 'Bearer clerk-session')).resolves.toEqual({ id: 'booking' });
    await expect(controller.cancelReservation('booking', 'Bearer clerk-session')).resolves.toEqual({ success: true });
    await expect(controller.reserveLoaner({ ...booking, siteId: 'other-site' }, 'Bearer clerk-session')).rejects.toThrow('outside your assigned sites');
    await expect(controller.listReservations('other-site', 'Bearer clerk-session')).rejects.toThrow('outside your assigned sites');
    reservations.find.mockResolvedValue({ id: 'booking', siteId: 'other-site' });
    await expect(controller.cancelReservation('booking', 'Bearer clerk-session')).rejects.toThrow('outside your assigned sites');
    expect(reservations.reserve).toHaveBeenCalledTimes(1);
    expect(reservations.cancel).toHaveBeenCalledTimes(1);
  });

  it('does not give unassigned clerks access to a fallback dealership', async () => {
    const service = { issueAgreement: jest.fn() };
    const reservations = { list: jest.fn(async () => []) };
    const controller = new LoanAgreementsController(service as never, reservations as never,
      { resolveUserFromAuthorization: async () => ({ id: 'clerk', role: 'CLERK', authorizedSiteIds: [] }) } as never);
    await controller.listReservations('all', 'Bearer clerk-session');
    expect(reservations.list).toHaveBeenCalledWith([]);
    await expect(controller.issueAgreement({ ...dto, siteId: 'site_cranbourne_byd' }, 'Bearer clerk-session')).rejects.toThrow('outside your assigned sites');
    expect(service.issueAgreement).not.toHaveBeenCalled();
  });

  it('retains all five condition photos through production whitelist validation', async () => {
    const input = plainToInstance(CreateLoanAgreementDto, dto);
    expect(await validate(input, { whitelist: true })).toHaveLength(0);
    expect(input.outbound.photos).toEqual(dto.outbound.photos);
  });

  it('allows a clerk to issue and sign at an assigned rooftop using their authenticated session', async () => {
    const staff = { id: 'clerk', name: 'Warranty Clerk', role: 'CLERK', authorizedSiteIds: ['clerk-site'] };
    const service = { issueAgreement: jest.fn(async () => ({ id: 'draft' })),
      findById: jest.fn(async () => ({ id: 'draft', siteId: 'clerk-site' })), signAgreement: jest.fn(async () => ({ id: 'draft', status: 'ACTIVE' })) };
    const controller = new LoanAgreementsController(service as never, {} as never, { resolveUserFromAuthorization: async () => staff } as never);
    await expect(controller.issueAgreement(dto, 'Bearer clerk-session')).resolves.toEqual({ id: 'draft' });
    expect(service.issueAgreement).toHaveBeenCalledWith(dto, staff);
    const signature = { borrowerSignatureDataUrl: 'data:image/png;base64,drawn', readAndAgreed: true, electronicConsent: true, privacyNoticeAcknowledged: true };
    await expect(controller.signAgreement('draft', signature, 'Bearer clerk-session')).resolves.toMatchObject({ status: 'ACTIVE' });
    expect(service.signAgreement).toHaveBeenCalledWith('draft', signature);
    await expect(controller.issueAgreement({ ...dto, siteId: 'other-site' }, 'Bearer clerk-session')).rejects.toThrow('outside your assigned sites');
    service.findById.mockResolvedValue({ id: 'draft', siteId: 'other-site' });
    await expect(controller.signAgreement('draft', signature, 'Bearer clerk-session')).rejects.toThrow('outside your assigned sites');
  });

  it('saves real condition photos, zero fuel and zero deposit with authenticated staff details', async () => {
    const model: any = jest.fn().mockImplementation(data => ({ save: async () => ({ toObject: () => data }) }));
    model.countDocuments = async () => 0;
    const service = new LoanAgreementsService(model, {} as never, {} as never);
    const agreement = await service.issueAgreement(dto, { id: 'clerk', name: 'Warranty Clerk' });
    expect(agreement).toMatchObject({ status: 'DRAFT', securityDepositHeld: 0, depositPaymentMethod: 'NONE',
      outbound: { odometerOut: 0, fuelLevelOutPercent: 0, photos: dto.outbound.photos, issuedByStaffId: 'clerk', issuedByStaffName: 'Warranty Clerk' } });
  });

  it('preserves unsigned drafts in loan lists and excludes them from vehicles out and overdue KPIs', async () => {
    const draft = { id: 'draft', siteId: 'clerk-site', status: 'DRAFT', dueBackDateTime: '2020-01-01' };
    const query = { lean: async () => [draft], sort: () => ({ lean: async () => [draft] }) };
    const model: any = { find: () => query };
    const service = new LoanAgreementsService(model, {} as never, {} as never);
    expect(await service.findAll('clerk-site')).toEqual([draft]);
    expect(await service.getKpis('clerk-site')).toMatchObject({ outNow: 0, overdue: 0, dueSoon: 0 });
  });
});
