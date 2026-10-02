import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hoist, HoistSchema } from '../../schemas/hoist.schema';
import { HoistInspection, HoistInspectionSchema } from '../../schemas/hoist-inspection.schema';
import { HoistsService } from './hoists.service';
import { HoistsController } from './hoists.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hoist.name, schema: HoistSchema },
      { name: HoistInspection.name, schema: HoistInspectionSchema },
    ]),
  ],
  controllers: [HoistsController],
  providers: [HoistsService],
  exports: [HoistsService],
})
export class HoistsModule {}
