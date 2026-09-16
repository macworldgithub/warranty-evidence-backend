import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';
import { FaultCategory, RepairStage } from '../../common/enums';
import { BrandPack, BrandPackDocument } from '../../schemas/brand-pack.schema';

export class EvaluateRulesDto {
  @ApiProperty({ example: 'brand_byd' })
  @IsString()
  brandId: string;

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
}

export class EvaluatedRulesResponseDto {
  @ApiProperty({ example: 'brandpack_byd_v1' })
  brandPackId: string;

  @ApiProperty({ example: 1 })
  brandPackVersion: number;

  @ApiProperty({ example: 'BYD-WB-2602-02 Attachment A (Live v1)' })
  packName: string;

  @ApiProperty()
  resolvedRules: any[];

  @ApiProperty({ example: 8 })
  mandatoryCount: number;

  @ApiProperty({ example: 2 })
  optionalCount: number;
}

export class CreateEvidenceRuleDto {
  @ApiProperty({ example: 'rule_battery_seal_check', required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'battery_seal_check' })
  @IsString()
  ruleKey: string;

  @ApiProperty({ example: 'HV Battery Enclosure Seal Inspection' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'High-resolution photo showing battery perimeter gasket seal intact with zero pinch defects.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['image', 'video', 'document', 'audio'], example: 'image' })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiProperty({ enum: [1, 2], example: 2 })
  @IsOptional()
  tier?: number;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiProperty({ example: '[DealerRONumber]BatterySeal.jpg' })
  @IsOptional()
  @IsString()
  namingConvention?: string;

  @ApiProperty({ example: 'Fill frame with perimeter gasket seal. Zero blur.', required: false })
  @IsOptional()
  @IsString()
  guidanceText?: string;

  @ApiProperty({ example: 'data:image/jpeg;base64,... or https://storage.url/example.jpg', required: false })
  @IsOptional()
  @IsString()
  exampleImageUrl?: string;

  @ApiProperty({ type: [String], example: [], required: false })
  @IsOptional()
  @IsArray()
  faultCategorySpecific?: string[];

  @IsOptional()
  @IsNumber()
  minDurationSeconds?: number;

  @IsOptional()
  @IsNumber()
  maxDurationSeconds?: number;
}

export class BatchCreateRulesDto {
  rules: CreateEvidenceRuleDto[];
}

@Injectable()
export class BrandPacksService implements OnModuleInit {
  constructor(
    @InjectModel(BrandPack.name) private packModel: Model<BrandPackDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.packModel.countDocuments();
    if (count === 0) {
      console.log('🍃 Seeding default Brand Packs (BYD Attachment A) into MongoDB...');
      const defaultPacks = [
        {
          id: 'brandpack_byd_v1',
          brandId: 'brand_byd',
          brandName: 'BYD',
          version: 1,
          status: 'PUBLISHED',
          name: 'BYD Attachment A — Evidence & Defect Standard (Live v1)',
          description: 'Official BYD-WB-2602-02 Attachment A photo and video checklist with Tier 2 defect gates',
          publishedAt: '2026-09-03T00:00:00.000Z',
          publishedBy: 'OmniSuiteAI OEM Standards Team',
          rules: [
            {
              id: 'rule_vin_photo',
              ruleKey: 'vin_photo',
              name: 'VIN Plate / VDS Printout',
              description: 'Capture clear photo of the B-pillar VIN plate or windscreen barcode. Ensure characters are razor sharp.',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]VIN.jpg',
              guidanceText: 'Plate or VDS printout. VIN characters must be readable.',
            },
            {
              id: 'rule_odometer_photo',
              ruleKey: 'odometer_photo',
              name: 'Odometer Cluster',
              description: 'Cluster in frame with vehicle powered on. On PHEV/Hybrid show EV + HV mileage screen.',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]Odo.jpg',
              guidanceText: 'Cluster in frame. Reading confirmed by tech.',
            },
            {
              id: 'rule_front_vehicle_photo',
              ruleKey: 'front_vehicle_photo',
              name: 'Front of Vehicle Reference',
              description: 'Guided overlay shot showing complete front 3/4 of vehicle with rego plate readable.',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]FrontOfCar.jpg',
              guidanceText: 'Identification reference. Overlay guides framing. Fill frame.',
            },
            {
              id: 'rule_fault_closeup',
              ruleKey: 'fault_closeup',
              name: 'Fault Close-up',
              description: 'Macro / tight close-up shot where defect fills 70%+ of frame with good lighting/torch.',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]FaultClose.jpg',
              guidanceText: 'Defect fills the frame. Flash / torch toggle.',
            },
            {
              id: 'rule_fault_location',
              ruleKey: 'fault_location',
              name: 'Fault Location / Orientation',
              description: 'Medium-wide contextual shot showing where the defect sits relative to the car/subsystem.',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]FaultLocation.jpg',
              guidanceText: 'Wider shot showing where the defect sits on the vehicle.',
            },
            {
              id: 'rule_old_part_serial',
              ruleKey: 'old_part_serial',
              name: 'Old Part Serial & Barcode',
              description: 'Scan QR / 2D barcode or clear photo of stamped serial on defective part removed from car.',
              mediaType: 'image',
              tier: 2,
              isMandatory: true,
              namingConvention: '[DealerRONumber]OldPartSerial.jpg',
              guidanceText: 'Barcode / QR scan first; photo of the marking as proof.',
            },
            {
              id: 'rule_new_part_serial',
              ruleKey: 'new_part_serial',
              name: 'New Part Serial & Packaging',
              description: 'Scan barcode of replacement OEM part before installation. Serial must differ from old part.',
              mediaType: 'image',
              tier: 2,
              isMandatory: true,
              namingConvention: '[DealerRONumber]NewPartSerial.jpg',
              guidanceText: 'System warns if new serial equals old serial.',
            },
            {
              id: 'rule_diagnostic_evidence',
              ruleKey: 'diagnostic_evidence',
              name: 'VDS / DTC Diagnostic Screenshot',
              description: 'Screenshot or photo of BYD VDS scanner showing active DTC, freeze-frame, or calibration pass.',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]DTC.jpg',
              guidanceText: 'Photo of VDS / DTC screen, calibration result or software version.',
            },
            {
              id: 'rule_video_before',
              ruleKey: 'video_before',
              name: 'Fault Video (Noise / Operational)',
              description: 'Record 30-60s MP4 capturing abnormal noise or operational malfunction with clear workshop audio.',
              mediaType: 'video',
              tier: 1,
              isMandatory: true,
              minDurationSeconds: 10,
              maxDurationSeconds: 60,
              namingConvention: '[DealerRONumber]KnockingNoise(Before).mp4',
              guidanceText: 'In-app recorder, suggested max 60s, microphone active for rattle/whine.',
            },
            {
              id: 'rule_after_repair_photo',
              ruleKey: 'after_repair_photo',
              name: 'Post-Repair Completed Fitment',
              description: 'Photo of new part installed, torqued, and cleaned, using same angle as fault location shot.',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]AfterRepair.jpg',
              guidanceText: 'Same framing as before so warranty clerks can compare directly.',
            },
            {
              id: 'rule_tier2_hv_isolation',
              ruleKey: 'tier2_hv_isolation',
              name: 'HV Disconnect & Safety Isolator',
              description: 'Photo of manual service disconnect (MSD) pulled and lockout tag in place.',
              mediaType: 'image',
              tier: 2,
              isMandatory: true,
              namingConvention: '[DealerRONumber]HV_SafetyIsolation.jpg',
              guidanceText: 'Confirms technician high-voltage safety protocol compliance before pack access.',
              faultCategorySpecific: [FaultCategory.BATTERY_HV, FaultCategory.CHARGING_SYSTEM],
            },
            {
              id: 'rule_tier2_hv_pack_label',
              ruleKey: 'tier2_hv_pack_label',
              name: 'HV Battery Pack Serial Label',
              description: 'Clear macro photo of the BYD Blade Battery pack data label and QR code.',
              mediaType: 'image',
              tier: 2,
              isMandatory: true,
              namingConvention: '[DealerRONumber]HV_PackSerial.jpg',
              guidanceText: 'Blade battery pack QR and part number label.',
              faultCategorySpecific: [FaultCategory.BATTERY_HV],
            },
          ],
        },
        {
          id: 'brandpack_common_v1',
          brandId: 'brand_common',
          brandName: 'Common Tier 1 Standards',
          version: 1,
          status: 'PUBLISHED',
          name: 'Multi-Brand Tier 1 Common Core Standard (v1)',
          description: 'Standard baseline evidence pack applicable to Hyundai, Kia, MG, Chery, Toyota, Ford, Mitsubishi',
          publishedAt: '2026-09-03T00:00:00.000Z',
          publishedBy: 'Booran Group Operations',
          rules: [
            {
              id: 'rule_c_vin',
              ruleKey: 'vin_photo',
              name: 'VIN Plate Photo',
              description: 'Windscreen or door pillar VIN plate',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]VIN.jpg',
            },
            {
              id: 'rule_c_odo',
              ruleKey: 'odometer_photo',
              name: 'Odometer Cluster Photo',
              description: 'Cluster reading odometer kilometers',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]Odo.jpg',
            },
            {
              id: 'rule_c_fault',
              ruleKey: 'fault_closeup',
              name: 'Fault Defect Photo',
              description: 'Close-up of defect area',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]FaultClose.jpg',
            },
            {
              id: 'rule_c_location',
              ruleKey: 'fault_location',
              name: 'Defect Location Orientation',
              description: 'Contextual location relative to vehicle',
              mediaType: 'image',
              tier: 1,
              isMandatory: true,
              namingConvention: '[DealerRONumber]FaultLocation.jpg',
            },
          ],
        },
      ];
      for (const pack of defaultPacks) {
        await this.packModel.updateOne(
          { id: pack.id },
          { $set: pack },
          { upsert: true },
        );
      }
      console.log(`🍃 Successfully synchronized ${defaultPacks.length} Brand Packs in MongoDB`);
    }
  }

  async findAll(): Promise<BrandPack[]> {
    return this.packModel.find().lean();
  }

  async findOne(id: string): Promise<BrandPack> {
    const pack = await this.packModel.findOne({ id }).lean();
    if (!pack) throw new NotFoundException(`Brand pack with id ${id} not found`);
    return pack;
  }

  async findActiveByBrand(brandId: string): Promise<BrandPack> {
    let pack = await this.packModel.findOne({ brandId, status: 'PUBLISHED' }).lean();
    if (!pack) {
      pack = await this.packModel.findOne({ id: 'brandpack_byd_v1' }).lean();
    }
    if (!pack) {
      throw new NotFoundException(`No active Brand Pack found for brand ${brandId}`);
    }
    return pack;
  }

  async evaluateRules(dto: EvaluateRulesDto): Promise<EvaluatedRulesResponseDto> {
    const pack = await this.findActiveByBrand(dto.brandId);

    const resolved: any[] = [];
    for (const rule of pack.rules) {
      // Check tier 1 base rules
      if (['vin_photo', 'odometer_photo', 'front_vehicle_photo', 'fault_closeup', 'fault_location'].includes(rule.ruleKey)) {
        resolved.push(rule);
        continue;
      }

      // Check part replacement condition
      if (['old_part_serial', 'new_part_serial'].includes(rule.ruleKey)) {
        if (dto.partReplaced) resolved.push(rule);
        continue;
      }

      // Check diagnostic condition
      if (rule.ruleKey === 'diagnostic_evidence') {
        if (dto.diagnosticsAvailable) resolved.push(rule);
        continue;
      }

      // Check noise video condition
      if (rule.ruleKey === 'video_before') {
        if (dto.noiseFault) resolved.push(rule);
        continue;
      }

      // Check repair stage condition
      if (rule.ruleKey === 'after_repair_photo') {
        if (dto.repairStage === RepairStage.REPAIR_COMPLETE) resolved.push(rule);
        continue;
      }

      // Check Category Specific Tier 2 (HV components)
      if (rule.faultCategorySpecific && rule.faultCategorySpecific.length > 0) {
        if (rule.faultCategorySpecific.includes(dto.faultCategory)) {
          resolved.push(rule);
        }
        continue;
      }

      resolved.push(rule);
    }

    const mandatoryCount = resolved.filter((r) => r.isMandatory).length;
    const optionalCount = resolved.length - mandatoryCount;

    return {
      brandPackId: pack.id,
      brandPackVersion: pack.version,
      packName: pack.name,
      resolvedRules: resolved,
      mandatoryCount,
      optionalCount,
    };
  }

  async cloneVersion(id: string): Promise<BrandPack> {
    const source = await this.findOne(id);
    const newVersion = source.version + 1;
    const newId = `${source.brandId}_v${newVersion}_draft_${Date.now().toString().slice(-4)}`;
    const baseName = source.name.replace(/\s*\((?:Draft|Live)\s*v\d+\)/gi, '').trim();

    const cloned = new this.packModel({
      id: newId,
      brandId: source.brandId,
      brandName: source.brandName,
      version: newVersion,
      status: 'DRAFT',
      name: `${baseName} (Draft v${newVersion})`,
      description: `Draft v${newVersion} working copy of ${baseName}`,
      rules: source.rules,
    });

    return (await cloned.save()).toObject();
  }

  async publish(id: string): Promise<BrandPack> {
    const pack = await this.packModel.findOne({ id });
    if (!pack) throw new NotFoundException(`Brand pack with id ${id} not found`);

    // Archive current published pack for this brand
    await this.packModel.updateMany(
      { brandId: pack.brandId, status: 'PUBLISHED' },
      { $set: { status: 'ARCHIVED' } },
    );

    const baseName = pack.name.replace(/\s*\((?:Draft|Live)\s*v\d+\)/gi, '').trim();
    pack.name = `${baseName} (Live v${pack.version})`;
    pack.status = 'PUBLISHED';
    pack.publishedAt = new Date().toISOString();
    pack.publishedBy = 'Sarah Jenkins (Warranty Clerk)';

    return (await pack.save()).toObject();
  }

  async addRule(packId: string, ruleDto: CreateEvidenceRuleDto): Promise<BrandPack> {
    const pack = await this.packModel.findOne({ id: packId });
    if (!pack) throw new NotFoundException(`Brand pack with id ${packId} not found`);

    const sanitizedKey = ruleDto.ruleKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const ruleId = ruleDto.id || `rule_${sanitizedKey}_${Date.now().toString().slice(-4)}`;

    const newRule = {
      id: ruleId,
      ruleKey: sanitizedKey,
      name: ruleDto.name.trim(),
      description: ruleDto.description?.trim() || ruleDto.name.trim(),
      mediaType: ruleDto.mediaType || 'image',
      tier: Number(ruleDto.tier) === 2 ? 2 : 1,
      isMandatory: Boolean(ruleDto.isMandatory),
      namingConvention: ruleDto.namingConvention?.trim() || `[DealerRONumber]${sanitizedKey}.jpg`,
      guidanceText: ruleDto.guidanceText?.trim() || '',
      exampleImageUrl: ruleDto.exampleImageUrl?.trim() || undefined,
      faultCategorySpecific: ruleDto.faultCategorySpecific || [],
      minDurationSeconds: ruleDto.minDurationSeconds,
      maxDurationSeconds: ruleDto.maxDurationSeconds,
    };

    // If rule with ruleKey exists, update it, otherwise push new rule
    const existingIndex = pack.rules.findIndex((r) => r.ruleKey === sanitizedKey);
    if (existingIndex >= 0) {
      pack.rules[existingIndex] = newRule as any;
    } else {
      pack.rules.push(newRule as any);
    }

    pack.markModified('rules');
    return (await pack.save()).toObject();
  }

  async batchAddRules(packId: string, rules: CreateEvidenceRuleDto[]): Promise<BrandPack> {
    const pack = await this.packModel.findOne({ id: packId });
    if (!pack) throw new NotFoundException(`Brand pack with id ${packId} not found`);

    for (const ruleDto of rules) {
      if (!ruleDto.ruleKey || !ruleDto.name) continue;
      const sanitizedKey = ruleDto.ruleKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const ruleId = ruleDto.id || `rule_${sanitizedKey}_${Date.now().toString().slice(-4)}`;

      const newRule = {
        id: ruleId,
        ruleKey: sanitizedKey,
        name: ruleDto.name.trim(),
        description: ruleDto.description?.trim() || ruleDto.name.trim(),
        mediaType: ruleDto.mediaType || 'image',
        tier: Number(ruleDto.tier) === 2 ? 2 : 1,
        isMandatory: Boolean(ruleDto.isMandatory),
        namingConvention: ruleDto.namingConvention?.trim() || `[DealerRONumber]${sanitizedKey}.jpg`,
        guidanceText: ruleDto.guidanceText?.trim() || '',
        exampleImageUrl: ruleDto.exampleImageUrl?.trim() || undefined,
        faultCategorySpecific: ruleDto.faultCategorySpecific || [],
        minDurationSeconds: ruleDto.minDurationSeconds,
        maxDurationSeconds: ruleDto.maxDurationSeconds,
      };

      const existingIndex = pack.rules.findIndex((r) => r.ruleKey === sanitizedKey);
      if (existingIndex >= 0) {
        pack.rules[existingIndex] = newRule as any;
      } else {
        pack.rules.push(newRule as any);
      }
    }

    pack.markModified('rules');
    return (await pack.save()).toObject();
  }
}
