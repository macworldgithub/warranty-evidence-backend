import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VehicleInspectionsController } from './vehicle-inspections.controller';
@Module({ imports: [AuthModule], controllers: [VehicleInspectionsController] })
export class VehicleInspectionsModule {}
