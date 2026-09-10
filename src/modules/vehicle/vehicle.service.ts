import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { PowertrainType } from '../../common/enums';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class DecodeVinDto {
  @ApiProperty({
    example: 'LGXCE4C86P0019283',
    description: '17-character Vehicle Identification Number',
  })
  @IsString()
  @Length(17, 17, { message: 'VIN must be exactly 17 characters' })
  vin: string;
}

export class DecodedVehicleResponseDto {
  @ApiProperty({ example: 'LGXCE4C86P0019283' })
  vin: string;

  @ApiProperty({ example: 'BYD' })
  make: string;

  @ApiProperty({ example: 'ATTO 3' })
  model: string;

  @ApiProperty({ example: 2024 })
  year: number;

  @ApiProperty({ enum: PowertrainType, example: PowertrainType.EV })
  powertrain: PowertrainType;

  @ApiPropertyOptional({ example: 'Sport Utility Vehicle (SUV)' })
  bodyClass?: string;

  @ApiPropertyOptional({ example: 'Electric' })
  fuelType?: string;

  @ApiPropertyOptional({ example: 'AWD/All-Wheel Drive' })
  driveType?: string;

  @ApiProperty({
    example: 'mcp.vin (NHTSA vPIC)',
    description: 'Data source — live API or WMI heuristic fallback',
  })
  provider: string;

  @ApiProperty({
    example: true,
    description: 'Whether the VIN passed ISO 3779 check-digit validation',
  })
  isValidCheckDigit: boolean;

  @ApiProperty({
    example: false,
    description:
      'True when result came from WMI heuristics rather than a live API decode. Mobile app should prompt technician to confirm before proceeding.',
  })
  requiresManualConfirm: boolean;
}

// ─── mcp.vin actual response shape (nested) ───────────────────────────────────

interface McpVinResponse {
  valid: boolean;
  vin: string;
  validation?: {
    valid: boolean;
    errors?: string[];
    wmi?: {
      code: string;
      country: string;
      manufacturer: string;
    };
  };
  vehicle?: {
    year?: number | null;
    make?: string | null;
    model?: string | null;
    trim?: string | null;
    body_class?: string | null;
    vehicle_type?: string | null;
  };
  engine?: {
    fuel_type?: string | null;
    ev_type?: string | null;
  };
  transmission?: {
    drive_type?: string | null;
  };
  raw_nhtsa?: {
    ErrorCode?: string;
    ErrorText?: string;
    Make?: string;
    Model?: string;
    ModelYear?: string;
    FuelTypePrimary?: string;
    DriveType?: string;
    BodyClass?: string;
  };
}

// ─── WMI heuristic fallback table (all Booran franchise brands) ──────────────

interface WmiEntry {
  make: string;
  powertrain: PowertrainType;
}

