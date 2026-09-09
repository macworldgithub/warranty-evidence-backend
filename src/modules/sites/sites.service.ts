import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray } from 'class-validator';
import { Site, SiteDocument } from '../../schemas/site.schema';

export class SiteDto {
  @ApiProperty({ example: 'site_cranbourne_byd' })
  id: string;

  @ApiProperty({ example: 'Booran BYD Cranbourne' })
  name: string;

  @ApiProperty({ example: 'South Gippsland Hwy, Cranbourne VIC' })
  location: string;

  @ApiProperty({ example: 'CR-' })
  roPrefix: string;

  @ApiProperty({ example: ['brand_byd'] })
  authorizedBrandIds: string[];

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class CreateSiteDto {
  @ApiProperty({ example: 'Booran Berwick Commercials' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Princes Hwy, Berwick VIC' })
  @IsString()
  location: string;

  @ApiProperty({ example: 'BER-' })
  @IsString()
  roPrefix: string;

  @ApiProperty({ example: ['brand_toyota', 'brand_ford'] })
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
    const defaultSites = [
      {
        id: 'site_cranbourne_byd',
        code: 'CRANBOURNE_BYD',
        name: 'Booran BYD Cranbourne',
        location: 'South Gippsland Hwy, Cranbourne VIC',
        roPrefix: 'CR-',
        authorizedBrandIds: ['brand_byd'],
        isActive: true,
      },
      {
        id: 'site_dandenong_multi',
        code: 'DANDENONG_MULTI',
        name: 'Booran Dandenong Multi-Franchise',
        location: 'Lonsdale St, Dandenong VIC',
        roPrefix: 'DAN-',
        authorizedBrandIds: ['brand_hyundai', 'brand_kia', 'brand_mitsubishi', 'brand_nissan'],
        isActive: true,
      },
      {
        id: 'site_cheltenham_mg',
        code: 'CHELTENHAM_MG',
        name: 'Booran MG & Chery Cheltenham',
        location: 'Nepean Hwy, Cheltenham VIC',
        roPrefix: 'CHEL-',
        authorizedBrandIds: ['brand_mg', 'brand_chery'],
        isActive: true,
      },
      {
        id: 'site_berwick_toyota_ford',
        code: 'BERWICK_COMMERCIALS',
        name: 'Booran Berwick Commercials',
        location: 'Princes Hwy, Berwick VIC',
        roPrefix: 'BER-',
        authorizedBrandIds: ['brand_toyota', 'brand_ford', 'brand_isuzu'],
        isActive: true,
      },
    ];

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

  async create(dto: CreateSiteDto): Promise<Site> {
    const newSite = new this.siteModel({
      id: `site_${dto.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`,
      code: dto.roPrefix.replace(/[^a-zA-Z0-9]/g, ''),
      name: dto.name,
      location: dto.location,
      roPrefix: dto.roPrefix,
      authorizedBrandIds: dto.authorizedBrandIds,
      isActive: true,
    });
    return (await newSite.save()).toObject();
  }
}
