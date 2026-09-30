import { Controller, ForbiddenException, Get, Headers, Param, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProduces } from '@nestjs/swagger';
import type { Response } from 'express';
import { SubmissionPackService, SubmissionPackResponseDto } from './submission-pack.service';
import { AuthService } from '../auth/auth.service';
import { WarrantyCasesService } from '../warranty-cases/warranty-cases.service';
import { UserRole } from '../../common/enums';

@ApiTags('Submission Pack & OEM Export')
@Controller('submission-pack')
export class SubmissionPackController {
  constructor(
    private readonly submissionPackService: SubmissionPackService,
    private readonly authService: AuthService,
    private readonly warrantyCasesService: WarrantyCasesService,
  ) {}

  private async assertCaseAccess(caseId: string, authorization?: string): Promise<void> {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    const warrantyCase = await this.warrantyCasesService.findOne(
      caseId,
      user.role,
      user.id,
      user.name,
    );

    if (user.role === UserRole.CLERK && !user.authorizedSiteIds.includes(warrantyCase.siteId)) {
      throw new ForbiddenException('Access denied: This warranty case is outside your assigned sites.');
    }
  }

  @Get(':caseId')
  @ApiOperation({
    summary: 'Get submission pack manifest and ready-to-download URLs for DMS attachment',
  })
  @ApiResponse({ status: 200, type: SubmissionPackResponseDto })
  async generateSubmissionPack(
    @Param('caseId') caseId: string,
    @Headers('authorization') authorization?: string,
  ): Promise<SubmissionPackResponseDto> {
    await this.assertCaseAccess(caseId, authorization);
    return this.submissionPackService.generateSubmissionPack(caseId);
  }

  @Get(':caseId/download-zip')
  @ApiOperation({
    summary: 'Download compiled OEM ZIP package containing all correctly-named evidence files and 1-page PDF summary',
  })
  @ApiProduces('application/zip')
  async downloadZipPack(
    @Param('caseId') caseId: string,
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.assertCaseAccess(caseId, authorization);
    return this.submissionPackService.streamZipPack(caseId, res);
  }

  @Get(':caseId/download-pdf')
  @ApiOperation({
    summary: 'Download or preview the official One-Page Case Summary PDF (Attachment A audit sheet)',
  })
  @ApiProduces('application/pdf')
  async downloadPdfSummary(
    @Param('caseId') caseId: string,
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.assertCaseAccess(caseId, authorization);
    const { buffer, fileName } = await this.submissionPackService.getPdfSummaryBuffer(caseId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(HttpStatus.OK).end(buffer);
  }
}
