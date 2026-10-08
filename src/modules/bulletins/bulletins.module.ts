import { BadRequestException, Body, Controller, Get, Headers, Injectable, Module, NotFoundException, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { IsDateString, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { BrandsModule } from '../brands/brands.module';
import { BrandsService } from '../brands/brands.service';
import { StorageModule } from '../../common/storage/storage.module';
import { StorageService } from '../../common/storage/storage.service';

@Schema({ collection: 'warranty_bulletins', timestamps: true })
export class WarrantyBulletin {
  @Prop({ required: true, unique: true }) id: string;
  @Prop({ required: true, index: true }) brandId: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) bulletinNumber: string;
  @Prop({ required: true }) issueDate: string;
  @Prop({ required: true }) effectiveDate: string;
  @Prop({ required: true }) pdfUrl: string;
  @Prop({ enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' }) status: string;
  @Prop({ required: true }) createdBy: string;
  @Prop() publishedAt?: Date;
}
const BulletinSchema = SchemaFactory.createForClass(WarrantyBulletin);
BulletinSchema.index({ brandId: 1, status: 1, issueDate: -1 });

export class CreateBulletinDto {
  @IsString() @IsNotEmpty() @MaxLength(100) brandId: string;
  @IsString() @Matches(/\S/) @MaxLength(200) title: string;
  @IsString() @Matches(/\S/) @MaxLength(100) bulletinNumber: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) issueDate: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveDate: string;
}

@Injectable()
export class BulletinsService {
  constructor(@InjectModel(WarrantyBulletin.name) private readonly model: Model<WarrantyBulletin>, private readonly storage: StorageService, private readonly brands: BrandsService) {}

  async create(dto: CreateBulletinDto, file: Express.Multer.File | undefined, userId: string) {
    if (!file || file.size > 20 * 1024 * 1024 || file.mimetype !== 'application/pdf' || file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new BadRequestException('Attach a PDF document no larger than 20 MB.');
    }
    await this.brands.findOne(dto.brandId);
    const id = `bulletin_${randomUUID()}`;
    const upload = await this.storage.uploadFile(file.buffer, 'application/pdf', `${id}.pdf`, 'warranty-bulletins');
    try {
      return await this.model.create({ ...dto, title: dto.title.trim(), bulletinNumber: dto.bulletinNumber.trim(), id, pdfUrl: upload.url, createdBy: userId, status: 'DRAFT' });
    } catch (error) {
      await this.storage.deleteFile(upload.url).catch(() => undefined);
      throw error;
    }
  }

  list(brandId?: string, manage = false) {
    return this.model.find({ ...(brandId ? { brandId } : {}), ...(!manage ? { status: 'PUBLISHED' } : {}) }).sort({ issueDate: -1, createdAt: -1 }).lean().exec();
  }

  async publish(id: string, publish: boolean) {
    const result = await this.model.findOneAndUpdate({ id }, { $set: { status: publish ? 'PUBLISHED' : 'DRAFT', publishedAt: publish ? new Date() : null } }, { new: true }).lean().exec();
    if (!result) throw new NotFoundException('Bulletin not found.');
    return result;
  }

  async document(id: string, admin: boolean) {
    const item = await this.model.findOne({ id, ...(!admin ? { status: 'PUBLISHED' } : {}) }).lean().exec();
    if (!item) throw new NotFoundException('Published bulletin not found.');
    return { url: await this.storage.getReadUrl(item.pdfUrl, 900) };
  }
}

@Controller('warranty-bulletins')
export class BulletinsController {
  constructor(private readonly service: BulletinsService, private readonly auth: AuthService) {}

  @Get()
  async list(@Headers('authorization') token?: string, @Query('brandId') brandId?: string, @Query('manage') manage?: string) {
    if (manage === 'true') await this.auth.assertAdmin(token);
    else await this.auth.resolveUserFromAuthorization(token);
    return this.service.list(brandId, manage === 'true');
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024, files: 1 } }))
  async create(@Headers('authorization') token: string, @Body() dto: CreateBulletinDto, @UploadedFile() file?: Express.Multer.File) {
    const user = await this.auth.assertAdmin(token);
    return this.service.create(dto, file, user.id);
  }

  @Patch(':id/publish')
  async publish(@Headers('authorization') token: string, @Param('id') id: string) {
    await this.auth.assertAdmin(token);
    return this.service.publish(id, true);
  }

  @Patch(':id/unpublish')
  async unpublish(@Headers('authorization') token: string, @Param('id') id: string) {
    await this.auth.assertAdmin(token);
    return this.service.publish(id, false);
  }

  @Get(':id/document')
  async document(@Headers('authorization') token: string, @Param('id') id: string) {
    const user = await this.auth.resolveUserFromAuthorization(token);
    return this.service.document(id, user.role === 'ADMIN');
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: WarrantyBulletin.name, schema: BulletinSchema }]), AuthModule, BrandsModule, StorageModule],
  controllers: [BulletinsController], providers: [BulletinsService],
})
export class BulletinsModule {}