// Longer prefixes must come before shorter ones — matched longest-first
const WMI_TABLE: Array<{ prefix: string; entry: WmiEntry }> = [
  // BYD
  { prefix: 'LGX', entry: { make: 'BYD', powertrain: PowertrainType.EV } },
  { prefix: 'LBV', entry: { make: 'BYD', powertrain: PowertrainType.EV } },
  // Hyundai
  { prefix: 'KMH', entry: { make: 'Hyundai', powertrain: PowertrainType.ICE } },
  { prefix: 'KMF', entry: { make: 'Hyundai', powertrain: PowertrainType.ICE } },
  { prefix: 'KMJ', entry: { make: 'Hyundai', powertrain: PowertrainType.HYBRID } },
  // Kia
  { prefix: 'KNA', entry: { make: 'Kia', powertrain: PowertrainType.EV } },
  { prefix: 'KNB', entry: { make: 'Kia', powertrain: PowertrainType.ICE } },
  { prefix: 'KND', entry: { make: 'Kia', powertrain: PowertrainType.ICE } },
  // MG
  { prefix: 'LSJ', entry: { make: 'MG', powertrain: PowertrainType.EV } },
  // Chery
  { prefix: 'LVV', entry: { make: 'Chery', powertrain: PowertrainType.ICE } },
  { prefix: 'LDC', entry: { make: 'Chery', powertrain: PowertrainType.ICE } },
  { prefix: 'LVT', entry: { make: 'Chery', powertrain: PowertrainType.ICE } },
  // Toyota (multiple WMIs — Aus-assembled, Japan-assembled, US-assembled)
  { prefix: 'MR0', entry: { make: 'Toyota', powertrain: PowertrainType.HYBRID } },
  { prefix: 'JTM', entry: { make: 'Toyota', powertrain: PowertrainType.ICE } },
  { prefix: 'JTD', entry: { make: 'Toyota', powertrain: PowertrainType.ICE } },
  { prefix: 'JTJ', entry: { make: 'Toyota', powertrain: PowertrainType.ICE } },
  { prefix: 'JTE', entry: { make: 'Toyota', powertrain: PowertrainType.ICE } },
  { prefix: '6T1', entry: { make: 'Toyota', powertrain: PowertrainType.ICE } }, // Aus-assembled Camry/Aurion
  { prefix: '6FP', entry: { make: 'Toyota', powertrain: PowertrainType.ICE } },
  // Ford
  { prefix: 'MNA', entry: { make: 'Ford', powertrain: PowertrainType.ICE } },
  { prefix: 'WF0', entry: { make: 'Ford', powertrain: PowertrainType.ICE } },
  { prefix: '1FT', entry: { make: 'Ford', powertrain: PowertrainType.ICE } }, // US-built Rangers
  // Mitsubishi
  { prefix: 'JA3', entry: { make: 'Mitsubishi', powertrain: PowertrainType.ICE } },
  { prefix: 'JA4', entry: { make: 'Mitsubishi', powertrain: PowertrainType.HYBRID } },
  { prefix: 'JMY', entry: { make: 'Mitsubishi', powertrain: PowertrainType.PHEV } },
  { prefix: 'ML3', entry: { make: 'Mitsubishi', powertrain: PowertrainType.ICE } },
  // Nissan
  { prefix: 'JN1', entry: { make: 'Nissan', powertrain: PowertrainType.ICE } },
  { prefix: 'JN8', entry: { make: 'Nissan', powertrain: PowertrainType.ICE } },
  { prefix: 'MNT', entry: { make: 'Nissan', powertrain: PowertrainType.ICE } },
  // Isuzu UTE
  { prefix: 'JAC', entry: { make: 'Isuzu UTE', powertrain: PowertrainType.ICE } },
  // Škoda
  { prefix: 'TMB', entry: { make: 'Škoda', powertrain: PowertrainType.ICE } },
  // Suzuki
  { prefix: 'JS2', entry: { make: 'Suzuki', powertrain: PowertrainType.ICE } },
  { prefix: 'JS3', entry: { make: 'Suzuki', powertrain: PowertrainType.ICE } },
  // GMSV (General Motors Specialty Vehicles)
  { prefix: '6G2', entry: { make: 'GMSV', powertrain: PowertrainType.ICE } },
  { prefix: '6GZ', entry: { make: 'GMSV', powertrain: PowertrainType.ICE } },
];

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class VehicleService {
  private readonly logger = new Logger(VehicleService.name);
  private readonly MCP_VIN_BASE = 'https://mcp.vin/api/vin';

  constructor(private readonly httpService: HttpService) {}

  async decodeVin(dto: DecodeVinDto): Promise<DecodedVehicleResponseDto> {
    const vin = dto.vin.trim().toUpperCase();
    const isValidCheckDigit = this.validateCheckDigit(vin);

    // ── Step 1: Check WMI against known table first ───────────────────────────
    // NHTSA (mcp.vin) only has records for vehicles registered for US-market sale.
    // Asian-manufactured brands (BYD, Hyundai, Kia, MG, Chery, Mitsubishi, Nissan,
    // Isuzu, Suzuki, Škoda, Toyota-Japan/AU) return vehicle:null — skip the API
    // call entirely for these and use our heuristic table directly.
    const wmiMatch = this.findWmiMatch(vin);
    if (wmiMatch) {
      this.logger.log(
        `WMI table hit for VIN ${vin} (${vin.substring(0, 3)}) → ${wmiMatch.make} — skipping mcp.vin (NHTSA has no record for this manufacturer)`,
      );
      return this.buildHeuristicResponse(vin, wmiMatch, isValidCheckDigit);
    }

    // ── Step 2: Unknown WMI — try mcp.vin live decode ────────────────────────
    // Only reached for WMIs not in our table (e.g. future brands, Ford US-built, etc.)
    this.logger.log(`WMI ${vin.substring(0, 3)} not in heuristic table — attempting mcp.vin decode`);
    try {
      const response = await firstValueFrom(
        this.httpService
          .get<McpVinResponse>(`${this.MCP_VIN_BASE}/${vin}`)
          .pipe(
            timeout(10000),
            catchError((err) => {
              this.logger.warn(
                `mcp.vin request failed for VIN ${vin}: ${err.message} — returning unknown stub`,
              );
              return of(null);
            }),
          ),
      );

      if (response?.data) {
        const data = response.data;
        const make = data.vehicle?.make ?? data.raw_nhtsa?.Make ?? null;
        const model = data.vehicle?.model ?? data.raw_nhtsa?.Model ?? null;
        const yearRaw = data.vehicle?.year ?? Number(data.raw_nhtsa?.ModelYear) ?? null;
        const year = yearRaw && yearRaw > 1900 ? yearRaw : null;

        if (make && model && year) {
          const fuelType = data.engine?.fuel_type ?? data.raw_nhtsa?.FuelTypePrimary ?? null;
          const powertrain = this.mapFuelTypeToPowertrain(fuelType);

          this.logger.log(
            `mcp.vin decoded VIN ${vin} → ${year} ${make} ${model} (${powertrain})`,
          );

          return {
            vin,
            make: this.titleCase(make),
            model,
            year,
            powertrain,
            bodyClass: (data.vehicle?.body_class ?? data.raw_nhtsa?.BodyClass) ?? undefined,
            fuelType: fuelType ?? undefined,
            driveType: (data.transmission?.drive_type ?? data.raw_nhtsa?.DriveType) ?? undefined,
            provider: 'mcp.vin (NHTSA vPIC)',
            isValidCheckDigit,
            requiresManualConfirm: false,
          };
        }
      }
    } catch (err) {
      this.logger.warn(`mcp.vin unexpected error for VIN ${vin}: ${err.message}`);
    }

    // ── Step 3: Completely unknown — return minimal stub ─────────────────────
    this.logger.warn(`No data for VIN ${vin} (WMI: ${vin.substring(0, 3)}) — returning unknown stub`);
    return {
      vin,
      make: 'Unknown',
      model: 'Enter make and model manually',
      year: this.decodeModelYearFromVin(vin),
      powertrain: PowertrainType.ICE,
      provider: 'Unknown WMI — manual entry required',
      isValidCheckDigit,
      requiresManualConfirm: true,
    };
  }

  // ─── Find WMI match — longest prefix first ───────────────────────────────
  private findWmiMatch(vin: string): WmiEntry | null {
    const sorted = [...WMI_TABLE].sort((a, b) => b.prefix.length - a.prefix.length);
    const match = sorted.find((e) => vin.startsWith(e.prefix));
    return match?.entry ?? null;
  }

  // ─── Build response from WMI heuristic match ─────────────────────────────
  private buildHeuristicResponse(
    vin: string,
    entry: WmiEntry,
    isValidCheckDigit: boolean,
  ): DecodedVehicleResponseDto {
    return {
      vin,
      make: entry.make,
      model: 'Confirm model with technician',
      year: this.decodeModelYearFromVin(vin),
      powertrain: entry.powertrain,
      provider: 'WMI Heuristic (manual confirm required)',
      isValidCheckDigit,
      requiresManualConfirm: true,
    };
  }

  // ─── WMI prefix heuristics — covers all Booran franchise brands ──────────
  private wmiHeuristicFallback(vin: string, isValidCheckDigit: boolean): DecodedVehicleResponseDto {
    const match = this.findWmiMatch(vin);
    if (match) {
      this.logger.log(`WMI heuristic matched VIN ${vin} → ${match.make} (${match.powertrain})`);
      return this.buildHeuristicResponse(vin, match, isValidCheckDigit);
    }
    this.logger.warn(`No WMI match for VIN ${vin} (WMI: ${vin.substring(0, 3)}) — returning unknown stub`);
    return {
      vin,
      make: 'Unknown',
      model: 'Enter make and model manually',
      year: this.decodeModelYearFromVin(vin),
      powertrain: PowertrainType.ICE,
      provider: 'WMI Heuristic (unrecognised — manual entry required)',
      isValidCheckDigit,
      requiresManualConfirm: true,
    };
  }
  // ─── Map fuel type string → PowertrainType enum ──────────────────────────
  private mapFuelTypeToPowertrain(fuelType?: string | null): PowertrainType {
    if (!fuelType) return PowertrainType.ICE;
    const f = fuelType.toLowerCase();

    if (f.includes('electric') && (f.includes('hybrid') || f.includes('plug'))) {
      return PowertrainType.PHEV;
    }
    if (f.includes('electric')) return PowertrainType.EV;
    if (f.includes('hybrid')) return PowertrainType.HYBRID;
    return PowertrainType.ICE;
  }

  // ─── ISO 3779 model year decode from VIN position 10 ─────────────────────
  private decodeModelYearFromVin(vin: string): number {
    const yearMap: Record<string, number> = {
      A: 1980, B: 1981, C: 1982, D: 1983, E: 1984, F: 1985, G: 1986,
      H: 1987, J: 1988, K: 1989, L: 1990, M: 1991, N: 1992, P: 1993,
      R: 1994, S: 1995, T: 1996, V: 1997, W: 1998, X: 1999, Y: 2000,
      '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006,
      '7': 2007, '8': 2008, '9': 2009,
    };
    // Post-2009 uses lowercase letters (some decoders use uppercase too)
    const yearMapPost: Record<string, number> = {
      A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016,
      H: 2017, J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023,
      R: 2024, S: 2025, T: 2026,
    };

    if (vin.length < 10) return new Date().getFullYear();
    const char = vin[9].toUpperCase();

    // Disambiguate: if position 10 char appears in both maps, use the
    // full VIN context — characters I, O, Q, U, Z, 0 are never used.
    // For A–Y we prefer the modern era (2010+) for recent vehicles,
    // but fall back to the legacy map if the heuristic year > current year.
    const currentYear = new Date().getFullYear();
    const modernYear = yearMapPost[char];
    const legacyYear = yearMap[char];

    if (modernYear && modernYear <= currentYear + 1) return modernYear;
    if (legacyYear) return legacyYear;
    return currentYear;
  }

  // ─── ISO 3779 check digit validation (position 9) ────────────────────────
  private validateCheckDigit(vin: string): boolean {
    if (vin.length !== 17) return false;

    const transliteration: Record<string, number> = {
      A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
      J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
      S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
      '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
      '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    };

    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const val = transliteration[vin[i]];
      if (val === undefined) return false;
      sum += val * weights[i];
    }

    const remainder = sum % 11;
    const checkChar = remainder === 10 ? 'X' : String(remainder);
    return vin[8] === checkChar;
  }

  // ─── Title case ("TOYOTA" → "Toyota") ────────────────────────────────────
  private titleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
