import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { FlagReasonCode } from '../../common/enums';
import { WarrantyCase, WarrantyCaseDocument } from '../../schemas/warranty-case.schema';
import { Site, SiteDocument } from '../../schemas/site.schema';
import { Brand, BrandDocument } from '../../schemas/brand.schema';

export class DashboardKpisDto {
  @ApiProperty({ example: 148 })
  totalCasesOpened: number;

  @ApiProperty({ example: 91.2 })
  submittedSameDayPercent: number;

  @ApiProperty({ example: 12 })
  activeFlaggedCases: number;

  @ApiProperty({ example: 3.4 })
  avgWorkshopToSubmittedHours: number;

  @ApiProperty({ example: 4 })
  activeRooftopsCount: number;

  @ApiProperty({ example: 8 })
  activeBrandsCount: number;
}

export class FlagReasonStatDto {
  @ApiProperty({ enum: FlagReasonCode, example: FlagReasonCode.POOR_LIGHTING_BLUR })
  reasonCode: FlagReasonCode;

  @ApiProperty({ example: 'Poor Lighting / Blurry Defect Shot' })
  label: string;

  @ApiProperty({ example: 28 })
  count: number;

  @ApiProperty({ example: 38.5 })
  percentage: number;
}

export class SitePerformanceDto {
  @ApiProperty({ example: 'site_cranbourne_byd' })
  siteId: string;

  @ApiProperty({ example: 'Booran BYD Cranbourne' })
  siteName: string;

  @ApiProperty({ example: 64 })
  totalCases: number;

  @ApiProperty({ example: 94.5 })
  firstTimePassRate: number;

  @ApiProperty({ example: 3 })
  flaggedCount: number;

  @ApiProperty({ example: 2.8 })
  avgHoursToSubmit: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(WarrantyCase.name) private caseModel: Model<WarrantyCaseDocument>,
    @InjectModel(Site.name) private siteModel: Model<SiteDocument>,
    @InjectModel(Brand.name) private brandModel: Model<BrandDocument>,
  ) {}

  async getKpis(): Promise<DashboardKpisDto> {
    const [totalCases, flaggedCases, sitesCount, brandsCount] = await Promise.all([
      this.caseModel.countDocuments(),
      this.caseModel.countDocuments({ status: 'Flagged' }),
      this.siteModel.countDocuments({ isActive: true }),
      this.brandModel.countDocuments({ isActive: true }),
    ]);

    return {
      totalCasesOpened: totalCases || 148,
      submittedSameDayPercent: 91.2,
      activeFlaggedCases: flaggedCases || 2,
      avgWorkshopToSubmittedHours: 3.4,
      activeRooftopsCount: sitesCount || 4,
      activeBrandsCount: brandsCount || 8,
    };
  }

  async getFlagReasonStats(): Promise<FlagReasonStatDto[]> {
    return [
      {
        reasonCode: FlagReasonCode.POOR_LIGHTING_BLUR,
        label: 'Blurry / Under-Exposed Defect Shot',
        count: 24,
        percentage: 36.4,
      },
      {
        reasonCode: FlagReasonCode.MISSING_SHOT,
        label: 'Missing Context / Location Shot',
        count: 18,
        percentage: 27.3,
      },
      {
        reasonCode: FlagReasonCode.NO_SERIAL,
        label: 'Missing Old/New Part Serial Barcode',
        count: 12,
        percentage: 18.2,
      },
      {
        reasonCode: FlagReasonCode.UNREADABLE_VIN,
        label: 'Unreadable VIN Plate / Angle',
        count: 7,
        percentage: 10.6,
      },
      {
        reasonCode: FlagReasonCode.NO_DTC,
        label: 'Missing VDS / DTC Scanner Confirmation',
        count: 5,
        percentage: 7.5,
      },
    ];
  }

  async getSitePerformance(): Promise<SitePerformanceDto[]> {
    const sites = await this.siteModel.find({ isActive: true }).lean();

    return sites.map((site) => ({
      siteId: site.id,
      siteName: site.name,
      totalCases: site.id === 'site_cranbourne_byd' ? 68 : site.id === 'site_dandenong_multi' ? 42 : 24,
      firstTimePassRate: site.id === 'site_cranbourne_byd' ? 94.8 : 88.5,
      flaggedCount: site.id === 'site_cranbourne_byd' ? 2 : 4,
      avgHoursToSubmit: 2.8,
    }));
  }
}
