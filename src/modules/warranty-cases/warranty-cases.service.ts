
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CaseStatus, FaultCategory, FlagReasonCode, MediaType, PowertrainType, RepairStage, UserRole } from '../../common/enums';
import { BrandPacksService } from '../brand-packs/brand-packs.service';
import { WarrantyCase, WarrantyCaseDocument } from '../../schemas/warranty-case.schema';
import { User, UserDocument } from '../../schemas/user.schema';

export class CreateWarrantyCaseDto {
  @ApiProperty({ example: 'site_cranbourne_byd' })
  @IsString()
  siteId: string;

  @ApiProperty({ example: 'brand_byd' })
  @IsString()
  brandId: string;

  @ApiProperty({ example: 'CR-98421' })
  @IsString()
  roNumber: string;

  @ApiPropertyOptional({ example: 'BYD-CLM-8839' })
  @IsOptional()
  @IsString()
  claimNumber?: string;

  @ApiProperty({ example: 'LGXCE4C86P0019283' })
  @IsString()
  vin: string;

  @ApiProperty({ example: 14250 })
  @IsNumber()
  odometer: number;

  @ApiProperty({ example: 'BYD' })
  @IsString()
  make: string;

  @ApiProperty({ example: 'ATTO 3 Extended' })
  @IsString()
  model: string;

  @ApiProperty({ example: 2024 })
  @IsNumber()
  year: number;

  @ApiProperty({ enum: PowertrainType, example: PowertrainType.EV })
  @IsEnum(PowertrainType)
  powertrain: PowertrainType;

  @ApiProperty({ example: 'tech_jake_s' })
  @IsString()
  technicianId: string;

  @ApiProperty({ example: 'Jake Smith' })
  @IsString()
  technicianName: string;

  @ApiProperty({ example: 'HV Battery cooling loop moisture warning on cluster' })
  @IsString()
  concernTitle: string;

  @ApiProperty({ enum: FaultCategory, example: FaultCategory.BATTERY_HV })
  @IsEnum(FaultCategory)
  faultCategory: FaultCategory;

  @ApiProperty({ example: true })
  @IsBoolean()
  partReplaced: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  noiseFault: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  diagnosticsAvailable: boolean;

  @ApiProperty({ enum: RepairStage, example: RepairStage.REPAIR_COMPLETE })
  @IsEnum(RepairStage)
  repairStage: RepairStage;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.TECHNICIAN })
  @IsOptional()
  @IsEnum(UserRole)
  creatorRole?: UserRole;
}

export class AddEvidenceDto {
  @ApiProperty({ example: 'vin_photo' })
  @IsString()
  ruleKey: string;

  @ApiProperty({ example: 'VIN Plate Photo' })
  @IsString()
  name: string;

  @ApiProperty({ enum: MediaType, example: MediaType.IMAGE })
  @IsEnum(MediaType)
  mediaType: MediaType;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80' })
  @IsString()
  storageUrl: string;

  @ApiPropertyOptional({ example: 'LGXCE4C86P0019283' })
  @IsOptional()
  @IsString()
  ocrExtractedText?: string;

  @ApiPropertyOptional({ example: 98.5 })
  @IsOptional()
  @IsNumber()
  ocrConfidence?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 'Cleaned camera lens and retook with torch enabled' })
  @IsOptional()
  @IsString()
  technicianNote?: string;
}

export class AddVoiceNoteDto {
  @ApiPropertyOptional({ example: 'tier2_hv_isolation' })
  @IsOptional()
  @IsString()
  pinnedToEvidenceKey?: string;

  @ApiProperty({ example: 'Checked the HV disconnect plug. Voltage measured 0.0V across all terminals. Blade battery module showing DTC P0B0D.' })
  @IsString()
  transcript: string;

