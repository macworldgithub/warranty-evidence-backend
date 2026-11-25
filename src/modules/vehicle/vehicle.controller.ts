import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VehicleService, DecodeVinDto, DecodedVehicleResponseDto } from './vehicle.service';
import { AuthService } from '../auth/auth.service';
import { DecodeRegoDto } from './rego.dto';
import { RegoService } from './rego.service';

@ApiTags('Vehicle Identification & VIN Decode')
@Controller('vehicle')
export class VehicleController {
  constructor(
    private readonly vehicleService: VehicleService,
    private readonly regoService: RegoService,
    private readonly auth: AuthService,
  ) {}

  @Post('decode-rego')
  @ApiOperation({ summary: 'Look up an Australian registration and state using InfoAgent' })
  @ApiBody({ type: DecodeRegoDto })
  @ApiResponse({ status: 200, description: 'Vehicle identification details' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  @ApiResponse({ status: 503, description: 'InfoAgent unavailable or vehicle-report access not enabled' })
  async decodeRego(@Body() dto: DecodeRegoDto, @Headers('authorization') authorization?: string) {
    await this.auth.resolveUserFromAuthorization(authorization);
    return this.regoService.decodeRego(dto);
  }

  @Post('decode-vin')
  @ApiOperation({
    summary: 'Decode a VIN using InfoAgent NEVDIS with the existing VIN decoder as fallback',
    description: `
Decodes a VIN using InfoAgent NEVDIS when configured. If InfoAgent has no result or is unavailable,
the existing mcp.vin decoder (NHTSA vPIC) is used.

**Returns:** vehicle identity, registration, risk flags and warnings from InfoAgent, plus check-digit validation.
Powertrain is returned only when the data source provides it. Unknown manufacture years are null.

**Fallback:** If mcp.vin is unreachable or the VIN is not in the NHTSA database (grey imports, pre-2000 vehicles),
the service falls back to a WMI prefix heuristic table covering all Booran franchise brands.
When the heuristic is used, \`requiresManualConfirm: true\` is set so the mobile app prompts the technician to verify.

**Check digit:** ISO 3779 check-digit validation is always performed regardless of the data source.
    `.trim(),
  })
  @ApiBody({ type: DecodeVinDto })
  @ApiResponse({
    status: 200,
    type: DecodedVehicleResponseDto,
    description: 'VIN decoded successfully (live or heuristic fallback)',
  })
  @ApiResponse({
    status: 400,
    description: 'VIN is not exactly 17 characters',
  })
  async decodeVin(@Body() dto: DecodeVinDto, @Headers('authorization') authorization?: string): Promise<DecodedVehicleResponseDto> {
    await this.auth.resolveUserFromAuthorization(authorization);
    return this.vehicleService.decodeVin(dto);
  }
}
