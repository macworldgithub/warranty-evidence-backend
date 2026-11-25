jest.mock('@nestjs/config', () => ({
  ConfigService: class {
    constructor(private readonly values: Record<string, string>) {}
    get(key: string) { return this.values[key]; }
  },
}));
import { BadGatewayException, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfoAgentService, normalizeInfoAgentResponse } from './infoagent.service';

// Same NEVDIS shape used in Sales Floor's test/infoagent.test.js.
const vehicle = {
  identification: { plate: 'TEST01', state: 'VIC', vin: '6T9P01V97PANA4001' },
  extendedData: { makeDescription: 'FORD', modelDescription: 'TEST', bodyType: 'SEDAN', colour: 'WHITE', engineNumber: 'ENG123456' },
  vehicleAge: { yearOfManufacture: 2023, compliancePlate: '03/2023' },
  registration: { status: 'REGISTERED', expiryDate: '2027-03-13' },
  stolenInfo: { isStolen: false, incidents: [] },
  writtenOffInfo: { isWrittenOff: false, incidents: [] },
};
const raw = { result: { responseCode: 'SUCCESS', vehicles: [vehicle] } };
const normalized = {
  rego: 'TEST01', state: 'VIC', vin: '6T9P01V97PANA4001', make: 'FORD', model: 'TEST', year: 2023,
  compliancePlate: '03/2023', bodyType: 'SEDAN', vehicleType: '', colour: 'WHITE', engineNumber: 'ENG123456',
  registration: { status: 'REGISTERED', expiryDate: '2027-03-13' },
  riskFlags: { isStolen: false, isWrittenOff: false, stolenIncidents: [], writtenOffIncidents: [] },
  warnings: [], source: 'InfoAgent NEVDIS',
};
const token = { access_token: 'private-provider-token', expires_in: 3600 };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const products = ['VEHICLE_AGE', 'EXTENDED_DATA', 'HIGH_PERFORMANCE_INFO', 'REGISTRATION', 'STOLEN_INFO', 'WRITTEN_OFF_INFO'];

