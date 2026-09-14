import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BrandPacksService, EvaluateRulesDto, EvaluatedRulesResponseDto, CreateEvidenceRuleDto } from './brand-packs.service';
import { BrandPack } from '../../schemas/brand-pack.schema';

@ApiTags('Brand Packs & Rules Engine')
@Controller('brand-packs')
export class BrandPacksController {
  constructor(private readonly brandPacksService: BrandPacksService) {}

  @Get()
  @ApiOperation({ summary: 'List all Brand Pack configurations and version history' })
  async findAll(): Promise<BrandPack[]> {
    return this.brandPacksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific Brand Pack by ID' })
  async findOne(@Param('id') id: string): Promise<BrandPack> {
    return this.brandPacksService.findOne(id);
  }

  @Get('brand/:brandId/active')
  @ApiOperation({ summary: 'Get currently active Brand Pack for an OEM brand (e.g. BYD Attachment A)' })
  async findActiveByBrand(@Param('brandId') brandId: string): Promise<BrandPack> {
    return this.brandPacksService.findActiveByBrand(brandId);
  }

  @Post('evaluate-rules')
  @ApiOperation({
    summary: 'Dynamic Rules Engine: Compute exact evidence requirements for mobile wizard based on fault category & answers',
  })
  @ApiResponse({ status: 200, type: EvaluatedRulesResponseDto })
  async evaluateRules(@Body() dto: EvaluateRulesDto): Promise<EvaluatedRulesResponseDto> {
    return this.brandPacksService.evaluateRules(dto);
  }

  @Post(':id/clone-version')
  @ApiOperation({ summary: 'Clone an existing Brand Pack to draft a new version (Group Admin)' })
  async cloneVersion(@Param('id') id: string): Promise<BrandPack> {
    return this.brandPacksService.cloneVersion(id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a draft Brand Pack version to make it live (Group Admin)' })
  async publish(@Param('id') id: string): Promise<BrandPack> {
    return this.brandPacksService.publish(id);
  }

  @Post(':id/rules')
  @ApiOperation({ summary: 'Add or update a single Evidence Rule in a Brand Pack' })
  async addRule(@Param('id') id: string, @Body() dto: CreateEvidenceRuleDto): Promise<BrandPack> {
    return this.brandPacksService.addRule(id, dto);
  }

  @Post(':id/rules/batch')
  @ApiOperation({ summary: 'Batch import multiple Evidence Rules into a Brand Pack from CSV/Excel' })
  async batchAddRules(@Param('id') id: string, @Body() body: { rules: CreateEvidenceRuleDto[] }): Promise<BrandPack> {
    return this.brandPacksService.batchAddRules(id, body.rules || []);
  }
}
