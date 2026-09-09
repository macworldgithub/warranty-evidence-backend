import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  WarrantyCasesService,
  CreateWarrantyCaseDto,
  AddEvidenceDto,
  AddVoiceNoteDto,
  FlagCaseDto,
  MarkSubmittedDto,
} from './warranty-cases.service';
import { CaseStatus } from '../../common/enums';
import { WarrantyCase } from '../../schemas/warranty-case.schema';

@ApiTags('Warranty Cases (CRM & Review Portal)')
@Controller('warranty-cases')
export class WarrantyCasesController {
  constructor(private readonly casesService: WarrantyCasesService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter warranty cases for Clerk Review Portal & Manager queues' })
  @ApiQuery({ name: 'siteId', required: false, description: 'Filter by dealership rooftop' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by OEM brand' })
  @ApiQuery({ name: 'status', enum: CaseStatus, required: false, description: 'Filter by case status' })
  @ApiQuery({ name: 'ro', required: false, description: 'Search by Repair Order number' })
  @ApiQuery({ name: 'vin', required: false, description: 'Search by vehicle VIN' })
  @ApiQuery({ name: 'flaggedOnly', required: false, type: Boolean, description: 'Return only flagged cases' })
  @ApiQuery({ name: 'agedHours', required: false, type: Number, description: 'Filter cases older than X hours' })
  async findAll(
    @Query('siteId') siteId?: string,
    @Query('brandId') brandId?: string,
    @Query('status') status?: string,
    @Query('ro') ro?: string,
    @Query('vin') vin?: string,
    @Query('flaggedOnly') flaggedOnly?: boolean,
    @Query('agedHours') agedHours?: number,
  ): Promise<WarrantyCase[]> {
    return this.casesService.findAll({ siteId, brandId, status, ro, vin, flaggedOnly, agedHours });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full Warranty Case details with Checklist Gates and Evidence Gallery' })
  async findOne(@Param('id') id: string): Promise<WarrantyCase> {
    return this.casesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Start a new warranty ticket (Technician App or Clerk)' })
  async create(@Body() dto: CreateWarrantyCaseDto): Promise<WarrantyCase> {
    return this.casesService.create(dto);
  }

  @Post(':id/evidence')
  @ApiOperation({
    summary: 'Upload / attach evidence item with auto-assigned OEM file naming and OCR validation',
  })
  async addEvidence(@Param('id') id: string, @Body() dto: AddEvidenceDto): Promise<WarrantyCase> {
    return this.casesService.addEvidence(id, dto);
  }

  @Post(':id/voice-notes')
  @ApiOperation({
    summary: 'Attach Voice to Tech dictation transcript and original audio clip to warranty case',
  })
  async addVoiceNote(@Param('id') id: string, @Body() dto: AddVoiceNoteDto): Promise<WarrantyCase> {
    return this.casesService.addVoiceNote(id, dto);
  }

  @Post(':id/submit-from-workshop')
  @ApiOperation({
    summary: 'Technician Submit: Enforces all mandatory gates before transitioning to Awaiting Review',
  })
  async submitFromWorkshop(@Param('id') id: string): Promise<WarrantyCase> {
    return this.casesService.submitFromWorkshop(id);
  }

  @Post(':id/flag')
  @ApiOperation({
    summary: 'Warranty Clerk: Flag case for missing/unusable evidence with precise reason codes & push alert',
  })
  async flagCase(@Param('id') id: string, @Body() dto: FlagCaseDto): Promise<WarrantyCase> {
    return this.casesService.flagCase(id, dto);
  }

  @Post(':id/mark-submitted')
  @ApiOperation({
    summary: 'Warranty Clerk: Mark case as Submitted, record OEM claim number, and lock case edits',
  })
  async markSubmitted(@Param('id') id: string, @Body() dto: MarkSubmittedDto): Promise<WarrantyCase> {
    return this.casesService.markSubmitted(id, dto);
  }

  @Post(':id/clerk-note')
  @ApiOperation({ summary: 'Add internal clerk review note' })
  async addClerkNote(@Param('id') id: string, @Body('note') note: string): Promise<WarrantyCase> {
    return this.casesService.addClerkNote(id, note);
  }
}
