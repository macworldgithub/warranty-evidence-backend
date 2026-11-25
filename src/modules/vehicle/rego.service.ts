import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { DecodeRegoDto } from './rego.dto';
import { InfoAgentService } from './infoagent.service';

const normalizePlate = (value: string) => value.replace(/[ -]/g, '').toUpperCase();

@Injectable()
export class RegoService {
  constructor(private readonly infoagent: InfoAgentService) {}

  async decodeRego(dto: DecodeRegoDto) {
    const rego = normalizePlate(dto.rego);
    const vehicle = await this.infoagent.lookupVehicle({ rego, state: dto.state });
    if (!vehicle) throw new NotFoundException('No vehicle found for this registration and state.');
    if (normalizePlate(vehicle.rego) !== rego || vehicle.state !== dto.state) {
      throw new BadGatewayException('InfoAgent returned a different registration. Please verify the plate and state.');
    }
    const validVin = /^[A-HJ-NPR-Z0-9]{17}$/.test(vehicle.vin);
    return {
      ...vehicle, rego, state: dto.state, vin: validVin ? vehicle.vin : undefined,
      provider: vehicle.source,
      requiresManualConfirm: !validVin || !vehicle.make || !vehicle.model || !vehicle.year,
    };
  }
}
