import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VehicleService, DecodeVinDto, DecodedVehicleResponseDto } from './vehicle.service';

@ApiTags('Vehicle Identification & RedBooks VIN')
@Controller('vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post('decode-vin')
  @ApiOperation({
    summary: 'Decode 17-character VIN via RedBooks integration (Best effort auto-fill make/model/year/powertrain)',
  })
  @ApiResponse({ status: 200, type: DecodedVehicleResponseDto })
  decodeVin(@Body() dto: DecodeVinDto): DecodedVehicleResponseDto {
    return this.vehicleService.decodeVin(dto);
  }
}
