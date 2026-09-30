import { Controller, Get, NotFoundException, Res } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Legal Documents')
@Controller('legal-documents')
export class LegalDocumentsController {
  private readonly legalDocumentsDir = path.resolve(
    __dirname,
    '..',
    '..',
    'assets',
    'legal',
    'v1',
  );

  private sendPdf(res: Response, fileName: string, downloadName: string) {
    const filePath = path.join(this.legalDocumentsDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Legal document is not available');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(filePath);
  }

  @Get('privacy-policy')
  @ApiOperation({ summary: 'View the current Booran Motors Privacy Policy' })
  @ApiProduces('application/pdf')
  getPrivacyPolicy(@Res() res: Response) {
    return this.sendPdf(
      res,
      'booran-privacy-policy.pdf',
      'Booran-Motors-Privacy-Policy.pdf',
    );
  }

  @Get('test-drive-loan-agreement')
  @ApiOperation({ summary: 'View the current Test Drive and Loan Agreement terms' })
  @ApiProduces('application/pdf')
  getTestDriveLoanAgreement(@Res() res: Response) {
    return this.sendPdf(
      res,
      'booran-test-drive-loan-agreement.pdf',
      'Booran-Motors-Test-Drive-and-Loan-Agreement.pdf',
    );
  }
}
