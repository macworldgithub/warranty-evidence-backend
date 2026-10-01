import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { Site, SiteDocument } from '../../schemas/site.schema';

export class SiteDto {
  @ApiProperty({ example: 'site_cranbourne_byd' })
  id: string;

  @ApiProperty({ example: 'Booran BYD Cranbourne' })
  name: string;

  @ApiProperty({ example: 'Cranbourne Hyundai' })
  dealership: string;

  @ApiProperty({ example: 'Cranbourne' })
  region: string;

  @ApiProperty({ example: 'Neil' })
  operator: string;

  @ApiProperty({ example: 'South Gippsland Hwy, Cranbourne VIC' })
  location: string;

  @ApiProperty({ example: 'CR-' })
  roPrefix: string;

  @ApiProperty({ example: ['brand_byd'] })
  authorizedBrandIds: string[];

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: -38.0992 })
  latitude?: number;

  @ApiPropertyOptional({ example: 145.2813 })
  longitude?: number;

  @ApiPropertyOptional({ example: 200 })
  geofenceRadiusMeters?: number;

  @ApiPropertyOptional({ example: true })
  geofenceEnabled?: boolean;
}

export class CreateSiteDto {
  @ApiProperty({ example: 'Booran Berwick Commercials' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Cranbourne Hyundai' })
  @IsOptional()
  @IsString()
  dealership?: string;

  @ApiPropertyOptional({ example: 'Cranbourne' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Neil' })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiProperty({ example: 'Princes Hwy, Berwick VIC' })
  @IsString()
  location: string;

  @ApiProperty({ example: 'BER-' })
  @IsString()
  roPrefix: string;

  @ApiPropertyOptional({ example: ['brand_toyota', 'brand_ford'] })
  @IsOptional()
  @IsArray()
  authorizedBrandIds?: string[];

  @ApiPropertyOptional({ example: -38.0315 })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 145.3444 })
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  geofenceRadiusMeters?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  geofenceEnabled?: boolean;
}

export class UpdateSiteDto {
  @ApiPropertyOptional({ example: 'Booran Berwick Multi-Franchise' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Cranbourne Hyundai' })
  @IsOptional()
  @IsString()
  dealership?: string;

  @ApiPropertyOptional({ example: 'Cranbourne' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Neil' })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({ example: 'Main St, Berwick VIC' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'BRW-' })
  @IsOptional()
  @IsString()
  roPrefix?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: -38.0315 })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 145.3444 })
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  geofenceRadiusMeters?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  geofenceEnabled?: boolean;
}

export class UpdateSiteBrandsDto {
  @ApiProperty({ example: ['brand_byd', 'brand_toyota'] })
  @IsArray()
  authorizedBrandIds: string[];
}

@Injectable()
export class SitesService implements OnModuleInit {
  constructor(
    @InjectModel(Site.name) private siteModel: Model<SiteDocument>,
  ) {}

  async onModuleInit() {
    try {
      // Drop legacy index if exists
      const indexes = await this.siteModel.collection.indexes();
      if (indexes.some((idx) => idx.name === 'code_1')) {
        await this.siteModel.collection.dropIndex('code_1');
        console.log('🍃 Dropped legacy code_1 index from sites collection');
      }
    } catch (err) {
      // ignore
    }

    console.log('🍃 Synchronizing Booran dealership sites in MongoDB...');
    const rooftopDirectory = [
      ['Bayside Skoda', 'Cheltenham / Bayside', 'Neil'],
      ['Booran GMSV Cheltenham', 'Cheltenham / Bayside', 'Neil'],
      ['Chery Southland', 'Cheltenham / Bayside', 'Neil'],
      ['Southland Isuzu UTE', 'Cheltenham / Bayside', 'Neil'],
      ['Southland Kia', 'Cheltenham / Bayside', 'Neil'],
      ['Southland Lepas', 'Cheltenham / Bayside', 'Neil'],
      ['Chery Cranbourne', 'Cranbourne', 'Neil'],
      ['Cranbourne Hyundai', 'Cranbourne', 'Neil'],
      ['Berwick Hyundai', 'Berwick', 'Shane'],
      ['Berwick Lepas', 'Berwick', 'Shane'],
      ['Berwick MG', 'Berwick', 'Shane'],
      ['Chery Berwick', 'Berwick', 'Shane'],
      ['Cranbourne Geely', 'Cranbourne', 'Shane'],
      ['Cranbourne Kia', 'Cranbourne', 'Shane'],
      ['Cranbourne MG', 'Cranbourne', 'Shane'],
      ['Booran Suzuki', 'Dandenong', 'Shane'],
      ['Chery Dandenong', 'Dandenong', 'Shane'],
      ['Dandenong GWM', 'Dandenong', 'Shane'],
      ['Dandenong Hyundai', 'Dandenong', 'Shane'],
      ['Dandenong Jaecoo', 'Dandenong', 'Shane'],
      ['Dandenong Kia', 'Dandenong', 'Shane'],
      ['Dandenong Lepas', 'Dandenong', 'Shane'],
      ['Dandenong MG', 'Dandenong', 'Shane'],
      ['Dandenong Mitsubishi', 'Dandenong', 'Shane'],
      ['Dandenong Nissan', 'Dandenong', 'Shane'],
      ['Dandenong Xpeng', 'Dandenong', 'Shane'],
      ['GAC Dandenong', 'Dandenong', 'Shane'],
      ['Chery Frankston', 'Frankston', 'Shane'],
      ['Leongatha Ford', 'Gippsland', 'Shane'],
      ['Leongatha Kia', 'Gippsland', 'Shane'],
      ['Leongatha Toyota', 'Gippsland', 'Shane'],
      ['Wonthaggi Kia', 'Gippsland', 'Shane'],
      ['Wonthaggi Toyota', 'Gippsland', 'Shane'],
      ['South Morang BYD', 'South Morang', 'Anthony'],
      ['South Morang Chery', 'South Morang', 'Anthony'],
      ['South Morang Hyundai', 'South Morang', 'Anthony'],
      ['South Morang Kia', 'South Morang', 'Anthony'],
      ['South Morang Lepas', 'South Morang', 'Anthony'],
    ] as const;

    const defaultSites = rooftopDirectory.map(([dealership, region, operator]) => {
      const slug = dealership.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      return {
        id: `site_${slug}`,
        code: slug.toUpperCase(),
        name: dealership,
        dealership,
        region,
        operator,
        location: region,
        roPrefix: `${slug.toUpperCase()}-`,
        authorizedBrandIds: [],
        isActive: true,
        geofenceRadiusMeters: 200,
        geofenceEnabled: true,
      };
    });

    await this.siteModel.deleteMany({
      id: { $in: ['site_cranbourne_byd', 'site_dandenong_multi', 'site_cheltenham_mg', 'site_berwick_toyota_ford'] },
    });

    for (const site of defaultSites) {
      await this.siteModel.updateOne(
        { id: site.id },
        { $set: site },
        { upsert: true },
      );
    }
    console.log(`🍃 Successfully synchronized ${defaultSites.length} dealership rooftops`);
  }

  async findAll(): Promise<Site[]> {
    return this.siteModel.find().lean();
  }

  async findOne(id: string): Promise<Site> {
    const site = await this.siteModel.findOne({ id }).lean();
    if (!site) throw new NotFoundException(`Site with id ${id} not found`);
    return site;
  }

  async getAuthorizedBrands(id: string): Promise<{ authorizedBrandIds: string[] }> {
    const site = await this.siteModel.findOne({ id }, { authorizedBrandIds: 1, _id: 0 }).lean();
    if (!site) throw new NotFoundException(`Site with id ${id} not found`);
    return { authorizedBrandIds: site.authorizedBrandIds };
  }

  async create(dto: CreateSiteDto): Promise<Site> {
    const newSite = new this.siteModel({
      id: `site_${dto.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`,
      code: dto.roPrefix.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
      name: dto.name,
      dealership: dto.dealership ?? dto.name,
      region: dto.region ?? dto.location,
      operator: dto.operator ?? 'Unassigned',
      location: dto.location,
      roPrefix: dto.roPrefix,
      authorizedBrandIds: dto.authorizedBrandIds ?? [],
      isActive: true,
      latitude: dto.latitude,
      longitude: dto.longitude,
      geofenceRadiusMeters: dto.geofenceRadiusMeters ?? 200,
      geofenceEnabled: dto.geofenceEnabled ?? true,
    });
    return (await newSite.save()).toObject();
  }

  async update(id: string, dto: UpdateSiteDto): Promise<Site> {
    const updated = await this.siteModel
      .findOneAndUpdate({ id }, { $set: dto }, { returnDocument: 'after' })
      .lean();
    if (!updated) throw new NotFoundException(`Site with id ${id} not found`);
    return updated;
  }

  async updateBrands(id: string, dto: UpdateSiteBrandsDto): Promise<Site> {
    const updated = await this.siteModel
      .findOneAndUpdate(
        { id },
        { $set: { authorizedBrandIds: dto.authorizedBrandIds } },
        { returnDocument: 'after' },
      )
      .lean();
    if (!updated) throw new NotFoundException(`Site with id ${id} not found`);
    return updated;
  }

  async deactivate(id: string): Promise<{ message: string }> {
    const site = await this.siteModel.findOne({ id });
    if (!site) throw new NotFoundException(`Site with id ${id} not found`);
    await this.siteModel.updateOne({ id }, { $set: { isActive: false } });
    return { message: `Site ${id} deactivated` };
  }
}
