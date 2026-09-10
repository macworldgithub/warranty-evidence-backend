import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 8000,         // 8s — fall back to heuristics if mcp.vin is slow
      maxRedirects: 3,
    }),
  ],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehicleModule {}
