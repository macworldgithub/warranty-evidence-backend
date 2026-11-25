jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));
jest.mock('./vehicle.service', () => ({ VehicleService: class {}, DecodeVinDto: class {}, DecodedVehicleResponseDto: class {} }));
jest.mock('./rego.service', () => ({ RegoService: class {} }));
import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { RegoService } from './rego.service';
import { VehicleService } from './vehicle.service';
import { VehicleController } from './vehicle.controller';
import { DecodeRegoDto } from './rego.dto';
const request = require('supertest');

describe('authenticated registration lookup', () => {
  const dto: DecodeRegoDto = { rego: 'ABC123', state: 'VIC' };
  it('does not contact InfoAgent for an invalid PWA session', async () => {
    const auth = { resolveUserFromAuthorization: jest.fn().mockRejectedValue(new UnauthorizedException()) };
    const rego = { decodeRego: jest.fn() };
    const controller = new VehicleController({} as never, rego as never, auth as never);
    await expect(controller.decodeRego(dto, 'Bearer invalid')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(rego.decodeRego).not.toHaveBeenCalled();
  });
  it('passes a verified session through to registration lookup', async () => {
    const auth = { resolveUserFromAuthorization: jest.fn().mockResolvedValue({ id: 'tech' }) };
    const rego = { decodeRego: jest.fn().mockResolvedValue({ ...dto, make: 'Honda' }) };
    const controller = new VehicleController({} as never, rego as never, auth as never);
    await expect(controller.decodeRego(dto, 'Bearer session')).resolves.toMatchObject({ make: 'Honda' });
    expect(auth.resolveUserFromAuthorization).toHaveBeenCalledWith('Bearer session');
    expect(rego.decodeRego).toHaveBeenCalledWith(dto);
  });
  it('also protects VIN lookup before it can contact the paid provider', async () => {
    const auth = { resolveUserFromAuthorization: jest.fn().mockRejectedValue(new UnauthorizedException()) };
    const vin = { decodeVin: jest.fn() };
    const controller = new VehicleController(vin as never, {} as never, auth as never);
    await expect(controller.decodeVin({ vin: '1HGCM82633A004352' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(vin.decodeVin).not.toHaveBeenCalled();
  });
});

describe('registered Warranty Rego HTTP route', () => {
  let app: any;
  const auth = { resolveUserFromAuthorization: jest.fn() };
  const rego = { decodeRego: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [VehicleController],
      providers: [
        { provide: VehicleService, useValue: {} },
        { provide: RegoService, useValue: rego },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
  afterAll(async () => { if (app) await app.close(); });
  beforeEach(() => {
    jest.clearAllMocks();
    auth.resolveUserFromAuthorization.mockRejectedValue(new UnauthorizedException());
  });
  it('registers POST /api/v1/vehicle/decode-rego and rejects an unauthenticated request before provider lookup', async () => {
    await request(app.getHttpServer()).post('/api/v1/vehicle/decode-rego')
      .send({ rego: '1GAT832', state: 'VIC' }).expect(401);
    expect(rego.decodeRego).not.toHaveBeenCalled();
  });
  it('validates and normalizes requests through the actual Nest HTTP route', async () => {
    auth.resolveUserFromAuthorization.mockResolvedValue({ id: 'test-tech' });
    rego.decodeRego.mockResolvedValue({ rego: '1GAT832', state: 'VIC', make: 'Ford' });
    const response = await request(app.getHttpServer()).post('/api/v1/vehicle/decode-rego')
      .set('Authorization', 'Bearer test-session').send({ rego: ' 1gat-832 ', state: ' vic ' }).expect(201);
    expect(auth.resolveUserFromAuthorization).toHaveBeenCalledWith('Bearer test-session');
    expect(rego.decodeRego).toHaveBeenCalledWith(expect.objectContaining({ rego: '1GAT832', state: 'VIC' }));
    expect(response.body).toMatchObject({ rego: '1GAT832', state: 'VIC', make: 'Ford' });
  });
});
