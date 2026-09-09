import { Controller, Get, Post, Body, Param, Query, Headers, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  WarrantyCasesService,
  CreateWarrantyCaseDto,
  AddEvidenceDto,
  AddVoiceNoteDto,
  FlagCaseDto,
  MarkSubmittedDto,
} from './warranty-cases.service';
import { CaseStatus, UserRole } from '../../common/enums';
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
  @ApiQuery({ name: 'technicianId', required: false, description: 'Filter by technician ID' })
  @ApiQuery({ name: 'technicianName', required: false, description: 'Filter by technician name' })
  @ApiQuery({ name: 'ro', required: false, description: 'Search by Repair Order number' })
  @ApiQuery({ name: 'vin', required: false, description: 'Search by vehicle VIN' })
  @ApiQuery({ name: 'flaggedOnly', required: false, type: Boolean, description: 'Return only flagged cases' })
  @ApiQuery({ name: 'agedHours', required: false, type: Number, description: 'Filter cases older than X hours' })
  async findAll(
    @Query('siteId') siteId?: string,
    @Query('brandId') brandId?: string,
    @Query('status') status?: string,
    @Query('technicianId') technicianId?: string,
    @Query('technicianName') technicianName?: string,
    @Query('ro') ro?: string,
    @Query('vin') vin?: string,
    @Query('flaggedOnly') flaggedOnly?: boolean,
    @Query('agedHours') agedHours?: number,
    @Headers('authorization') authHeader?: string,
    @Headers('x-user-role') xUserRole?: string,
    @Headers('x-user-id') xUserId?: string,
    @Headers('x-user-name') xUserName?: string,
  ): Promise<WarrantyCase[]> {
    let activeTechId = technicianId;
    let activeTechName = technicianName;

    if (xUserRole === UserRole.TECHNICIAN) {
      if (!activeTechId && xUserId) activeTechId = xUserId;
      if (!activeTechName && xUserName) activeTechName = xUserName;

      if (!activeTechId && authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const match = token.match(/jwt_token_\d+_(.+)/);
        if (match) {
          activeTechId = match[1];
        }
      }
    }

    return this.casesService.findAll({
      siteId,
      brandId,
      status,
      technicianId: activeTechId,
      technicianName: activeTechName,
      ro,
      vin,
      flaggedOnly,
      agedHours,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full Warranty Case details with Checklist Gates and Evidence Gallery' })
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
    @Headers('x-user-role') xUserRole?: string,
    @Headers('x-user-id') xUserId?: string,
    @Headers('x-user-name') xUserName?: string,
  ): Promise<WarrantyCase> {
    let callerUserId = xUserId;
    if (!callerUserId && authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const match = token.match(/jwt_token_\d+_(.+)/);
      if (match) {
        callerUserId = match[1];
      }
    }
    return this.casesService.findOne(id, xUserRole, callerUserId, xUserName);
  }

  @Post()
  @ApiOperation({ summary: 'Start a new warranty ticket (Technicians only)' })
  async create(
    @Body() dto: CreateWarrantyCaseDto,
    @Headers('authorization') authHeader?: string,
    @Headers('x-user-role') xUserRole?: string,
  ): Promise<WarrantyCase> {
    let userId: string | undefined;
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const match = token.match(/jwt_token_\d+_(.+)/);
      if (match) {
        userId = match[1];
      }
    }
    return this.casesService.create(dto, xUserRole, userId);
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
  async flagCase(
    @Param('id') id: string,
    @Body() dto: FlagCaseDto,
    @Headers('x-user-role') xUserRole?: string,
  ): Promise<WarrantyCase> {
    if (xUserRole === UserRole.TECHNICIAN) {
      throw new ForbiddenException('Access denied: Technicians cannot flag cases. Flagging is reserved for Warranty Clerks and Admins.');
    }
    return this.casesService.flagCase(id, dto);
  }

  @Post(':id/mark-submitted')
  @ApiOperation({
    summary: 'Warranty Clerk: Mark case as Submitted, record OEM claim number, and lock case edits',
  })
  async markSubmitted(
    @Param('id') id: string,
    @Body() dto: MarkSubmittedDto,
    @Headers('x-user-role') xUserRole?: string,
  ): Promise<WarrantyCase> {
    if (xUserRole === UserRole.TECHNICIAN) {
      throw new ForbiddenException('Access denied: Technicians cannot approve and submit claims to OEM. This action is reserved for Warranty Clerks and Admins.');
    }
    return this.casesService.markSubmitted(id, dto);
  }

  @Post(':id/clerk-note')
  @ApiOperation({ summary: 'Add internal clerk review note' })
  async addClerkNote(@Param('id') id: string, @Body('note') note: string): Promise<WarrantyCase> {
    return this.casesService.addClerkNote(id, note);
  }
}
