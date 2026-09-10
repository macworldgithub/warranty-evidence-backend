import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { VehicleService, DecodeVinDto, DecodedVehicleResponseDto } from './vehicle.service';

@ApiTags('Vehicle Identification & VIN Decode')
@Controller('vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post('decode-vin')
  @ApiOperation({
    summary: 'Decode a 17-character VIN via mcp.vin (NHTSA vPIC)',
    description: `
Decodes a VIN using the mcp.vin API (backed by the NHTSA vPIC database — free, no API key required).

**Returns:** make, model, year, powertrain (EV/Hybrid/PHEV/ICE), body class, drive type, and check-digit validation.

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
  async decodeVin(@Body() dto: DecodeVinDto): Promise<DecodedVehicleResponseDto> {
    return this.vehicleService.decodeVin(dto);
  }
}
