jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));
jest.mock('./vehicle.service', () => ({ VehicleService: class {}, DecodeVinDto: class {}, DecodedVehicleResponseDto: class {} }));
jest.mock('./rego.service', () => ({ RegoService: class {} }));
import { UnauthorizedException } from '@nestjs/common';
import { VehicleController } from './vehicle.controller';
import { DecodeRegoDto } from './rego.dto';

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
