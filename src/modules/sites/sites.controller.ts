import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  SitesService,
  SiteDto,
  CreateSiteDto,
  UpdateSiteDto,
  UpdateSiteBrandsDto,
} from './sites.service';
import { Site } from '../../schemas/site.schema';

@ApiTags('Sites & Rooftops')
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @ApiOperation({ summary: 'List all Booran dealership sites / rooftops' })
  @ApiResponse({ status: 200, type: [SiteDto] })
  async findAll(): Promise<Site[]> {
    return this.sitesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details for a specific site' })
  @ApiResponse({ status: 200, type: SiteDto })
  async findOne(@Param('id') id: string): Promise<Site> {
    return this.sitesService.findOne(id);
  }

  @Get(':id/brands')
  @ApiOperation({ summary: 'Get authorized brand IDs for a site (used by mobile to filter brand picker)' })
  @ApiResponse({ status: 200, schema: { example: { authorizedBrandIds: ['brand_byd'] } } })
  async getAuthorizedBrands(@Param('id') id: string): Promise<{ authorizedBrandIds: string[] }> {
    return this.sitesService.getAuthorizedBrands(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new dealership rooftop (Admin only)' })
  @ApiResponse({ status: 201, type: SiteDto })
  async create(@Body() dto: CreateSiteDto): Promise<Site> {
    return this.sitesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update site details — name, location, RO prefix, active status (Admin only)' })
  @ApiResponse({ status: 200, type: SiteDto })
  async update(@Param('id') id: string, @Body() dto: UpdateSiteDto): Promise<Site> {
    return this.sitesService.update(id, dto);
  }

  @Patch(':id/brands')
  @ApiOperation({ summary: 'Set the full authorized brand list for a site (Admin only)' })
  @ApiResponse({ status: 200, type: SiteDto })
  async updateBrands(
    @Param('id') id: string,
    @Body() dto: UpdateSiteBrandsDto,
  ): Promise<Site> {
    return this.sitesService.updateBrands(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a dealership site (Admin only — soft delete)' })
  @ApiResponse({ status: 200, schema: { example: { message: 'Site deactivated' } } })
  async deactivate(@Param('id') id: string): Promise<{ message: string }> {
    return this.sitesService.deactivate(id);
  }
}
