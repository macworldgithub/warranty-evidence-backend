import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WarrantyCasesController } from './warranty-cases.controller';
import { WarrantyCasesService } from './warranty-cases.service';
import { BrandPacksModule } from '../brand-packs/brand-packs.module';
import { SitesModule } from '../sites/sites.module';
import { BrandsModule } from '../brands/brands.module';
import { WarrantyCase, WarrantyCaseSchema } from '../../schemas/warranty-case.schema';
import { User, UserSchema } from '../../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WarrantyCase.name, schema: WarrantyCaseSchema },
      { name: User.name, schema: UserSchema },
    ]),
    BrandPacksModule,
    SitesModule,
    BrandsModule,
  ],
  controllers: [WarrantyCasesController],
  providers: [WarrantyCasesService],
  exports: [WarrantyCasesService],
})
export class WarrantyCasesModule {}
