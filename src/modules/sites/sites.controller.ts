import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SitesService, SiteDto, CreateSiteDto } from './sites.service';
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

  @Post()
  @ApiOperation({ summary: 'Create a new dealership rooftop (Group Admin)' })
  @ApiResponse({ status: 201, type: SiteDto })
  async create(@Body() dto: CreateSiteDto): Promise<Site> {
    return this.sitesService.create(dto);
  }
}
