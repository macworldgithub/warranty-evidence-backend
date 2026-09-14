
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CaseStatus, FaultCategory, FlagReasonCode, MediaType, PowertrainType, RepairStage, UserRole } from '../../common/enums';
import { BrandPacksService } from '../brand-packs/brand-packs.service';
import { StorageService } from '../../common/storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private storageService: StorageService,
    private notificationsService: NotificationsService,
  ) { }

  private async getAdminEmails(): Promise<string[]> {
    try {
      const admins = await this.userModel.find({ role: UserRole.ADMIN, isActive: true }).lean();
      const emails = admins.map((a) => a.email).filter(Boolean);
      if (emails.length > 0) {
        return emails;
      }
    } catch (err: any) {
      console.error('[WarrantyCasesService] Error retrieving admin emails:', err?.message);
    }
    return ['admin@booran.com.au'];
  }

  private async getTechnicianEmail(technicianId: string, technicianName?: string): Promise<string> {
    try {
      const techUser = await this.userModel.findOne({
        $or: [
          { id: technicianId },
          ...(technicianName ? [{ name: new RegExp(`^${technicianName}$`, 'i') }] : []),
          ...(technicianName ? [{ email: new RegExp(technicianName.split(' ')[0], 'i') }] : []),
        ],
      }).lean();

      if (techUser?.email) {
        return techUser.email;
      }
    } catch (err: any) {
      console.error('[WarrantyCasesService] Error finding technician email:', err?.message);
    }
    return 'technician@booran.com.au';
  }

  async onModuleInit() {
    {
      console.log('🍃 Synchronizing sample Warranty Cases into MongoDB Atlas...');
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
        // ── Cranbourne BYD: 2nd Flagged Case ──
        {
          id: 'CASE-CR-2026-FLG2',
          siteId: 'site_cranbourne_byd',
          siteName: 'Booran BYD Cranbourne',
          brandId: 'brand_byd',
          brandName: 'BYD',
          roNumber: 'CR-77201',
          vin: 'LGXCE6C52R0028471',
          odometer: 8320,
          make: 'BYD',
          model: 'Seal Premium',
          year: 2025,
          powertrain: 'EV',
          status: 'Flagged',
          technicianId: 'tech_jake_s',
          technicianName: 'Jake Smith',
          concernTitle: 'Rear drive unit bearing whine under regen braking',
          faultCategory: 'Powertrain, chassis or body component faults',
          partReplaced: false,
          noiseFault: true,
          diagnosticsAvailable: true,
          repairStage: 'During repair',
          evidenceItems: [
            { id: 'ev_crflg2_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-08T09:00:00.000Z', ocrExtractedText: 'LGXCE6C52R0028471', ocrConfidence: 97.1 },
            { id: 'ev_crflg2_2', ruleKey: 'odometer_photo', name: 'Odometer Cluster', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-08T09:02:00.000Z', ocrExtractedText: '8320 km', ocrConfidence: 98.5 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_crflg2_1', evidenceRuleKey: 'noise_video', reasonCode: 'VIDEO_TOO_SHORT', instruction: 'Noise reproduction video is only 3 seconds. BYD Attachment A requires minimum 15-second continuous recording with regen braking audible. Please retake a full deceleration sweep.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-08T11:30:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 6, completedMandatory: 2, totalOptional: 3, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'Noise video too short — need 15s minimum under regen braking.',
        },
        // ── Dandenong Multi-Franchise: 2nd Flagged ──
        {
          id: 'CASE-DAN-2026-FLG2',
          siteId: 'site_dandenong_multi',
          siteName: 'Booran Dandenong Multi-Franchise',
          brandId: 'brand_kia',
          brandName: 'Kia',
          roNumber: 'DAN-40288',
          vin: 'KNAB381ACR5014827',
          odometer: 18450,
          make: 'Kia',
          model: 'EV6 GT-Line',
          year: 2024,
          powertrain: 'EV',
          status: 'Flagged',
          technicianId: 'tech_tom_r',
          technicianName: 'Tom Roberts',
          concernTitle: 'Vehicle-to-Load (V2L) adapter intermittent cutout at 2kW draw',
          faultCategory: 'Charging system faults',
          partReplaced: true,
          noiseFault: false,
          diagnosticsAvailable: true,
          repairStage: 'Repair complete',
          evidenceItems: [
            { id: 'ev_danflg2_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-07T10:15:00.000Z', ocrExtractedText: 'KNAB381ACR5014827', ocrConfidence: 99.2 },
            { id: 'ev_danflg2_2', ruleKey: 'odometer_photo', name: 'Odometer Reading', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-07T10:17:00.000Z', ocrExtractedText: '18450 km', ocrConfidence: 98.0 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_danflg2_1', evidenceRuleKey: 'old_part_serial', reasonCode: 'NO_SERIAL', instruction: 'Old V2L adapter barcode is not visible in the photo. Please retake with barcode label facing camera directly under adequate lighting.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-07T14:22:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 7, completedMandatory: 2, totalOptional: 1, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'Old part serial missing — retake required.',
        },
        // ── Dandenong Multi-Franchise: 3rd Flagged ──
        {
          id: 'CASE-DAN-2026-FLG3',
          siteId: 'site_dandenong_multi',
          siteName: 'Booran Dandenong Multi-Franchise',
          brandId: 'brand_hyundai',
          brandName: 'Hyundai',
          roNumber: 'DAN-40301',
          vin: 'KMHK381DCRU102934',
          odometer: 41200,
          make: 'Hyundai',
          model: 'Ioniq 5 AWD',
          year: 2023,
          powertrain: 'EV',
          status: 'Flagged',
          technicianId: 'tech_liam_m',
          technicianName: 'Liam Miller',
          concernTitle: 'Infotainment display intermittent black screen with DTC B1680',
          faultCategory: 'ECU or sensor internal faults',
          partReplaced: false,
          noiseFault: false,
          diagnosticsAvailable: true,
          repairStage: 'During repair',
          evidenceItems: [
            { id: 'ev_danflg3_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-08T07:30:00.000Z', ocrExtractedText: 'KMHK381DCRU102934', ocrConfidence: 96.8 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_danflg3_1', evidenceRuleKey: 'dtc_scanner_photo', reasonCode: 'NO_DTC', instruction: 'DTC scanner confirmation photo is missing. Hyundai warranty requires a clear GDS scan screenshot showing DTC B1680 logged and freeze-frame data.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-08T09:15:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 5, completedMandatory: 1, totalOptional: 2, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'DTC scanner evidence completely missing.',
        },
        // ── Dandenong Multi-Franchise: 4th Flagged ──
        {
          id: 'CASE-DAN-2026-FLG4',
          siteId: 'site_dandenong_multi',
          siteName: 'Booran Dandenong Multi-Franchise',
          brandId: 'brand_hyundai',
          brandName: 'Hyundai',
          roNumber: 'DAN-40315',
          vin: 'KMHJ181CDRU087612',
          odometer: 27500,
          make: 'Hyundai',
          model: 'Kona Electric',
          year: 2024,
          powertrain: 'EV',
          status: 'Flagged',
          technicianId: 'tech_tom_r',
          technicianName: 'Tom Roberts',
          concernTitle: 'AC compressor clutch engagement noise on cold start',
          faultCategory: 'Powertrain, chassis or body component faults',
          partReplaced: false,
          noiseFault: true,
          diagnosticsAvailable: false,
          repairStage: 'Pre-repair only',
          evidenceItems: [
            { id: 'ev_danflg4_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-08T13:00:00.000Z', ocrExtractedText: 'KMHJ181CDRU087612', ocrConfidence: 98.3 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_danflg4_1', evidenceRuleKey: 'fault_closeup', reasonCode: 'WRONG_ANGLE', instruction: 'Compressor close-up is shot from the wrong angle — clutch face is not visible. Retake from passenger-side wheel arch looking inward at the compressor clutch plate.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-08T15:40:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 6, completedMandatory: 1, totalOptional: 3, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'Wrong angle — compressor clutch not visible.',
        },
        // ── Cheltenham MG & Chery: 1st Flagged ──
        {
          id: 'CASE-CHEL-2026-FLG1',
          siteId: 'site_cheltenham_mg',
          siteName: 'Booran MG & Chery Cheltenham',
          brandId: 'brand_mg',
          brandName: 'MG',
          roNumber: 'CHEL-20105',
          vin: 'LSJW26897RH034821',
          odometer: 12400,
          make: 'MG',
          model: 'MG4 EV Excite 64',
          year: 2024,
          powertrain: 'EV',
          status: 'Flagged',
          technicianId: 'tech_ben_w',
          technicianName: 'Ben Walker',
          concernTitle: '12V auxiliary battery premature drain causing no-start condition',
          faultCategory: 'Battery and high-voltage (HV) components',
          partReplaced: true,
          noiseFault: false,
          diagnosticsAvailable: true,
          repairStage: 'Repair complete',
          evidenceItems: [
            { id: 'ev_chelflg1_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-07T08:00:00.000Z', ocrExtractedText: 'LSJW26897RH034821', ocrConfidence: 97.5 },
            { id: 'ev_chelflg1_2', ruleKey: 'odometer_photo', name: 'Odometer', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-07T08:02:00.000Z', ocrExtractedText: '12400 km', ocrConfidence: 99.1 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_chelflg1_1', evidenceRuleKey: 'new_part_serial', reasonCode: 'NO_SERIAL', instruction: 'New 12V battery serial barcode is obscured by terminal clamp. Retake with clamp removed so full barcode label is legible.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-07T11:00:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 7, completedMandatory: 2, totalOptional: 1, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'New part serial obscured.',
        },
        // ── Cheltenham MG & Chery: 2nd Flagged ──
        {
          id: 'CASE-CHEL-2026-FLG2',
          siteId: 'site_cheltenham_mg',
          siteName: 'Booran MG & Chery Cheltenham',
          brandId: 'brand_chery',
          brandName: 'Chery',
          roNumber: 'CHEL-20118',
          vin: 'LVTDB21B4R0045812',
          odometer: 6800,
          make: 'Chery',
          model: 'Omoda 5',
          year: 2025,
          powertrain: 'ICE',
          status: 'Flagged',
          technicianId: 'tech_ben_w',
          technicianName: 'Ben Walker',
          concernTitle: 'Panoramic sunroof rattle at highway speeds over 100km/h',
          faultCategory: 'Powertrain, chassis or body component faults',
          partReplaced: false,
          noiseFault: true,
          diagnosticsAvailable: false,
          repairStage: 'Pre-repair only',
          evidenceItems: [
            { id: 'ev_chelflg2_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-08T07:45:00.000Z', ocrExtractedText: 'LVTDB21B4R0045812', ocrConfidence: 96.2 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_chelflg2_1', evidenceRuleKey: 'noise_video', reasonCode: 'VIDEO_TOO_SHORT', instruction: 'Noise reproduction video does not capture the rattle. Chery requires a 20-second highway-speed video with windows up. Road test video must be retaken.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-08T10:30:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 5, completedMandatory: 1, totalOptional: 3, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'Noise video does not reproduce the rattle audibly.',
        },
        // ── Cheltenham MG & Chery: 3rd Flagged ──
        {
          id: 'CASE-CHEL-2026-FLG3',
          siteId: 'site_cheltenham_mg',
          siteName: 'Booran MG & Chery Cheltenham',
          brandId: 'brand_mg',
          brandName: 'MG',
          roNumber: 'CHEL-20126',
          vin: 'LSJW36291SH041239',
          odometer: 22100,
          make: 'MG',
          model: 'ZS EV',
          year: 2024,
          powertrain: 'EV',
          status: 'Flagged',
          technicianId: 'tech_emma_d',
          technicianName: 'Emma Davis',
          concernTitle: 'Charge port lid actuator failing to release in sub-10°C conditions',
          faultCategory: 'Charging system faults',
          partReplaced: true,
          noiseFault: false,
          diagnosticsAvailable: true,
          repairStage: 'Repair complete',
          evidenceItems: [
            { id: 'ev_chelflg3_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-08T14:00:00.000Z', ocrExtractedText: 'LSJW36291SH041239', ocrConfidence: 97.8 },
            { id: 'ev_chelflg3_2', ruleKey: 'fault_closeup', name: 'Charge Port Actuator Close-up', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-08T14:05:00.000Z' },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_chelflg3_1', evidenceRuleKey: 'fault_closeup', reasonCode: 'POOR_LIGHTING_BLUR', instruction: 'Charge port actuator close-up is over-exposed from direct sunlight. Please retake under shade or inside the workshop with even lighting.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-08T16:20:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 7, completedMandatory: 2, totalOptional: 1, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'Fault close-up over-exposed — retake in shade.',
        },
        // ── Cheltenham MG & Chery: 4th Flagged ──
        {
          id: 'CASE-CHEL-2026-FLG4',
          siteId: 'site_cheltenham_mg',
          siteName: 'Booran MG & Chery Cheltenham',
          brandId: 'brand_chery',
          brandName: 'Chery',
          roNumber: 'CHEL-20139',
          vin: 'LVTDB21B9S0051947',
          odometer: 3200,
          make: 'Chery',
          model: 'Tiggo 7 Pro',
          year: 2025,
          powertrain: 'ICE',
          status: 'Flagged',
          technicianId: 'tech_emma_d',
          technicianName: 'Emma Davis',
          concernTitle: 'Front passenger seat heater element not activating — no warmth detected',
          faultCategory: 'General / other (Tier 1 only)',
          partReplaced: false,
          noiseFault: false,
          diagnosticsAvailable: false,
          repairStage: 'Pre-repair only',
          evidenceItems: [
            { id: 'ev_chelflg4_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-09T08:30:00.000Z', ocrExtractedText: 'LVTDB21B9S0051947', ocrConfidence: 98.0 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_chelflg4_1', evidenceRuleKey: 'fault_location', reasonCode: 'MISSING_SHOT', instruction: 'Missing a wide-angle location shot showing the passenger seat in the cabin. Required for Chery Attachment A to identify the fault area contextually.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-09T10:00:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 4, completedMandatory: 1, totalOptional: 1, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'Location shot missing — need wide cabin view.',
        },
        // ── Berwick Commercials: 1st Flagged ──
        {
          id: 'CASE-BER-2026-FLG1',
          siteId: 'site_berwick_toyota_ford',
          siteName: 'Booran Berwick Commercials',
          brandId: 'brand_toyota',
          brandName: 'Toyota',
          roNumber: 'BER-60201',
          vin: 'MROEZ39G901012483',
          odometer: 45200,
          make: 'Toyota',
          model: 'HiLux SR5 4x4',
          year: 2023,
          powertrain: 'ICE',
          status: 'Flagged',
          technicianId: 'tech_chris_k',
          technicianName: 'Chris Kelly',
          concernTitle: 'DPF regeneration failure — limp mode activation on highway',
          faultCategory: 'ECU or sensor internal faults',
          partReplaced: false,
          noiseFault: false,
          diagnosticsAvailable: true,
          repairStage: 'During repair',
          evidenceItems: [
            { id: 'ev_berflg1_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-06T08:00:00.000Z', ocrExtractedText: 'MROEZ39G901012483', ocrConfidence: 97.3 },
            { id: 'ev_berflg1_2', ruleKey: 'odometer_photo', name: 'Odometer', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-06T08:02:00.000Z', ocrExtractedText: '45200 km', ocrConfidence: 98.9 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_berflg1_1', evidenceRuleKey: 'dtc_scanner_photo', reasonCode: 'NO_DTC', instruction: 'Toyota Techstream DTC screenshot is missing. Please capture the full freeze-frame data showing P244A and soot loading % from Techstream.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-06T12:00:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 5, completedMandatory: 2, totalOptional: 2, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'Techstream DTC screenshot missing.',
        },
        // ── Berwick Commercials: 2nd Flagged ──
        {
          id: 'CASE-BER-2026-FLG2',
          siteId: 'site_berwick_toyota_ford',
          siteName: 'Booran Berwick Commercials',
          brandId: 'brand_ford',
          brandName: 'Ford',
          roNumber: 'BER-60219',
          vin: 'MNACXXMAWRHY48921',
          odometer: 31400,
          make: 'Ford',
          model: 'Ranger Wildtrak V6',
          year: 2024,
          powertrain: 'ICE',
          status: 'Flagged',
          technicianId: 'tech_chris_k',
          technicianName: 'Chris Kelly',
          concernTitle: 'Tailgate dent sensor false triggering during tray loading',
          faultCategory: 'General / other (Tier 1 only)',
          partReplaced: false,
          noiseFault: false,
          diagnosticsAvailable: false,
          repairStage: 'Pre-repair only',
          evidenceItems: [
            { id: 'ev_berflg2_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-07T09:00:00.000Z', ocrExtractedText: 'MNACXXMAWRHY48921', ocrConfidence: 96.9 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_berflg2_1', evidenceRuleKey: 'fault_location', reasonCode: 'WRONG_ANGLE', instruction: 'Tailgate sensor location photo needs to show the full tailgate from 2 meters back. Current angle only shows the handle — step back for the full tailgate view.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-07T13:30:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 4, completedMandatory: 1, totalOptional: 1, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'Wrong angle — need full tailgate view.',
        },
        // ── Berwick Commercials: 3rd Flagged ──
        {
          id: 'CASE-BER-2026-FLG3',
          siteId: 'site_berwick_toyota_ford',
          siteName: 'Booran Berwick Commercials',
          brandId: 'brand_isuzu',
          brandName: 'Isuzu',
          roNumber: 'BER-60234',
          vin: 'MPATFS86JRT051284',
          odometer: 58700,
          make: 'Isuzu',
          model: 'D-Max X-Terrain',
          year: 2023,
          powertrain: 'ICE',
          status: 'Flagged',
          technicianId: 'tech_ryan_p',
          technicianName: 'Ryan Patterson',
          concernTitle: 'Driver seat leather split along bolster seam — premature wear',
          faultCategory: 'General / other (Tier 1 only)',
          partReplaced: false,
          noiseFault: false,
          diagnosticsAvailable: false,
          repairStage: 'Pre-repair only',
          evidenceItems: [
            { id: 'ev_berflg3_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-08T07:30:00.000Z', ocrExtractedText: 'MPATFS86JRT051284', ocrConfidence: 97.6 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_berflg3_1', evidenceRuleKey: 'fault_closeup', reasonCode: 'POOR_LIGHTING_BLUR', instruction: 'Seat leather split close-up is blurry — the tear line is not sharp enough for Isuzu warranty assessment. Please use macro mode with good workshop lighting and retake.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-08T10:15:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 4, completedMandatory: 1, totalOptional: 1, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'Blurry defect photo — use macro mode.',
        },
        // ── Berwick Commercials: 4th Flagged ──
        {
          id: 'CASE-BER-2026-FLG4',
          siteId: 'site_berwick_toyota_ford',
          siteName: 'Booran Berwick Commercials',
          brandId: 'brand_toyota',
          brandName: 'Toyota',
          roNumber: 'BER-60248',
          vin: 'JTMW43FV50D019382',
          odometer: 15800,
          make: 'Toyota',
          model: 'LandCruiser 300 GX',
          year: 2024,
          powertrain: 'ICE',
          status: 'Flagged',
          technicianId: 'tech_ryan_p',
          technicianName: 'Ryan Patterson',
          concernTitle: 'Transfer case oil leak at rear output seal during off-road use',
          faultCategory: 'Oil leaks or seepage',
          partReplaced: false,
          noiseFault: false,
          diagnosticsAvailable: false,
          repairStage: 'During repair',
          evidenceItems: [
            { id: 'ev_berflg4_1', ruleKey: 'vin_photo', name: 'VIN Plate Photo', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-09T07:00:00.000Z', ocrExtractedText: 'JTMW43FV50D019382', ocrConfidence: 98.4 },
            { id: 'ev_berflg4_2', ruleKey: 'odometer_photo', name: 'Odometer', mediaType: 'image', storageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', uploadedAt: '2026-09-09T07:02:00.000Z', ocrExtractedText: '15800 km', ocrConfidence: 99.0 },
          ],
          voiceNotes: [],
          flagHistory: [
            { id: 'flg_berflg4_1', evidenceRuleKey: 'fault_closeup', reasonCode: 'POOR_LIGHTING_BLUR', instruction: 'Oil leak close-up is too dark — under-vehicle lighting is insufficient. Use a portable LED inspection lamp and retake showing the oil seepage trail clearly from the seal face.', flaggedBy: 'Sarah Jenkins (Warranty Clerk)', flaggedAt: '2026-09-09T09:30:00.000Z' },
          ],
          checklistSummary: { totalMandatory: 5, completedMandatory: 2, totalOptional: 2, completedOptional: 0, isReadyForSubmission: false },
          clerkNotes: 'Under-vehicle photo too dark — need LED lamp.',
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

    const savedCase = (await newCase.save()).toObject();

    // Trigger asynchronous email & push alerts to Admins (non-blocking)
    this.getAdminEmails()
      .then((adminEmails) => {
        this.notificationsService.sendNewTicketRaisedAlert(
          {
            caseId: savedCase.id,
            roNumber: savedCase.roNumber,
            vin: savedCase.vin,
            make: savedCase.make,
            model: savedCase.model,
            year: savedCase.year,
            concernTitle: savedCase.concernTitle,
            faultCategory: savedCase.faultCategory,
            technicianName: savedCase.technicianName,
            siteName: savedCase.siteName,
          },
          adminEmails,
        ).catch((err) => console.error('[Notifications] Failed to send new ticket alert:', err?.message));
      })
      .catch(() => {});

    this.notificationsService.sendNewTicketPushToAdmins({
      id: savedCase.id,
      roNumber: savedCase.roNumber,
      make: savedCase.make,
      model: savedCase.model,
      vin: savedCase.vin,
      technicianName: savedCase.technicianName,
    }).catch((err) => console.error('[Notifications] Failed to send new ticket push:', err?.message));

    return savedCase;
  }

  // ─── Real file upload — multipart/form-data ──────────────────────────────
  async uploadEvidence(
    caseId: string,
    file: Express.Multer.File,
    ruleKey: string,
    evidenceName: string,
    ocrExtractedText?: string,
  ): Promise<WarrantyCase> {
    const warrantyCase = await this.caseModel.findOne({ id: caseId });
    if (!warrantyCase) throw new NotFoundException(`Warranty case ${caseId} not found`);

    // Validate MIME type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed. Accepted: JPEG, PNG, WebP, MP4, WebM, PDF`,
      );
    }

    // Derive OEM filename: {roNumber}{RuleDescriptor}.{ext}
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'application/pdf': 'pdf',
    };
    const ext = extMap[file.mimetype] ?? 'bin';
    const descriptor = ruleKey
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
    const oemFileName = `${warrantyCase.roNumber}${descriptor}.${ext}`;

    // Determine mediaType enum
    const mediaTypeMap: Record<string, string> = {
      'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image',
      'video/mp4': 'video', 'video/webm': 'video',
      'application/pdf': 'document',
    };
    const mediaType = mediaTypeMap[file.mimetype] ?? 'document';

    // Upload to S3 or local disk
    const result = await this.storageService.uploadFile(
      file.buffer,
      file.mimetype,
      oemFileName,
      caseId,
    );

    // Build evidence subdoc
    const newEvidence: any = {
      id: `ev_${Date.now()}`,
      ruleKey,
      name: evidenceName || oemFileName,
      mediaType,
      storageUrl: result.url,
      thumbnailUrl: result.thumbnailUrl,
      oemFileName: result.oemFileName,
      uploadedAt: new Date().toISOString(),
      ocrExtractedText,
      ocrConfidence: ocrExtractedText ? 95 : undefined,
      isVerifiedByClerk: false,
    };

    // Replace existing evidence for same ruleKey or append
    const existingIdx = warrantyCase.evidenceItems.findIndex((e) => e.ruleKey === ruleKey);
    if (existingIdx >= 0) {
      warrantyCase.evidenceItems[existingIdx] = newEvidence;
    } else {
      warrantyCase.evidenceItems.push(newEvidence);
    }

    // Auto-resolve flags for this ruleKey
    const resolvedFlags: any[] = [];
    warrantyCase.flagHistory.forEach((f) => {
      if (f.evidenceRuleKey === ruleKey && !f.resolvedAt) {
        f.resolvedAt = new Date().toISOString();
        resolvedFlags.push({
          reasonCode: f.reasonCode,
          instruction: f.instruction,
          flaggedBy: f.flaggedBy,
        });
      }
    });

    const hasUnresolvedFlags = warrantyCase.flagHistory.some((f) => !f.resolvedAt);
    if (!hasUnresolvedFlags && warrantyCase.status === 'Flagged') {
      warrantyCase.status = 'Awaiting Review';
      warrantyCase.checklistSummary.isReadyForSubmission = true;
    }

    warrantyCase.checklistSummary.completedMandatory = warrantyCase.evidenceItems.length;
    warrantyCase.markModified('evidenceItems');
    warrantyCase.markModified('flagHistory');
    warrantyCase.markModified('checklistSummary');

    const savedCase = (await warrantyCase.save()).toObject();

    // If one or more flags were resolved by this upload, notify Admin(s)
    if (resolvedFlags.length > 0) {
      const lastResolved = resolvedFlags[resolvedFlags.length - 1];
      const remainingFlags = savedCase.flagHistory?.filter((f: any) => !f.resolvedAt)?.length || 0;

      this.getAdminEmails()
        .then((adminEmails) => {
          this.notificationsService.sendFlagResolvedAdminAlert(
            {
              caseId: savedCase.id,
              roNumber: savedCase.roNumber,
              evidenceRuleKey: ruleKey,
              evidenceName: evidenceName || newEvidence.name,
              resolvedReasonCode: lastResolved.reasonCode,
              originalInstruction: lastResolved.instruction,
              technicianName: savedCase.technicianName,
              vin: savedCase.vin,
              make: savedCase.make,
              model: savedCase.model,
              remainingFlagsCount: remainingFlags,
            },
            adminEmails,
          ).catch((err) => console.error('[Notifications] Failed to send flag resolved alert:', err?.message));
        })
        .catch(() => {});

      this.notificationsService.sendFlagResolvedPushToAdmins(
        {
          id: savedCase.id,
          roNumber: savedCase.roNumber,
          technicianName: savedCase.technicianName,
        },
        {
          evidenceRuleKey: ruleKey,
        },
      ).catch((err) => console.error('[Notifications] Failed to send flag resolved push:', err?.message));
    }

    return savedCase;
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
    const resolvedFlags: any[] = [];
    warrantyCase.flagHistory.forEach((f) => {
      if (f.evidenceRuleKey === dto.ruleKey && !f.resolvedAt) {
        f.resolvedAt = new Date().toISOString();
        if (dto.technicianNote) {
          f.technicianNote = dto.technicianNote;
        }
        resolvedFlags.push({
          reasonCode: f.reasonCode,
          instruction: f.instruction,
          flaggedBy: f.flaggedBy,
        });
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

    const savedCase = (await warrantyCase.save()).toObject();

    if (resolvedFlags.length > 0) {
      const lastResolved = resolvedFlags[resolvedFlags.length - 1];
      const remainingFlags = savedCase.flagHistory?.filter((f: any) => !f.resolvedAt)?.length || 0;

      this.getAdminEmails()
        .then((adminEmails) => {
          this.notificationsService.sendFlagResolvedAdminAlert(
            {
              caseId: savedCase.id,
              roNumber: savedCase.roNumber,
              evidenceRuleKey: dto.ruleKey,
              evidenceName: dto.name,
              resolvedReasonCode: lastResolved.reasonCode,
              originalInstruction: lastResolved.instruction,
              technicianName: savedCase.technicianName,
              vin: savedCase.vin,
              make: savedCase.make,
              model: savedCase.model,
              remainingFlagsCount: remainingFlags,
            },
            adminEmails,
          ).catch((err) => console.error('[Notifications] Failed to send flag resolved alert:', err?.message));
        })
        .catch(() => {});

      this.notificationsService.sendFlagResolvedPushToAdmins(
        {
          id: savedCase.id,
          roNumber: savedCase.roNumber,
          technicianName: savedCase.technicianName,
        },
        {
          evidenceRuleKey: dto.ruleKey,
        },
      ).catch((err) => console.error('[Notifications] Failed to send flag resolved push:', err?.message));
    }

    return savedCase;
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
    const savedCase = (await warrantyCase.save()).toObject();

    this.getAdminEmails()
      .then((adminEmails) => {
        this.notificationsService.sendNewTicketRaisedAlert(
          {
            caseId: savedCase.id,
            roNumber: savedCase.roNumber,
            vin: savedCase.vin,
            make: savedCase.make,
            model: savedCase.model,
            year: savedCase.year,
            concernTitle: savedCase.concernTitle,
            faultCategory: savedCase.faultCategory,
            technicianName: savedCase.technicianName,
            siteName: savedCase.siteName,
          },
          adminEmails,
        ).catch((err) => console.error('[Notifications] Failed to send workshop submission alert:', err?.message));
      })
      .catch(() => {});

    return savedCase;
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
    const savedCase = (await warrantyCase.save()).toObject();

    this.getTechnicianEmail(savedCase.technicianId, savedCase.technicianName)
      .then((techEmail) => {
        this.notificationsService.sendCaseRejectedOrFlaggedAlert(
          {
            caseId: savedCase.id,
            roNumber: savedCase.roNumber,
            evidenceRuleKey: dto.evidenceRuleKey,
            reasonCode: dto.reasonCode,
            instruction: dto.instruction,
            flaggedBy: dto.flaggedBy,
            vin: savedCase.vin,
            make: savedCase.make,
            model: savedCase.model,
            technicianName: savedCase.technicianName,
          },
          techEmail,
        ).catch((err) => console.error('[Notifications] Failed to send flag alert:', err?.message));
      })
      .catch(() => {});

    this.notificationsService.sendCaseRejectedPushToTechnician(
      { id: savedCase.id, roNumber: savedCase.roNumber },
      {
        evidenceRuleKey: dto.evidenceRuleKey,
        reasonCode: dto.reasonCode,
        instruction: dto.instruction,
        flaggedBy: dto.flaggedBy,
      },
      savedCase.technicianId,
    ).catch((err) => console.error('[Notifications] Failed to send flag push:', err?.message));

    return savedCase;
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

    const savedCase = (await warrantyCase.save()).toObject();

    this.getTechnicianEmail(savedCase.technicianId, savedCase.technicianName)
      .then((techEmail) => {
        this.notificationsService.sendCaseAcceptedAlert(
          {
            caseId: savedCase.id,
            roNumber: savedCase.roNumber,
            claimNumber: savedCase.claimNumber || dto.claimNumber,
            vin: savedCase.vin,
            make: savedCase.make,
            model: savedCase.model,
            technicianName: savedCase.technicianName,
            clerkNotes: savedCase.clerkNotes,
          },
          techEmail,
        ).catch((err) => console.error('[Notifications] Failed to send claim accepted alert:', err?.message));
      })
      .catch(() => {});

    this.notificationsService.sendCaseAcceptedPushToTechnician(
      {
        id: savedCase.id,
        roNumber: savedCase.roNumber,
        claimNumber: savedCase.claimNumber || dto.claimNumber,
      },
      savedCase.technicianId,
    ).catch((err) => console.error('[Notifications] Failed to send claim accepted push:', err?.message));

    return savedCase;
  }

  async addClerkNote(caseId: string, note: string): Promise<WarrantyCase> {
    const warrantyCase = await this.caseModel.findOne({ id: caseId });
    if (!warrantyCase) throw new NotFoundException(`Warranty case ${caseId} not found`);

    warrantyCase.clerkNotes = note;
    return (await warrantyCase.save()).toObject();
  }
}
