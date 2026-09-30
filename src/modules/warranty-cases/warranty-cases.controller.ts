import { Controller, Get, Post, Body, Param, Query, Headers, ForbiddenException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { AuthService, UserProfileDto } from '../auth/auth.service';

@ApiTags('Warranty Cases (CRM & Review Portal)')
@Controller('warranty-cases')
export class WarrantyCasesController {
  constructor(
    private readonly casesService: WarrantyCasesService,
    private readonly authService: AuthService,
  ) {}

  private assertSiteAccess(user: UserProfileDto, siteId: string) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.CLERK && user.authorizedSiteIds.includes(siteId)) return;
    throw new ForbiddenException(`Access denied: You are not assigned to site '${siteId}'.`);
  }

  private async assertCaseAccess(user: UserProfileDto, caseId: string): Promise<WarrantyCase> {
    const warrantyCase = await this.casesService.findOne(caseId, user.role, user.id, user.name);
    if (user.role === UserRole.CLERK) this.assertSiteAccess(user, warrantyCase.siteId);
    return warrantyCase;
  }

  private assertTechnician(user: UserProfileDto): void {
    if (user.role !== UserRole.TECHNICIAN) {
      throw new ForbiddenException('Access denied: This action is reserved for Technicians.');
    }
  }

  @Get()
  @ApiOperation({ summary: 'List and filter warranty cases for Clerk Review Portal & Manager queues' })
  @ApiQuery({ name: 'siteId', required: false, description: 'Filter by dealership rooftop' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by OEM brand' })
  @ApiQuery({ name: 'status', enum: CaseStatus, required: false, description: 'Filter by case status' })
  @ApiQuery({ name: 'technicianId', required: false, description: 'Filter by technician ID' })
  @ApiQuery({ name: 'technicianName', required: false, description: 'Filter by technician name' })
  @ApiQuery({ name: 'ro', required: false, description: 'Search by Repair Order number' })
  @ApiQuery({ name: 'vin', required: false, description: 'Search by vehicle VIN' })
  @ApiQuery({ name: 'search', required: false, description: 'General search across RO, VIN, model, technician, etc.' })
  @ApiQuery({ name: 'flaggedOnly', required: false, type: Boolean, description: 'Return only flagged cases' })
  @ApiQuery({ name: 'agedHours', required: false, type: Number, description: 'Filter cases older than X hours' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 10)' })
  async findAll(
    @Query('siteId') siteId?: string,
    @Query('brandId') brandId?: string,
    @Query('status') status?: string,
    @Query('technicianId') technicianId?: string,
    @Query('technicianName') technicianName?: string,
    @Query('ro') ro?: string,
    @Query('vin') vin?: string,
    @Query('search') search?: string,
    @Query('flaggedOnly') flaggedOnly?: boolean,
    @Query('agedHours') agedHours?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Headers('authorization') authHeader?: string,
    @Headers('x-user-role') xUserRole?: string,
    @Headers('x-user-id') xUserId?: string,
    @Headers('x-user-name') xUserName?: string,
  ): Promise<PaginatedResponse<WarrantyCase>> {
    const currentUser = await this.authService.resolveUserFromAuthorization(authHeader, xUserId);
    let activeTechId = technicianId;
    let activeTechName = technicianName;
    let authorizedSiteIds: string[] | undefined;

    if (currentUser.role === UserRole.TECHNICIAN) {
      activeTechId = currentUser.id;
      activeTechName = currentUser.name;
    } else if (currentUser.role === UserRole.CLERK) {
      if (siteId) this.assertSiteAccess(currentUser, siteId);
      authorizedSiteIds = siteId ? [siteId] : currentUser.authorizedSiteIds;
    }

    return this.casesService.findAll({
      siteId,
      siteIds: authorizedSiteIds,
      brandId,
      status,
      technicianId: activeTechId,
      technicianName: activeTechName,
      ro,
      vin,
      search,
      flaggedOnly,
      agedHours,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
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
    const currentUser = await this.authService.resolveUserFromAuthorization(authHeader, xUserId);
    const warrantyCase = await this.casesService.findOne(
      id,
      currentUser.role,
      currentUser.id,
      currentUser.name,
    );
    if (currentUser.role === UserRole.CLERK) this.assertSiteAccess(currentUser, warrantyCase.siteId);
    return warrantyCase;
  }

  @Post()
  @ApiOperation({ summary: 'Start a new warranty ticket (Technicians only)' })
  async create(
    @Body() dto: CreateWarrantyCaseDto,
    @Headers('authorization') authHeader?: string,
    @Headers('x-user-role') xUserRole?: string,
    @Headers('x-user-id') xUserId?: string,
  ): Promise<WarrantyCase> {
    const currentUser = await this.authService.resolveUserFromAuthorization(authHeader, xUserId);
    return this.casesService.create(dto, currentUser.role, currentUser.id);
  }

  @Post(':id/evidence')
  @ApiOperation({
    summary: 'Upload / attach evidence item with auto-assigned OEM file naming and OCR validation',
  })
  async addEvidence(
    @Param('id') id: string,
    @Body() dto: AddEvidenceDto,
    @Headers('authorization') authorization?: string,
  ): Promise<WarrantyCase> {
    const currentUser = await this.authService.resolveUserFromAuthorization(authorization);
    this.assertTechnician(currentUser);
    await this.assertCaseAccess(currentUser, id);
    return this.casesService.addEvidence(id, dto);
  }

  @Post(':id/evidence/upload')
  @ApiOperation({
    summary: 'Upload real evidence file (multipart/form-data) — stores to S3 or local disk, auto-names OEM filename',
    description: `Accepts a binary file upload via multipart/form-data.\n\n**Storage:** S3 if AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_S3_BUCKET are set in env; otherwise saved to local /uploads/ folder.\n\n**Auto-naming:** OEM filename is derived as \`{roNumber}{RuleDescriptor}.{ext}\` at upload time.\n\n**Thumbnail:** Generated automatically for image uploads (400px wide JPEG).`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'ruleKey'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Evidence file (JPEG/PNG/WebP/MP4/WebM/PDF)' },
        ruleKey: { type: 'string', example: 'fault_closeup', description: 'Brand Pack rule key this file satisfies' },
        evidenceName: { type: 'string', example: 'Fault Close-up Photo', description: 'Human-readable label (optional)' },
        ocrExtractedText: { type: 'string', example: 'LGXCE4C86P0019283', description: 'OCR text extracted on device (optional)' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),            // keep in memory — we stream to S3 or disk ourselves
      limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max (videos)
    }),
  )
  async uploadEvidence(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('ruleKey') ruleKey: string,
    @Body('evidenceName') evidenceName?: string,
    @Body('ocrExtractedText') ocrExtractedText?: string,
    @Headers('authorization') authorization?: string,
  ): Promise<WarrantyCase> {
    const currentUser = await this.authService.resolveUserFromAuthorization(authorization);
    this.assertTechnician(currentUser);
    await this.assertCaseAccess(currentUser, id);
    if (!file) throw new BadRequestException('No file received. Send the file as multipart/form-data field named "file".');
    if (!ruleKey) throw new BadRequestException('ruleKey is required.');

    return this.casesService.uploadEvidence(id, file, ruleKey, evidenceName ?? ruleKey, ocrExtractedText);
  }

  @Post(':id/voice-notes')
  @ApiOperation({
    summary: 'Attach Voice to Tech dictation transcript and original audio clip to warranty case',
  })
  async addVoiceNote(
    @Param('id') id: string,
    @Body() dto: AddVoiceNoteDto,
    @Headers('authorization') authorization?: string,
  ): Promise<WarrantyCase> {
    const currentUser = await this.authService.resolveUserFromAuthorization(authorization);
    this.assertTechnician(currentUser);
    await this.assertCaseAccess(currentUser, id);
    return this.casesService.addVoiceNote(id, dto);
  }

  @Post(':id/voice-notes/upload')
  @ApiOperation({
    summary: 'Upload audio file, transcribe via Deepgram Nova-2, and attach voice note to warranty case in one step',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async uploadVoiceNote(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('pinnedToEvidenceKey') pinnedToEvidenceKey?: string,
    @Body('recordedBy') recordedBy?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const currentUser = await this.authService.resolveUserFromAuthorization(authorization);
    this.assertTechnician(currentUser);
    await this.assertCaseAccess(currentUser, id);
    if (!file) {
      throw new BadRequestException('No audio file received. Send file as multipart/form-data field named "file".');
    }
    const author = recordedBy || currentUser.name;
    return this.casesService.uploadAndTranscribeVoiceNote(id, file, pinnedToEvidenceKey, author);
  }

  @Post(':id/submit-from-workshop')
  @ApiOperation({
    summary: 'Technician Submit: Enforces all mandatory gates before transitioning to Awaiting Review',
  })
  async submitFromWorkshop(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ): Promise<WarrantyCase> {
    const currentUser = await this.authService.resolveUserFromAuthorization(authorization);
    this.assertTechnician(currentUser);
    await this.assertCaseAccess(currentUser, id);
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
    @Headers('x-user-name') xUserName?: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') xUserId?: string,
  ): Promise<WarrantyCase> {
    const currentUser = await this.authService.resolveUserFromAuthorization(authorization, xUserId);
    if (currentUser.role === UserRole.TECHNICIAN) {
      throw new ForbiddenException('Access denied: Technicians cannot flag cases. Flagging is reserved for Warranty Clerks and Admins.');
    }
    await this.assertCaseAccess(currentUser, id);
    if (!dto.flaggedBy || dto.flaggedBy.includes('Sarah Jenkins')) {
      dto.flaggedBy = `${currentUser.name} (${currentUser.role === UserRole.CLERK ? 'Warranty Clerk' : 'Warranty Admin'})`;
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
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') xUserId?: string,
  ): Promise<WarrantyCase> {
    const currentUser = await this.authService.resolveUserFromAuthorization(authorization, xUserId);
    if (currentUser.role === UserRole.TECHNICIAN) {
      throw new ForbiddenException('Access denied: Technicians cannot approve and submit claims to OEM. This action is reserved for Warranty Clerks and Admins.');
    }
    await this.assertCaseAccess(currentUser, id);
    return this.casesService.markSubmitted(id, dto);
  }

  @Post(':id/clerk-note')
  @ApiOperation({ summary: 'Add internal clerk review note' })
  async addClerkNote(
    @Param('id') id: string,
    @Body('note') note: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') xUserId?: string,
  ): Promise<WarrantyCase> {
    const currentUser = await this.authService.resolveUserFromAuthorization(authorization, xUserId);
    if (currentUser.role === UserRole.TECHNICIAN) {
      throw new ForbiddenException('Access denied: Clerk notes are reserved for Warranty Clerks and Admins.');
    }
    await this.assertCaseAccess(currentUser, id);
    return this.casesService.addClerkNote(id, note);
  }
}