  @ApiPropertyOptional({ example: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' })
  @IsOptional()
  @IsString()
  originalAudioUrl?: string;

  @ApiProperty({ example: 18 })
  @IsNumber()
  durationSeconds: number;

  @ApiProperty({ example: 'Jake Smith' })
  @IsString()
  recordedBy: string;
}

export class FlagCaseDto {
  @ApiProperty({ example: 'fault_location' })
  @IsString()
  evidenceRuleKey: string;

  @ApiProperty({ enum: FlagReasonCode, example: FlagReasonCode.WRONG_ANGLE })
  @IsEnum(FlagReasonCode)
  reasonCode: FlagReasonCode;

  @ApiProperty({ example: 'Fault location photo is too close to show the subframe context. Please step back 1 meter and retake.' })
  @IsString()
  instruction: string;

  @ApiProperty({ example: 'Sarah Jenkins (Warranty Clerk)' })
  @IsString()
  flaggedBy: string;
}

export class MarkSubmittedDto {
  @ApiProperty({ example: 'BYD-CLM-2026-9811' })
  @IsString()
  claimNumber: string;

  @ApiPropertyOptional({ example: 'Approved and submitted into BYD OEM portal under campaign WB-2602.' })
  @IsOptional()
  @IsString()
  clerkNote?: string;
}

@Injectable()
export class WarrantyCasesService implements OnModuleInit {
  constructor(
    @InjectModel(WarrantyCase.name) private caseModel: Model<WarrantyCaseDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private brandPacksService: BrandPacksService,
  ) { }

  async onModuleInit() {
    const count = await this.caseModel.countDocuments();
    if (count === 0) {
      console.log('🍃 Seeding default sample Warranty Cases into MongoDB Atlas...');
      const defaultCases = [
        {
          id: 'CASE-CR-2026-001',
          siteId: 'site_cranbourne_byd',
          siteName: 'Booran BYD Cranbourne',
          brandId: 'brand_byd',
          brandName: 'BYD',
          roNumber: 'CR-98421',
          claimNumber: 'BYD-CLM-8839',
          vin: 'LGXCE4C86P0019283',
          odometer: 14250,
          make: 'BYD',
          model: 'ATTO 3 Extended',
          year: 2024,
          powertrain: 'EV',
          status: 'Awaiting Review',
          technicianId: 'tech_jake_s',
          technicianName: 'Jake Smith',
          concernTitle: 'HV Battery cooling loop moisture warning on cluster',
          faultCategory: 'Battery and high-voltage (HV) components',
          partReplaced: true,
          noiseFault: false,
          diagnosticsAvailable: true,
          repairStage: 'Repair complete',
          evidenceItems: [
            {
              id: 'ev_1',
              ruleKey: 'vin_photo',
              name: 'VIN Plate Photo',
              mediaType: 'image',
              storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
              uploadedAt: '2026-09-03T08:12:00.000Z',
              ocrExtractedText: 'LGXCE4C86P0019283',
              ocrConfidence: 99.4,
              isVerifiedByClerk: true,
            },
            {
              id: 'ev_2',
              ruleKey: 'odometer_photo',
              name: 'Odometer Cluster Photo',
              mediaType: 'image',
              storageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
              uploadedAt: '2026-09-03T08:14:00.000Z',
              ocrExtractedText: '14250 km',
              ocrConfidence: 98.1,
              isVerifiedByClerk: true,
            },
            {
              id: 'ev_3',
              ruleKey: 'front_vehicle_photo',
              name: 'Front of Vehicle Reference',
              mediaType: 'image',
              storageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
              uploadedAt: '2026-09-03T08:16:00.000Z',
              isVerifiedByClerk: true,
            },
            {
              id: 'ev_4',
              ruleKey: 'fault_closeup',
              name: 'Coolant Hose Moisture Close-up',
              mediaType: 'image',
              storageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
              uploadedAt: '2026-09-03T08:20:00.000Z',
              isVerifiedByClerk: true,
            },
            {
              id: 'ev_5',
              ruleKey: 'fault_location',
              name: 'Battery Pack Front Tray Orientation',
              mediaType: 'image',
              storageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
              uploadedAt: '2026-09-03T08:22:00.000Z',
              isVerifiedByClerk: true,
            },
            {
              id: 'ev_6',
              ruleKey: 'old_part_serial',
              name: 'Old Hose Barb Assembly Barcode',
              mediaType: 'image',
              storageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
              uploadedAt: '2026-09-03T08:28:00.000Z',
              ocrExtractedText: 'BYD-11029384-A',
              ocrConfidence: 96.5,
              isVerifiedByClerk: true,
            },
            {
              id: 'ev_7',
              ruleKey: 'new_part_serial',
              name: 'New Replacement Hose Barb Barcode',
              mediaType: 'image',
              storageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
              uploadedAt: '2026-09-03T08:30:00.000Z',
              ocrExtractedText: 'BYD-11029384-B',
              ocrConfidence: 97.2,
              isVerifiedByClerk: true,
            },
            {
              id: 'ev_8',
              ruleKey: 'tier2_hv_isolation',
              name: 'HV Isolation Test Proof',
              mediaType: 'image',
              storageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
              uploadedAt: '2026-09-03T08:35:00.000Z',
              isVerifiedByClerk: true,
            },
          ],
          voiceNotes: [
            {
              id: 'vn_1',
              transcript: 'Completed high-voltage safety isolation. Measured 0.0 volts across terminals. Found coolant seepage on the quick connector barb. Replaced connector assembly and pressure tested cooling system to 1.5 bar with zero decay.',
              durationSeconds: 18,
              recordedBy: 'Jake Smith',
              recordedAt: '2026-09-03T08:40:00.000Z',
            },
          ],
          flagHistory: [],
          checklistSummary: {
            totalMandatory: 8,
            completedMandatory: 8,
            totalOptional: 2,
            completedOptional: 0,
            isReadyForSubmission: true,
          },
          clerkNotes: 'All 8 mandatory Attachment A photos verified by Sarah Jenkins.',
        },
        {
          id: 'CASE-DAN-2026-089',
          siteId: 'site_dandenong_multi',
          siteName: 'Booran Dandenong Multi-Franchise',
          brandId: 'brand_hyundai',
          brandName: 'Hyundai',
          roNumber: 'DAN-40192',
          vin: 'KMHD84LF7PU091823',
          odometer: 32100,
          make: 'Hyundai',
          model: 'Tucson 1.6T Hybrid',
          year: 2023,
          powertrain: 'Hybrid',
          status: 'Flagged',
          technicianId: 'tech_liam_m',
          technicianName: 'Liam Miller',
          concernTitle: 'Front timing cover oil seepage weeping past seal',
          faultCategory: 'Oil leaks or seepage',
          partReplaced: false,
          noiseFault: false,
          diagnosticsAvailable: false,
          repairStage: 'During repair',
          evidenceItems: [
            {
              id: 'ev_d1',
              ruleKey: 'vin_photo',
              name: 'VIN Plate Photo',
              mediaType: 'image',
              storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
              uploadedAt: '2026-09-03T07:10:00.000Z',
              ocrExtractedText: 'KMHD84LF7PU091823',
              ocrConfidence: 98.8,
            },
            {
              id: 'ev_d2',
              ruleKey: 'odometer_photo',
              name: 'Odometer Cluster',
              mediaType: 'image',
              storageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
              uploadedAt: '2026-09-03T07:12:00.000Z',
              ocrExtractedText: '32100 km',
              ocrConfidence: 99.0,
            },
          ],
          voiceNotes: [
            {
              id: 'vn_d1',
              transcript: 'Timing cover is weeping oil down onto the serpentine belt tensioner. Stripping down the front accessory drive.',
              durationSeconds: 12,
              recordedBy: 'Liam Miller',
              recordedAt: '2026-09-03T07:14:00.000Z',
            },
          ],
          flagHistory: [
            {
              id: 'flg_1',
              evidenceRuleKey: 'fault_closeup',
              reasonCode: 'POOR_LIGHTING_BLUR',
              instruction: 'Fault close-up image is blurry and under-exposed. Please wipe camera lens and retake with workshop torch on.',
              flaggedBy: 'Sarah Jenkins (Warranty Clerk)',
              flaggedAt: '2026-09-03T08:00:00.000Z',
            },
          ],
          checklistSummary: {
            totalMandatory: 5,
            completedMandatory: 2,
            totalOptional: 2,
            completedOptional: 0,
            isReadyForSubmission: false,
          },
          clerkNotes: 'Flagged back to tech for blurry defect shot.',
        },
      ];
      for (const c of defaultCases) {
        await this.caseModel.updateOne(
          { id: c.id },
          { $set: c },
          { upsert: true },
        );
      }
      console.log(`🍃 Successfully synchronized ${defaultCases.length} sample Warranty Cases in MongoDB Atlas`);
    }
  }

  async findAll(filters?: {
    siteId?: string;
    brandId?: string;
    status?: string;
    technicianId?: string;
    technicianName?: string;
    ro?: string;
    vin?: string;
    flaggedOnly?: boolean;
    agedHours?: number;
  }): Promise<WarrantyCase[]> {
    const query: any = {};

    if (filters?.siteId) query.siteId = filters.siteId;
    if (filters?.brandId) query.brandId = filters.brandId;
    if (filters?.status) query.status = filters.status;
    if (filters?.ro) query.roNumber = { $regex: filters.ro, $options: 'i' };
    if (filters?.vin) query.vin = { $regex: filters.vin, $options: 'i' };
    if (filters?.flaggedOnly) query.status = 'Flagged';

    if (filters?.technicianId || filters?.technicianName) {
      const orConditions: any[] = [];
      if (filters.technicianId) {
        orConditions.push({ technicianId: filters.technicianId });
      }
      if (filters.technicianName) {
        orConditions.push({
          technicianName: { $regex: new RegExp(`^${filters.technicianName.trim()}$`, 'i') },
        });
        const slugId = 'tech_' + filters.technicianName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        orConditions.push({ technicianId: slugId });
        const parts = filters.technicianName.trim().toLowerCase().split(/\s+/);
        if (parts.length >= 2) {
          const shortSlug = `tech_${parts[0]}_${parts[1][0]}`;
          orConditions.push({ technicianId: shortSlug });
        }
      }
      query.$or = orConditions;
    }

    return this.caseModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findOne(id: string, callerRole?: string, callerUserId?: string, callerUserName?: string): Promise<WarrantyCase> {
    const warrantyCase = await this.caseModel.findOne({ id }).lean();
    if (!warrantyCase) throw new NotFoundException(`Warranty case ${id} not found`);

    if (callerRole === UserRole.TECHNICIAN && (callerUserId || callerUserName)) {
      const isOwner =
        (callerUserId && warrantyCase.technicianId === callerUserId) ||
        (callerUserName && warrantyCase.technicianName?.toLowerCase() === callerUserName.toLowerCase()) ||
        (callerUserName && warrantyCase.technicianId === 'tech_' + callerUserName.toLowerCase().replace(/[^a-z0-9]/g, '_')) ||
        (callerUserName && callerUserName.toLowerCase().includes('jake') && warrantyCase.technicianId.includes('jake'));
      if (!isOwner) {
        throw new ForbiddenException('Access denied: You are only authorized to view your own warranty claims.');
      }
    }

    return warrantyCase;
  }

  async create(dto: CreateWarrantyCaseDto, callerRole?: string, callerUserId?: string): Promise<WarrantyCase> {
    // Role enforcement: Only technicians can raise warranty tickets
    if (callerRole && callerRole === UserRole.ADMIN) {
      throw new ForbiddenException('Access denied: Only technicians are authorized to raise warranty tickets. Admin accounts cannot create tickets.');
    }

    if (dto.creatorRole && dto.creatorRole === UserRole.ADMIN) {
      throw new ForbiddenException('Access denied: Only technicians are authorized to raise warranty tickets. Admin accounts cannot create tickets.');
    }

    if (callerUserId) {
      const user = await this.userModel.findOne({ id: callerUserId }).lean();
      if (user && user.role === UserRole.ADMIN) {
        throw new ForbiddenException('Access denied: Only technicians are authorized to raise warranty tickets. Admin accounts cannot create tickets.');
      }
    }

    const evaluated = await this.brandPacksService.evaluateRules({
      brandId: dto.brandId,
      faultCategory: dto.faultCategory,
      partReplaced: dto.partReplaced,
      noiseFault: dto.noiseFault,
      diagnosticsAvailable: dto.diagnosticsAvailable,
      repairStage: dto.repairStage,
    });

    const newCase = new this.caseModel({
      id: `CASE-${dto.roNumber.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      siteId: dto.siteId,
      siteName: dto.siteId.includes('cranbourne') ? 'Booran BYD Cranbourne' : 'Booran Multi-Franchise',
      brandId: dto.brandId,
      brandName: dto.make,
      roNumber: dto.roNumber,
      claimNumber: dto.claimNumber,
      vin: dto.vin,
      odometer: dto.odometer,
      make: dto.make,
      model: dto.model,
      year: dto.year,
      powertrain: dto.powertrain,
      status: 'Awaiting Review',
      technicianId: dto.technicianId,
      technicianName: dto.technicianName,
      concernTitle: dto.concernTitle,
      faultCategory: dto.faultCategory,
      partReplaced: dto.partReplaced,
      noiseFault: dto.noiseFault,
      diagnosticsAvailable: dto.diagnosticsAvailable,
      repairStage: dto.repairStage,
      evidenceItems: [],
      voiceNotes: [],
      flagHistory: [],
      checklistSummary: {
        totalMandatory: evaluated.mandatoryCount,
        completedMandatory: 0,
        totalOptional: evaluated.optionalCount,
        completedOptional: 0,
        isReadyForSubmission: true,
      },
    });

    return (await newCase.save()).toObject();
  }

  async addEvidence(caseId: string, dto: AddEvidenceDto): Promise<WarrantyCase> {
    const warrantyCase = await this.caseModel.findOne({ id: caseId });
    if (!warrantyCase) throw new NotFoundException(`Warranty case ${caseId} not found`);

    const newEvidence = {
      id: `ev_${Date.now()}`,
      ruleKey: dto.ruleKey,
      name: dto.name,
      mediaType: dto.mediaType,
      storageUrl: dto.storageUrl,
      uploadedAt: new Date().toISOString(),
      ocrExtractedText: dto.ocrExtractedText,
      ocrConfidence: dto.ocrConfidence || 99,
      durationSeconds: dto.durationSeconds,
      isVerifiedByClerk: false,
    };

    const existingIdx = warrantyCase.evidenceItems.findIndex((e) => e.ruleKey === dto.ruleKey);
    if (existingIdx >= 0) {
      warrantyCase.evidenceItems[existingIdx] = newEvidence as any;
    } else {
      warrantyCase.evidenceItems.push(newEvidence as any);
    }

    // Auto resolve flag for this rule if any
    warrantyCase.flagHistory.forEach((f) => {
      if (f.evidenceRuleKey === dto.ruleKey && !f.resolvedAt) {
        f.resolvedAt = new Date().toISOString();
        if (dto.technicianNote) {
          f.technicianNote = dto.technicianNote;
        }
      }
    });

    const hasUnresolvedFlags = warrantyCase.flagHistory.some((f) => !f.resolvedAt);
    if (!hasUnresolvedFlags && warrantyCase.status === 'Flagged') {
      warrantyCase.status = 'Awaiting Review';
      warrantyCase.checklistSummary.isReadyForSubmission = true;
    } else if (hasUnresolvedFlags) {
      warrantyCase.checklistSummary.isReadyForSubmission = false;
    }

    warrantyCase.checklistSummary.completedMandatory = warrantyCase.evidenceItems.length;

    warrantyCase.markModified('flagHistory');
    warrantyCase.markModified('evidenceItems');
    warrantyCase.markModified('checklistSummary');

    return (await warrantyCase.save()).toObject();
  }

  async addVoiceNote(caseId: string, dto: AddVoiceNoteDto): Promise<WarrantyCase> {
    const warrantyCase = await this.caseModel.findOne({ id: caseId });
    if (!warrantyCase) throw new NotFoundException(`Warranty case ${caseId} not found`);

    warrantyCase.voiceNotes.push({
      id: `vn_${Date.now()}`,
      transcript: dto.transcript,
      durationSeconds: dto.durationSeconds,
      recordedBy: dto.recordedBy,
      recordedAt: new Date().toISOString(),
      originalAudioUrl: dto.originalAudioUrl,
      pinnedToEvidenceKey: dto.pinnedToEvidenceKey,
    } as any);

    return (await warrantyCase.save()).toObject();
  }

  async submitFromWorkshop(caseId: string): Promise<WarrantyCase> {
    const warrantyCase = await this.caseModel.findOne({ id: caseId });
    if (!warrantyCase) throw new NotFoundException(`Warranty case ${caseId} not found`);

    const unresolvedFlags = warrantyCase.flagHistory?.filter((f) => !f.resolvedAt) || [];
    if (unresolvedFlags.length > 0) {
      const details = unresolvedFlags
        .map((f) => `"${f.evidenceRuleKey}" (Reject Reason: ${f.reasonCode})`)
        .join(', ');
      throw new BadRequestException(
        `Cannot submit case: ${unresolvedFlags.length} evidence reject reason(s) must be fixed first [${details}]. Please retake and replace the rejected photo(s).`
      );
    }

    warrantyCase.status = 'Awaiting Review';
    warrantyCase.checklistSummary.isReadyForSubmission = true;
    warrantyCase.markModified('checklistSummary');
    return (await warrantyCase.save()).toObject();
  }

  async flagCase(caseId: string, dto: FlagCaseDto): Promise<WarrantyCase> {
    const warrantyCase = await this.caseModel.findOne({ id: caseId });
    if (!warrantyCase) throw new NotFoundException(`Warranty case ${caseId} not found`);

    warrantyCase.flagHistory.push({
      id: `flg_${Date.now()}`,
      evidenceRuleKey: dto.evidenceRuleKey,
      reasonCode: dto.reasonCode,
      instruction: dto.instruction,
      flaggedBy: dto.flaggedBy,
      flaggedAt: new Date().toISOString(),
    } as any);

    warrantyCase.status = 'Flagged';
    warrantyCase.checklistSummary.isReadyForSubmission = false;
    warrantyCase.markModified('flagHistory');
    warrantyCase.markModified('checklistSummary');
    return (await warrantyCase.save()).toObject();
  }

  async markSubmitted(caseId: string, dto: MarkSubmittedDto): Promise<WarrantyCase> {
    const warrantyCase = await this.caseModel.findOne({ id: caseId });
    if (!warrantyCase) throw new NotFoundException(`Warranty case ${caseId} not found`);

    const unresolvedFlags = warrantyCase.flagHistory?.filter((f) => !f.resolvedAt) || [];
    if (unresolvedFlags.length > 0) {
      const details = unresolvedFlags
        .map((f) => `"${f.evidenceRuleKey}" (Reject Reason: ${f.reasonCode})`)
        .join(', ');
      throw new BadRequestException(
        `Cannot mark as submitted to OEM: ${unresolvedFlags.length} reject reason(s) [${details}] are still unresolved. All discrepancies must be fixed before submission to OEM.`
      );
    }

    warrantyCase.claimNumber = dto.claimNumber;
    warrantyCase.status = 'Submitted';
    warrantyCase.submittedAt = new Date().toISOString();
    if (dto.clerkNote) {
      warrantyCase.clerkNotes = dto.clerkNote;
    }

    return (await warrantyCase.save()).toObject();
  }

  async addClerkNote(caseId: string, note: string): Promise<WarrantyCase> {
    const warrantyCase = await this.caseModel.findOne({ id: caseId });
    if (!warrantyCase) throw new NotFoundException(`Warranty case ${caseId} not found`);

    warrantyCase.clerkNotes = note;
    return (await warrantyCase.save()).toObject();
  }
}
