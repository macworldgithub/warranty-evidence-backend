import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Brand, BrandDocument } from '../../schemas/brand.schema';

export class BrandDto {
  @ApiProperty({ example: 'brand_byd' })
  id: string;

  @ApiProperty({ example: 'BYD' })
  name: string;

  @ApiProperty({ example: 'Build Your Dreams (EV/PHEV)' })
  description: string;

  @ApiProperty({ example: 'BYD-WB-2602-02 Attachment A' })
  seedChecklistReference: string;

  @ApiProperty({ example: 'brandpack_byd_v1' })
  activeBrandPackId: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class CreateBrandDto {
  @ApiProperty({ example: 'GMSV' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'General Motors Specialty Vehicles' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'Standard Tier 1 Pack' })
  @IsString()
  seedChecklistReference: string;
}

@Injectable()
export class BrandsService implements OnModuleInit {
  constructor(
    @InjectModel(Brand.name) private brandModel: Model<BrandDocument>,
  ) {}

  async onModuleInit() {
    try {
      const indexes = await this.brandModel.collection.indexes();
      if (indexes.some((idx) => idx.name === 'code_1')) {
        await this.brandModel.collection.dropIndex('code_1');
        console.log('🍃 Dropped legacy code_1 index from brands collection');
      }
    } catch (err) {
      // index might not exist
    }

    console.log('🍃 Synchronizing OEM brands in MongoDB...');
    const defaultBrands = [
      {
        id: 'brand_byd',
        code: 'BYD',
        name: 'BYD',
        description: 'Build Your Dreams - EV / DM-i Super Hybrid',
        seedChecklistReference: 'BYD-WB-2602-02 Attachment A (Live v1)',
        activeBrandPackId: 'brandpack_byd_v1',
        isActive: true,
      },
      {
        id: 'brand_hyundai',
        code: 'HYUNDAI',
        name: 'Hyundai',
        description: 'Hyundai Motor Company Australia',
        seedChecklistReference: 'Tier 1 Common + HMCA Fault Guide',
        activeBrandPackId: 'brandpack_common_v1',
        isActive: true,
      },
      {
        id: 'brand_kia',
        code: 'KIA',
        name: 'Kia',
        description: 'Kia Australia',
        seedChecklistReference: 'Tier 1 Common + Kia KCI Pack',
        activeBrandPackId: 'brandpack_common_v1',
        isActive: true,
      },
      {
        id: 'brand_mg',
        code: 'MG',
        name: 'MG Motor',
        description: 'MG Motor Australia (ICE/EV)',
        seedChecklistReference: 'Tier 1 Common + SAIC Checklist',
        activeBrandPackId: 'brandpack_common_v1',
        isActive: true,
      },
      {
        id: 'brand_chery',
        code: 'CHERY',
        name: 'Chery',
        description: 'Chery Motor Australia',
        seedChecklistReference: 'Tier 1 Common Pack',
        activeBrandPackId: 'brandpack_common_v1',
        isActive: true,
      },
      {
        id: 'brand_toyota',
        code: 'TOYOTA',
        name: 'Toyota',
        description: 'Toyota Australia',
        seedChecklistReference: 'Tier 1 Common + TMCA Warranty Protocol',
        activeBrandPackId: 'brandpack_common_v1',
        isActive: true,
      },
      {
        id: 'brand_ford',
        code: 'FORD',
        name: 'Ford',
        description: 'Ford Motor Company of Australia',
        seedChecklistReference: 'Tier 1 Common + Ford Warranty Manual',
        activeBrandPackId: 'brandpack_common_v1',
        isActive: true,
      },
      {
        id: 'brand_mitsubishi',
        code: 'MITSUBISHI',
        name: 'Mitsubishi',
        description: 'Mitsubishi Motors Australia',
        seedChecklistReference: 'Tier 1 Common Pack',
        activeBrandPackId: 'brandpack_common_v1',
        isActive: true,
      },
    ];

    for (const brand of defaultBrands) {
      await this.brandModel.updateOne(
        { id: brand.id },
        { $set: brand },
        { upsert: true },
      );
    }
    console.log(`🍃 Successfully synchronized ${defaultBrands.length} OEM brands`);
  }

  async findAll(): Promise<Brand[]> {
    return this.brandModel.find().lean();
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandModel.findOne({ id }).lean();
    if (!brand) throw new NotFoundException(`Brand with id ${id} not found`);
    return brand;
  }

  async create(dto: CreateBrandDto): Promise<Brand> {
    const newBrand = new this.brandModel({
      id: `brand_${dto.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: dto.name,
      description: dto.description,
      seedChecklistReference: dto.seedChecklistReference,
      activeBrandPackId: 'brandpack_common_v1',
      isActive: true,
    });
    return (await newBrand.save()).toObject();
  }
}
