import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { RegoService } from './rego.service';
import { AuthModule } from '../auth/auth.module';
import { InfoAgentService } from './infoagent.service';

@Module({
  imports: [
    AuthModule,
    HttpModule.register({
      timeout: 8000,         // 8s — fall back to heuristics if mcp.vin is slow
      maxRedirects: 3,
    }),
  ],
  controllers: [VehicleController],
  providers: [VehicleService, RegoService, InfoAgentService],
  exports: [VehicleService, InfoAgentService],
})
export class VehicleModule {}
