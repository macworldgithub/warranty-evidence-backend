import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BrandsService, BrandDto, CreateBrandDto } from './brands.service';
import { Brand } from '../../schemas/brand.schema';

@ApiTags('Brands & OEM Rosters')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'List all supported OEM brands across Booran dealerships' })
  @ApiResponse({ status: 200, type: [BrandDto] })
  async findAll(): Promise<Brand[]> {
    return this.brandsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details for a specific OEM brand' })
  @ApiResponse({ status: 200, type: BrandDto })
  async findOne(@Param('id') id: string): Promise<Brand> {
    return this.brandsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new OEM brand roster (Group Admin)' })
  @ApiResponse({ status: 201, type: BrandDto })
  async create(@Body() dto: CreateBrandDto): Promise<Brand> {
    return this.brandsService.create(dto);
  }
}
