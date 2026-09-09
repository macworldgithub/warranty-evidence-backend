import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { WarrantyCase, WarrantyCaseSchema } from '../../schemas/warranty-case.schema';
import { Site, SiteSchema } from '../../schemas/site.schema';
import { Brand, BrandSchema } from '../../schemas/brand.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WarrantyCase.name, schema: WarrantyCaseSchema },
      { name: Site.name, schema: SiteSchema },
      { name: Brand.name, schema: BrandSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
