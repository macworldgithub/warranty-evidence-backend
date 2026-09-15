import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  BrandsService,
  BrandDto,
  CreateBrandDto,
  UpdateBrandDto,
} from './brands.service';
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
  @ApiOperation({ summary: 'Add a new OEM brand (Admin only)' })
  @ApiResponse({ status: 201, type: BrandDto })
  async create(@Body() dto: CreateBrandDto): Promise<Brand> {
    return this.brandsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update brand details — name, description, active status (Admin only)' })
  @ApiResponse({ status: 200, type: BrandDto })
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto): Promise<Brand> {
    return this.brandsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate an OEM brand (Admin only — soft delete)' })
  @ApiResponse({ status: 200, schema: { example: { message: 'Brand deactivated' } } })
  async deactivate(@Param('id') id: string): Promise<{ message: string }> {
    return this.brandsService.deactivate(id);
  }
}
