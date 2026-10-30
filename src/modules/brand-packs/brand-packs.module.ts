import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandPacksController } from './brand-packs.controller';
import { BrandPacksService } from './brand-packs.service';
import { BrandPack, BrandPackSchema } from '../../schemas/brand-pack.schema';
import { Brand, BrandSchema } from '../../schemas/brand.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: BrandPack.name, schema: BrandPackSchema }]),
    MongooseModule.forFeature([{ name: Brand.name, schema: BrandSchema }]),
  ],
  controllers: [BrandPacksController],
  providers: [BrandPacksService],
  exports: [BrandPacksService],
})
export class BrandPacksModule {}
