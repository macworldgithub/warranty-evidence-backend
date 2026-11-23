import { Controller, Get, Post, Query, Body, Headers, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuthService } from '../auth/auth.service';

interface InspectionInput { id: string; vin: string; siteId: string; inspection: any }
@Controller('vehicle-inspections')
export class VehicleInspectionsController implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection, private readonly auth: AuthService) {}
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
      _id: 0 as const, 'inspection.vin': 1 as const, 'inspection.siteId': 1 as const,
      'inspection.roNumber': 1 as const, 'inspection.rego': 1 as const,
      'inspection.vehicleDetails': 1 as const, 'inspection.odometer': 1 as const,
      'inspection.updatedAt': 1 as const,
    };
    return this.collection().find(filter, { projection }).sort({ createdAt: -1 }).toArray();
  }
  @Post()
  async save(@Body() dto: InspectionInput, @Headers('authorization') authorization?: string) {
    const user = await this.user(authorization, dto.siteId);
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(dto.id || '') || !/^[A-HJ-NPR-Z0-9]{17}$/.test(dto.vin || '') ||
      !dto.inspection || !['IN_PROGRESS', 'COMPLETE'].includes(dto.inspection.status)) throw new BadRequestException('Invalid inspection.');
    const previous = await this.collection().findOne({ id: dto.id });
    if (previous && (previous.siteId !== dto.siteId || previous.vin !== dto.vin || previous.createdBy !== user.id)) throw new ForbiddenException('This inspection belongs to another capture session.');
    if (previous?.inspection?.status === 'COMPLETE') return previous;
    const input = dto.inspection;
    const evidenceItems = (Array.isArray(input.evidenceItems) ? input.evidenceItems : []).map((item: any) => ({
      id: typeof item.id === 'string' ? item.id : undefined,
      ruleKey: String(item.ruleKey || ''), ruleName: String(item.ruleName || item.name || item.ruleKey || ''),
      mediaType: item.mediaType, storageUrl: /^(https?:\/\/|\/uploads\/)/.test(item.storageUrl || item.serverUrl || '') ? item.storageUrl || item.serverUrl : '',
      capturedAt: item.capturedAt, ocrExtractedText: item.ocrExtractedText, notes: item.notes,
      aiAnalysis: item.aiAnalysis, aiAnalysisId: item.aiAnalysisId,
    }));
    if (input.status === 'COMPLETE' && evidenceItems.some((item: any) => !item.storageUrl)) throw new BadRequestException('Finish uploading inspection evidence before completing.');
    const now = new Date().toISOString();
    const record = { vin: dto.vin, siteId: dto.siteId, updatedAt: now, inspection: {
      vin: dto.vin, siteId: dto.siteId, vehicleDetails: input.vehicleDetails, roNumber: input.roNumber,
      rego: input.rego, odometer: input.odometer,
      brandId: input.brandId, brandPackId: input.brandPackId, brandPackVersion: input.brandPackVersion,
      capturedZoneKeys: input.capturedZoneKeys, defects: input.defects, voiceNotes: input.voiceNotes,
      status: input.status, evidenceItems, updatedAt: now,
    } };
    await this.collection().updateOne({ id: dto.id, 'inspection.status': { $ne: 'COMPLETE' } }, {
      $set: record, $setOnInsert: { id: dto.id, createdAt: now, createdBy: user.id, inspectorName: user.name },
    }, { upsert: true });
    return this.collection().findOne({ id: dto.id }, { projection: { _id: 0 } });
  }
}
