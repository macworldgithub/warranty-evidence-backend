jest.mock('./infoagent.service', () => ({ InfoAgentService: class {} }));
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { DecodeRegoDto } from './rego.dto';
import { RegoService } from './rego.service';

const dto: DecodeRegoDto = { rego: 'TEST01', state: 'VIC' };
const vehicle = { ...dto, vin: '6T9P01V97PANA4001', make: 'FORD', model: 'TEST', year: 2023, source: 'InfoAgent NEVDIS', registration: { status: 'REGISTERED' }, warnings: [] };

describe('Warranty registration adapter', () => {
  it('validates state and plate and normalizes spaces, hyphens and case', async () => {
    const input = plainToInstance(DecodeRegoDto, { rego: ' test-01 ', state: ' vic ' });
    expect(input).toMatchObject(dto);
    expect(await validate(input)).toHaveLength(0);
    for (const invalid of [{ rego: '', state: 'VIC' }, { rego: 'ABCDEFGHIJ', state: 'VIC' }, { rego: '<plate>', state: 'VIC' }, { rego: 'ABC123', state: 'XX' }]) {
      expect((await validate(plainToInstance(DecodeRegoDto, invalid))).length).toBeGreaterThan(0);
    }
  });
  it('preserves normalized NEVDIS fields and adds Warranty lookup metadata', async () => {
    const infoagent = { lookupVehicle: jest.fn().mockResolvedValue(vehicle) };
    const service = new RegoService(infoagent as never);
    await expect(service.decodeRego(dto)).resolves.toEqual({ ...vehicle, provider: 'InfoAgent NEVDIS', requiresManualConfirm: false });
    expect(infoagent.lookupVehicle).toHaveBeenCalledWith(dto);
  });
  it('maps the shared client no-result response to 404', async () => {
    const service = new RegoService({ lookupVehicle: async () => null } as never);
    await expect(service.decodeRego(dto)).rejects.toThrow(NotFoundException);
  });
  it.each([{ ...vehicle, rego: 'OTHER' }, { ...vehicle, state: 'NSW' }])('rejects a different plate or state', async report => {
    const service = new RegoService({ lookupVehicle: async () => report } as never);
    await expect(service.decodeRego(dto)).rejects.toThrow(BadGatewayException);
  });
  it('requires manual confirmation when a VIN or identity details are missing', async () => {
    const service = new RegoService({ lookupVehicle: async () => ({ ...vehicle, vin: 'INVALID', year: null }) } as never);
    await expect(service.decodeRego(dto)).resolves.toMatchObject({ vin: undefined, year: null, requiresManualConfirm: true });
  });
});
