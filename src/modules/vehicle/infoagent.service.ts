import { BadGatewayException, BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_BASE_URL = 'https://api.dev.infoagent.com.au';
const DEFAULT_AUTH_URL = DEFAULT_BASE_URL + '/auth/v1/token/oauth';
const REPORT_PATH = '/nevdis/v1/vehicle-report';
// Same products as booran-sales-floor-backend/lib/infoagent.js.
const PRODUCTS = ['VEHICLE_AGE', 'EXTENDED_DATA', 'HIGH_PERFORMANCE_INFO', 'REGISTRATION', 'STOLEN_INFO', 'WRITTEN_OFF_INFO'];

export interface InfoAgentVehicle {
  rego: string;
  state: string;
  vin: string;
  make: string;
  model: string;
  year: number | null;
  compliancePlate: string | null;
  bodyType: string;
  vehicleType: string;
  colour: string;
  engineNumber: string;
  registration: { status: string; expiryDate: string | null };
  riskFlags: { isStolen: boolean; isWrittenOff: boolean; stolenIncidents: Record<string, unknown>[]; writtenOffIncidents: Record<string, unknown>[] };
  warnings: string[];
  source: 'InfoAgent NEVDIS';
}

/** Mirrors Sales Floor's NEVDIS response contract, including its no-result semantics. */
export function normalizeInfoAgentResponse(raw: any, requestedPlate?: string, requestedState?: string): InfoAgentVehicle | null {
  if (!raw?.result || raw.result.responseCode !== 'SUCCESS') return null;
  const vehicle = raw.result.vehicles?.[0];
  if (!vehicle || typeof vehicle !== 'object') return null;
  const ident = vehicle.identification || {};
  const ext = vehicle.extendedData || {};
  const age = vehicle.vehicleAge || {};
  const rego = vehicle.registration || {};
  const stolen = vehicle.stolenInfo || {};
  const wovr = vehicle.writtenOffInfo || {};
  const stolenIncidents = Array.isArray(stolen.incidents) ? stolen.incidents : [];
  const writtenOffIncidents = Array.isArray(wovr.incidents) ? wovr.incidents : [];
  const isStolen = stolenIncidents.length > 0 || Boolean(stolen.isStolen);
  const isWrittenOff = writtenOffIncidents.length > 0 || Boolean(wovr.isWrittenOff);
  const warnings: string[] = [];
  if (isWrittenOff) {
    const code = writtenOffIncidents[0]?.writtenOffCode || 'RECORDED_ON_WOVR';
    warnings.push(`WRITTEN-OFF ALERT: Vehicle recorded on WOVR register (${code})`);
  }
  if (isStolen) {
    const jurisdiction = stolenIncidents[0]?.jurisdiction || ident.state || 'AU';
    warnings.push(`POLICE STOLEN ALERT: Vehicle reported stolen in jurisdiction ${jurisdiction}`);
  }
  const registrationStatus = String(rego.status || '').toUpperCase() || 'UNKNOWN';
  if (registrationStatus.includes('EXPIRED') || registrationStatus.includes('UNREGISTERED')) {
    warnings.push(`REGISTRATION ALERT: Vehicle registration is ${registrationStatus}`);
  }
  return {
    rego: (ident.plate || requestedPlate || '').toUpperCase(),
    state: (ident.state || requestedState || 'VIC').toUpperCase(),
    vin: (ident.vin || '').toUpperCase(),
    make: (ext.makeDescription || ext.makeCode || '').trim(),
    model: (ext.modelDescription || ext.modelCode || '').trim(),
    year: typeof age.yearOfManufacture === 'number' ? age.yearOfManufacture : null,
    compliancePlate: age.compliancePlate || null,
    bodyType: ext.bodyType || '', vehicleType: ext.vehicleType || '',
    colour: ext.colour || '', engineNumber: ext.engineNumber || '',
    registration: { status: registrationStatus, expiryDate: rego.expiryDate || null },
    riskFlags: { isStolen, isWrittenOff, stolenIncidents, writtenOffIncidents },
    warnings, source: 'InfoAgent NEVDIS',
  };
}

@Injectable()
export class InfoAgentService {
  private token?: { value: string; expiresAt: number };
  private tokenRequest?: Promise<string>;
  private readonly pending = new Map<string, Promise<InfoAgentVehicle | null>>();

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('INFOAGENT_CLIENT_ID') && this.config.get<string>('INFOAGENT_CLIENT_SECRET'));
  }

  private endpoint(value: string): string {
    const url = new URL(value.replace(/\/+$/, ''));
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new ServiceUnavailableException('InfoAgent configuration is invalid.');
    }
    return url.href.replace(/\/+$/, '');
  }

  private timeoutMs(): number {
    const value = Number.parseInt(this.config.get<string>('INFOAGENT_TIMEOUT_MS') || '10000', 10);
    return Number.isFinite(value) && value > 0 ? value : 10000;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60000) return this.token.value;
    if (this.tokenRequest) return this.tokenRequest;
    this.tokenRequest = this.obtainToken();
    try { return await this.tokenRequest; }
    finally { this.tokenRequest = undefined; }
  }

  private async obtainToken(): Promise<string> {
    if (!this.isConfigured()) throw new ServiceUnavailableException('InfoAgent credentials are not configured.');
    const clientId = this.config.get<string>('INFOAGENT_CLIENT_ID');
    const clientSecret = this.config.get<string>('INFOAGENT_CLIENT_SECRET');
    const now = Date.now();
    try {
      const authUrl = this.endpoint(this.config.get<string>('INFOAGENT_AUTH_URL') || DEFAULT_AUTH_URL);
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json',
        },
        body: 'grant_type=client_credentials', signal: AbortSignal.timeout(this.timeoutMs()), redirect: 'error',
      });
      if (!response.ok) throw new Error('Token rejected');
      const data = await response.json();
      const token = data.access_token || data.token;
      const lifetime = Number(data.expires_in || 3600);
      if (typeof token !== 'string' || !token || !Number.isFinite(lifetime) || lifetime <= 0) throw new Error('Invalid token');
      this.token = { value: token, expiresAt: now + lifetime * 1000 };
      return token;
    } catch {
      // Unlike a raw provider error, this can safely be returned to Warranty clients.
      throw new ServiceUnavailableException('InfoAgent authentication failed. Please contact your administrator.');
    }
  }

  lookupVehicle({ rego, state = 'VIC' }: { rego: string; state?: string }): Promise<InfoAgentVehicle | null> {
    const plate = rego.trim().toUpperCase();
    const jurisdiction = state.trim().toUpperCase();
    return this.report({ plate, state: jurisdiction }, plate, jurisdiction);
  }

  lookupByVin({ vin }: { vin: string }): Promise<InfoAgentVehicle | null> {
    return this.report({ vin: vin.trim().toUpperCase() });
  }

  private async report(identifier: { plate: string; state: string } | { vin: string }, plate?: string, state?: string): Promise<InfoAgentVehicle | null> {
    const key = JSON.stringify(identifier);
    const existing = this.pending.get(key);
    if (existing) return existing;
    const request = this.requestReport(identifier, plate, state);
    this.pending.set(key, request);
    try { return await request; }
    finally { this.pending.delete(key); }
  }

  private async requestReport(identifier: { plate: string; state: string } | { vin: string }, plate?: string, state?: string): Promise<InfoAgentVehicle | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.accessToken();
      let response: Response;
      try {
        const baseUrl = this.endpoint(this.config.get<string>('INFOAGENT_BASE_URL') || DEFAULT_BASE_URL);
        response = await fetch(baseUrl + REPORT_PATH, {
          method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...identifier, products: PRODUCTS }),
          signal: AbortSignal.timeout(this.timeoutMs()), redirect: 'error',
        });
      } catch { throw new ServiceUnavailableException('InfoAgent lookup is temporarily unavailable. Please retry.'); }
      if (response.status === 401 && attempt === 0) {
        if (this.token?.value === token) this.token = undefined;
        continue;
      }
      if (response.status === 403) throw new ServiceUnavailableException('InfoAgent NEVDIS access is not enabled for this client. Please contact your administrator.');
      if (response.status === 404 || response.status === 204) throw new NotFoundException('No vehicle found for this identifier.');
      if (response.status === 400 || response.status === 422) throw new BadRequestException('InfoAgent could not process this vehicle identifier.');
      if (!response.ok) throw new ServiceUnavailableException('InfoAgent lookup is temporarily unavailable. Please retry.');
      try { return normalizeInfoAgentResponse(await response.json(), plate, state); }
      catch { throw new BadGatewayException('InfoAgent returned an invalid vehicle report.'); }
    }
    throw new ServiceUnavailableException('InfoAgent authentication failed. Please retry.');
  }
}