describe('Sales Floor-compatible InfoAgent NEVDIS client', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  let service: InfoAgentService;
  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    service = new InfoAgentService(new ConfigService({ INFOAGENT_CLIENT_ID: 'test-client', INFOAGENT_CLIENT_SECRET: 'private-test-secret' }));
  });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  it('uses Basic OAuth authentication and the same NEVDIS plate/state/products request as Sales Floor', async () => {
    fetchMock.mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response(raw));
    await expect(service.lookupVehicle({ rego: ' test01 ', state: ' vic ' })).resolves.toEqual(normalized);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.dev.infoagent.com.au/auth/v1/token/oauth');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'POST', body: 'grant_type=client_credentials',
      headers: { Authorization: 'Basic ' + Buffer.from('test-client:private-test-secret').toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.dev.infoagent.com.au/nevdis/v1/vehicle-report');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST', body: JSON.stringify({ plate: 'TEST01', state: 'VIC', products }),
      headers: { Authorization: 'Bearer private-provider-token' }, redirect: 'error',
    });
  });

  it('supports the same VIN request and shares its token with plate lookups', async () => {
    fetchMock.mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response(raw)).mockResolvedValueOnce(response(raw));
    await service.lookupVehicle({ rego: 'TEST01' });
    await service.lookupByVin({ vin: ' 6t9p01v97pana4001 ' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1]!.body).toBe(JSON.stringify({ vin: '6T9P01V97PANA4001', products }));
  });

  it('reuses a valid token and renews it inside the 60-second expiry window', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    fetchMock.mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response(raw))
      .mockResolvedValueOnce(response(raw)).mockResolvedValueOnce(response({ ...token, access_token: 'renewed' })).mockResolvedValueOnce(response(raw));
    await service.lookupVehicle({ rego: 'TEST01' });
    await service.lookupByVin({ vin: vehicle.identification.vin });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    jest.setSystemTime(Date.now() + 3550000);
    await service.lookupVehicle({ rego: 'TEST01' });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[4][1]!.headers).toMatchObject({ Authorization: 'Bearer renewed' });
  });

  it('supports the legacy token property and default one-hour lifetime from Sales Floor', async () => {
    fetchMock.mockResolvedValueOnce(response({ token: 'alternate-token' })).mockResolvedValueOnce(response(raw)).mockResolvedValueOnce(response(raw));
    await service.lookupVehicle({ rego: 'TEST01' });
    await service.lookupVehicle({ rego: 'TEST01' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1]!.headers).toMatchObject({ Authorization: 'Bearer alternate-token' });
  });

  it('coalesces identical reports and concurrent token requests for different identifiers', async () => {
    fetchMock.mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response(raw)).mockResolvedValueOnce(response(raw));
    const results = await Promise.all([
      service.lookupVehicle({ rego: 'TEST01' }), service.lookupVehicle({ rego: 'TEST01' }),
      service.lookupByVin({ vin: vehicle.identification.vin }),
    ]);
    expect(results).toEqual([normalized, normalized, normalized]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('uses configured auth/base URLs and the same configurable timeout for both requests', async () => {
    const timeouts = jest.spyOn(AbortSignal, 'timeout');
    service = new InfoAgentService(new ConfigService({ INFOAGENT_CLIENT_ID: 'id', INFOAGENT_CLIENT_SECRET: 'secret', INFOAGENT_BASE_URL: 'https://reports.example.test/', INFOAGENT_AUTH_URL: 'https://auth.example.test/token/', INFOAGENT_TIMEOUT_MS: '2500' }));
    fetchMock.mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response(raw));
    await service.lookupVehicle({ rego: 'TEST01' });
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['https://auth.example.test/token', 'https://reports.example.test/nevdis/v1/vehicle-report']);
    expect(timeouts.mock.calls).toEqual([[2500], [2500]]);
  });

  it('refreshes a rejected bearer token once', async () => {
    fetchMock.mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ ...token, access_token: 'renewed' })).mockResolvedValueOnce(response(raw));
    await expect(service.lookupVehicle({ rego: 'TEST01' })).resolves.toEqual(normalized);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('stops after a second 401 and returns a provider failure rather than a PWA session error', async () => {
    fetchMock.mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response({}, 401));
    await expect(service.lookupVehicle({ rego: 'TEST01' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it.each([400, 403, 404, 422, 429, 500])('sanitizes report failures with status %s', async status => {
    fetchMock.mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response({ message: 'private-provider-token private-test-secret' }, status));
    const error = await service.lookupVehicle({ rego: 'TEST01' }).catch(error => error);
    expect(error).toBeInstanceOf(status === 404 ? NotFoundException : status === 400 || status === 422 ? BadRequestException : ServiceUnavailableException);
    expect(JSON.stringify(error.getResponse())).not.toMatch(/private-provider-token|private-test-secret/);
  });

  it('rejects missing configuration without contacting InfoAgent', async () => {
    service = new InfoAgentService(new ConfigService({}));
    expect(service.isConfigured()).toBe(false);
    await expect(service.lookupVehicle({ rego: 'TEST01' })).rejects.toThrow(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([{ error: 'private-test-secret' }, { access_token: 'private-provider-token', expires_in: -1 }, {}])('rejects authentication failures without exposing credentials', async data => {
    fetchMock.mockResolvedValueOnce(response(data));
    const error = await service.lookupVehicle({ rego: 'TEST01' }).catch(error => error);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(JSON.stringify(error.getResponse())).not.toMatch(/private-provider-token|private-test-secret/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('allows retry after a network timeout without losing its valid token', async () => {
    fetchMock.mockResolvedValueOnce(response(token)).mockRejectedValueOnce(new Error('private-provider-token')).mockResolvedValueOnce(response(raw));
    await expect(service.lookupVehicle({ rego: 'TEST01' })).rejects.toThrow(ServiceUnavailableException);
    await expect(service.lookupVehicle({ rego: 'TEST01' })).resolves.toEqual(normalized);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejects malformed JSON', async () => {
    fetchMock.mockResolvedValueOnce(response(token)).mockResolvedValueOnce(new Response('{'));
    await expect(service.lookupVehicle({ rego: 'TEST01' })).rejects.toThrow(BadGatewayException);
  });
});

describe('Sales Floor NEVDIS normalization', () => {
  it('maps the reference identification, extended data, age, registration and risk fields', () => {
    expect(normalizeInfoAgentResponse(raw, 'TEST01', 'VIC')).toEqual(normalized);
  });
  it('preserves stolen and written-off incidents and the same warning messages', () => {
    const result = normalizeInfoAgentResponse({ result: { responseCode: 'SUCCESS', vehicles: [{
      ...vehicle, registration: { status: 'expired' },
      stolenInfo: { incidents: [{ jurisdiction: 'NSW' }] },
      writtenOffInfo: { incidents: [{ writtenOffCode: 'STATUTORY' }] },
    }] } });
    expect(result?.riskFlags).toEqual({ isStolen: true, isWrittenOff: true, stolenIncidents: [{ jurisdiction: 'NSW' }], writtenOffIncidents: [{ writtenOffCode: 'STATUTORY' }] });
    expect(result?.warnings).toEqual([
      'WRITTEN-OFF ALERT: Vehicle recorded on WOVR register (STATUTORY)',
      'POLICE STOLEN ALERT: Vehicle reported stolen in jurisdiction NSW',
      'REGISTRATION ALERT: Vehicle registration is EXPIRED',
    ]);
  });
  it.each([null, {}, { result: { responseCode: 'VEHICLE_NOT_FOUND' } }, { result: { responseCode: 'SUCCESS', vehicles: [] } }])('returns null for no result, matching Sales Floor', raw => {
    expect(normalizeInfoAgentResponse(raw)).toBeNull();
  });
  it('uses requested identifiers, make/model codes and empty-field defaults like Sales Floor', () => {
    const result = normalizeInfoAgentResponse({ result: { responseCode: 'SUCCESS', vehicles: [{ extendedData: { makeCode: 'FORD', modelCode: 'TEST' } }] } }, 'test01', 'nsw');
    expect(result).toMatchObject({ rego: 'TEST01', state: 'NSW', make: 'FORD', model: 'TEST', vin: '', year: null, registration: { status: 'UNKNOWN', expiryDate: null }, warnings: [] });
    expect(result).not.toHaveProperty('powertrain');
  });
});
