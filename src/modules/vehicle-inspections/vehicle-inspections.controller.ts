import { Controller, Get, Post, Patch, Param, Query, Body, Headers, BadRequestException, ForbiddenException, NotFoundException, OnModuleInit, UploadedFile, UseInterceptors } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createHash } from 'node:crypto';
import { StorageService } from '../../common/storage/storage.service';
import { missingVehiclePhotos, VEHICLE_PHOTO_CATEGORIES } from '../warranty-cases/vehicle-photos';
import { REGISTRATION_STATES } from '../vehicle/rego.dto';

interface InspectionInput { id: string; vin: string; siteId: string; inspection: any }
@Controller('vehicle-inspections')
export class VehicleInspectionsController implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection, private readonly auth: AuthService, private readonly storage: StorageService) {}
  private collection() { return this.connection.collection('vehicle_inspections'); }
  async onModuleInit() {
    await this.collection().createIndex({ id: 1 }, { unique: true });
    await this.collection().createIndex({ siteId: 1, vin: 1, createdAt: -1 });
  }
  private async user(authorization: string | undefined, siteId: string) {
    const user = await this.auth.resolveUserFromAuthorization(authorization);
    if (!siteId || (user.role !== 'ADMIN' && ![user.defaultSiteId, ...(user.authorizedSiteIds || [])].includes(siteId))) throw new ForbiddenException('You are not assigned to this rooftop.');
    return user;
  }
  @Get()
  async list(@Query('vin') vin: string, @Query('siteId') siteId: string, @Headers('authorization') authorization?: string) {
    await this.user(authorization, siteId);
    if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new BadRequestException('A valid VIN is required.');
    const filter = vin ? { vin, siteId } : { siteId };
    const projection = vin ? { _id: 0 as const } : {
      _id: 0 as const, id: 1 as const, createdAt: 1 as const, inspectorName: 1 as const,
      'inspection.status': 1 as const, 'inspection.vin': 1 as const, 'inspection.siteId': 1 as const,
      'inspection.roNumber': 1 as const, 'inspection.rego': 1 as const, 'inspection.regoState': 1 as const,
      'inspection.vehicleDetails': 1 as const, 'inspection.odometer': 1 as const,
      'inspection.updatedAt': 1 as const,
    };
    return this.collection().find(filter, { projection }).sort({ createdAt: -1 }).toArray();
  }
  @Get(':id')
  async report(@Param('id') id: string, @Query('siteId') siteId: string, @Headers('authorization') authorization?: string) {
    await this.user(authorization, siteId);
    const report = await this.collection().findOne({ id, siteId }, { projection: { _id: 0 } });
    if (!report) throw new NotFoundException('Inspection report was not found.');
    return report;
  }

  @Patch(':id/references')
  async updateReferences(
    @Param('id') id: string,
    @Query('siteId') siteId: string,
    @Body() input: { rego?: string; roNumber?: string },
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.user(authorization, siteId);
    const filter = { id, siteId };
    const collection = this.collection();
    const report = await collection.findOne(filter);
    if (!report) throw new NotFoundException('Inspection report was not found.');
    if (user.role !== 'ADMIN' && (user.role === 'CLERK' || report.createdBy !== user.id)) {
      throw new ForbiddenException('Only the inspector or an administrator can update these details.');
    }
    const updates: Record<string, string> = {};
    for (const key of ['rego', 'roNumber'] as const) {
      const value = input?.[key];
      if (value === undefined || value === '') continue;
      if (typeof value !== 'string' || !/^[A-Z0-9][A-Z0-9 -]{0,39}$/i.test(value.trim())) {
        throw new BadRequestException('Enter a valid rego or RO number.');
      }
      updates['inspection.' + key] = value.trim().toUpperCase();
    }
    if (!Object.keys(updates).length) throw new BadRequestException('Enter a rego or RO number.');
    await collection.updateOne(filter, { $set: updates });
    return collection.findOne(filter, { projection: { _id: 0 } });
  }

  private hasVehicleIdentifier(vin: string, rego?: unknown, roNumber?: unknown) {
    if (vin) return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
    return [rego, roNumber].some(value => typeof value === 'string' && /^[A-Z0-9][A-Z0-9 -]{0,39}$/i.test(value.trim()));
  }

  @Post('photos')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPhoto(
    @Body() input: { id: string; vin: string; siteId: string; ruleKey: string; photoId: string; rego?: string; roNumber?: string },
    @UploadedFile() file: Express.Multer.File,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.user(authorization, input.siteId);
    if (user.role === 'CLERK') throw new ForbiddenException('Inspection capture is unavailable for this role.');
    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const extension = file && Object.prototype.hasOwnProperty.call(extensions, file.mimetype) ? extensions[file.mimetype] : undefined;
    if (!extension || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.id || '') ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(input.photoId || '') ||
      !this.hasVehicleIdentifier(input.vin, input.rego, input.roNumber) ||
      !VEHICLE_PHOTO_CATEGORIES.some(category => category.ruleKey === input.ruleKey)) {
      throw new BadRequestException('Select a JPEG, PNG or WebP inspection photo.');
    }
    const scope = createHash('sha256').update(JSON.stringify([user.id, input.siteId, input.vin, input.id])).digest('hex');
    const result = await this.storage.uploadFile(file.buffer, file.mimetype,
      `${input.ruleKey}_${input.photoId}.${extension}`, `inspection_${scope}`);
    return { storageUrl: result.url };
  }

  @Post()
  async save(@Body() dto: InspectionInput, @Headers('authorization') authorization?: string) {
    const user = await this.user(authorization, dto.siteId);
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(dto.id || '') || !(dto.inspection?.captureMode === 'quick'
        ? this.hasVehicleIdentifier(dto.vin, dto.inspection.rego, dto.inspection.roNumber)
        : /^[A-HJ-NPR-Z0-9]{17}$/.test(dto.vin || '')) ||
      !dto.inspection || !['IN_PROGRESS', 'COMPLETE'].includes(dto.inspection.status)) throw new BadRequestException('Invalid inspection.');
    const previous = await this.collection().findOne({ id: dto.id });
    if (previous && (previous.siteId !== dto.siteId || previous.vin !== dto.vin || previous.createdBy !== user.id)) throw new ForbiddenException('This inspection belongs to another capture session.');
    if (previous?.inspection?.status === 'COMPLETE') return previous;
    const input = dto.inspection;
    if (input.regoState !== undefined && !REGISTRATION_STATES.includes(input.regoState)) {
      throw new BadRequestException('Select a valid registration state.');
    }
    if (input.captureMode === 'quick' && user.role === 'CLERK') throw new ForbiddenException('Inspection capture is unavailable for this role.');
    const evidenceItems = (Array.isArray(input.evidenceItems) ? input.evidenceItems : []).map((item: any) => ({
      id: typeof item.id === 'string' ? item.id : undefined,
      ruleKey: String(item.ruleKey || ''), ruleName: String(item.ruleName || item.name || item.ruleKey || ''),
      mediaType: item.mediaType, storageUrl: /^(https?:\/\/|\/uploads\/)/.test(item.storageUrl || item.serverUrl || '') ? item.storageUrl || item.serverUrl : '',
      capturedAt: item.capturedAt, ocrExtractedText: item.ocrExtractedText, notes: item.notes,
      aiAnalysis: item.aiAnalysis, aiAnalysisId: item.aiAnalysisId,
    }));
    if (input.status === 'COMPLETE' && evidenceItems.some((item: any) => !item.storageUrl)) throw new BadRequestException('Finish uploading inspection evidence before completing.');
    if (input.captureMode === 'quick' && input.status === 'COMPLETE') {
      const missing = missingVehiclePhotos(evidenceItems, true);
      if (missing.length) throw new BadRequestException('Missing photos: ' + missing.map(photo => photo.name).join(', '));
    }
    const now = new Date().toISOString();
    const record = { vin: dto.vin, siteId: dto.siteId, updatedAt: now, inspection: {
      vin: dto.vin, siteId: dto.siteId, vehicleDetails: input.vehicleDetails, roNumber: input.roNumber,
      rego: input.rego, regoState: input.regoState, odometer: input.odometer,
      brandId: input.brandId, brandPackId: input.brandPackId, brandPackVersion: input.brandPackVersion,
      capturedZoneKeys: input.capturedZoneKeys, defects: input.defects, voiceNotes: input.voiceNotes,
      status: input.status, evidenceItems, updatedAt: now,
      notes: typeof input.notes === 'string' ? input.notes.trim().slice(0, 4000) : undefined,
    } };
    const owner = { id: dto.id, siteId: dto.siteId, vin: dto.vin, createdBy: user.id };
    try {
      await this.collection().updateOne({ ...owner, 'inspection.status': { $ne: 'COMPLETE' } }, {
        $set: record, $setOnInsert: { id: dto.id, createdAt: now, createdBy: user.id, inspectorName: user.name },
      }, { upsert: true });
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
      const saved = await this.collection().findOne(owner, { projection: { _id: 0 } });
      if (saved?.inspection?.status === 'COMPLETE') return saved;
      if (!saved) throw new ForbiddenException('This inspection belongs to another capture session.');
      throw error;
    }
    return this.collection().findOne(owner, { projection: { _id: 0 } });
  }
}
