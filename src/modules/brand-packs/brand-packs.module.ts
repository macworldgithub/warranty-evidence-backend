import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrandPacksController } from './brand-packs.controller';
import { BrandPacksService } from './brand-packs.service';
import { BrandPack, BrandPackSchema } from '../../schemas/brand-pack.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BrandPack.name, schema: BrandPackSchema }]),
  ],
  controllers: [BrandPacksController],
  providers: [BrandPacksService],
  exports: [BrandPacksService],
})
export class BrandPacksModule {}
