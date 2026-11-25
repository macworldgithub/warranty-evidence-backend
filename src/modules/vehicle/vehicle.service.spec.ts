jest.mock('@nestjs/axios', () => ({ HttpService: class {} }));
jest.mock('./infoagent.service', () => ({ InfoAgentService: class {} }));
import { Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { VehicleService } from './vehicle.service';

const vin = '1HGCM82633A004352';
const vehicle = { vin, make: 'HONDA', model: 'ACCORD', year: 2003, source: 'InfoAgent NEVDIS', warnings: ['Example warning'], registration: { status: 'REGISTERED' } };
describe('Warranty VIN lookup with InfoAgent', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  const setup = (lookupByVin = jest.fn().mockResolvedValue(vehicle), configured = true) => {
    const infoagent = { isConfigured: () => configured, lookupByVin };
    const http = { get: jest.fn(() => of({ data: { vehicle: { make: 'Honda', model: 'Accord', year: 2003 }, engine: { fuel_type: 'Gasoline' } } })) };
    return { infoagent, http, service: new VehicleService(http as never, infoagent as never) };
  };
  it('prefers InfoAgent and preserves its registration and risk metadata', async () => {
    const { service, http, infoagent } = setup();
    await expect(service.decodeVin({ vin })).resolves.toMatchObject({ ...vehicle, provider: 'InfoAgent NEVDIS', isValidCheckDigit: expect.any(Boolean), requiresManualConfirm: false });
    expect(infoagent.lookupByVin).toHaveBeenCalledWith({ vin });
    expect(http.get).not.toHaveBeenCalled();
  });
  it.each([null, { ...vehicle, vin: 'DIFFERENT' }])('uses the existing VIN decoder for no matching InfoAgent result', async result => {
    const { service, http } = setup(jest.fn().mockResolvedValue(result));
    await expect(service.decodeVin({ vin })).resolves.toMatchObject({ vin, make: 'Honda', model: 'Accord', powertrain: 'ICE', provider: 'mcp.vin (NHTSA vPIC)' });
    expect(http.get).toHaveBeenCalledTimes(1);
  });
  it('falls back on an InfoAgent provider failure', async () => {
    const { service } = setup(jest.fn().mockRejectedValue(new Error('provider failed')));
    await expect(service.decodeVin({ vin })).resolves.toMatchObject({ provider: 'mcp.vin (NHTSA vPIC)' });
  });
  it('retains existing behavior when InfoAgent is not configured', async () => {
    const { service, infoagent } = setup(jest.fn(), false);
    await expect(service.decodeVin({ vin })).resolves.toMatchObject({ provider: 'mcp.vin (NHTSA vPIC)' });
    expect(infoagent.lookupByVin).not.toHaveBeenCalled();
  });
  it('keeps missing InfoAgent values unknown instead of inventing year or powertrain', async () => {
    const { service } = setup(jest.fn().mockResolvedValue({ ...vehicle, year: null }));
    const result = await service.decodeVin({ vin });
    expect(result.year).toBeNull();
    expect(result.powertrain).toBeUndefined();
    expect(result.requiresManualConfirm).toBe(true);
  });
});
