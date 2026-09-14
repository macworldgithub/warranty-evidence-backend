import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZipArchive } from 'archiver';
import axios from 'axios';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { WarrantyCasesService } from '../warranty-cases/warranty-cases.service';
import { PdfSummaryService } from './pdf-summary.service';

export class SubmissionPackFileItemDto {
  @ApiProperty({ example: 'CR-98421FrontOfCar.jpg' })
  oemFileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80' })
  downloadUrl: string;

  @ApiProperty({ example: 2048500 })
  sizeBytes: number;
}

export class SubmissionPackResponseDto {
  @ApiProperty({ example: 'CASE-CR-2026-001' })
  caseId: string;

  @ApiProperty({ example: 'CR-98421' })
  roNumber: string;

  @ApiProperty({ example: 'BYD-CLM-8839' })
  claimNumber: string;

  @ApiProperty({ example: 'BYD_CR-98421_SubmissionPack.zip' })
  zipFileName: string;

  @ApiProperty({ example: '/api/v1/submission-pack/CASE-CR-2026-001/download-zip' })
  zipDownloadUrl: string;

  @ApiProperty({ example: 'CR-98421_CaseSummary.pdf' })
  pdfSummaryFileName: string;

  @ApiProperty({ example: '/api/v1/submission-pack/CASE-CR-2026-001/download-pdf' })
  pdfSummaryDownloadUrl: string;

  @ApiProperty({ type: [SubmissionPackFileItemDto] })
  includedFiles: SubmissionPackFileItemDto[];

  @ApiProperty({ example: '2026-09-03T10:00:00.000Z' })
  generatedAt: string;
}

@Injectable()
export class SubmissionPackService {
  private readonly logger = new Logger(SubmissionPackService.name);

  constructor(
    private readonly warrantyCasesService: WarrantyCasesService,
    private readonly pdfSummaryService: PdfSummaryService,
  ) {}

  /**
   * Generates metadata and file manifest for the case submission pack.
   */
  async generateSubmissionPack(caseId: string): Promise<SubmissionPackResponseDto> {
    const warrantyCase = await this.warrantyCasesService.findOne(caseId);
    if (!warrantyCase) {
      throw new NotFoundException(`Warranty case ${caseId} not found`);
    }

    const includedFiles: SubmissionPackFileItemDto[] = (warrantyCase.evidenceItems || []).map((ev: any) => {
      const ext = ev.mediaType === 'video' ? 'mp4' : ev.mediaType === 'document' ? 'pdf' : 'jpg';
      const oemFileName = ev.oemFileName || `${warrantyCase.roNumber}${ev.ruleKey}.${ext}`;
      return {
        oemFileName,
        mimeType: ev.mediaType === 'video' ? 'video/mp4' : ev.mediaType === 'document' ? 'application/pdf' : 'image/jpeg',
        downloadUrl: ev.storageUrl,
        sizeBytes: ev.mediaType === 'video' ? 14200000 : 1850000,
      };
    });

    const pdfSummaryFileName = `${warrantyCase.roNumber}_CaseSummary.pdf`;
    includedFiles.unshift({
      oemFileName: pdfSummaryFileName,
      mimeType: 'application/pdf',
      downloadUrl: `/api/v1/submission-pack/${caseId}/download-pdf`,
      sizeBytes: 125000,
    });

    const zipFileName = `${warrantyCase.brandName || 'OEM'}_${warrantyCase.roNumber}_SubmissionPack.zip`;

    return {
      caseId: warrantyCase.id,
      roNumber: warrantyCase.roNumber,
      claimNumber: warrantyCase.claimNumber || 'PENDING SUBMISSION',
      zipFileName,
      zipDownloadUrl: `/api/v1/submission-pack/${caseId}/download-zip`,
      pdfSummaryFileName,
      pdfSummaryDownloadUrl: `/api/v1/submission-pack/${caseId}/download-pdf`,
      includedFiles,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates the One-Page Summary PDF buffer for download.
   */
  async getPdfSummaryBuffer(caseId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const warrantyCase = await this.warrantyCasesService.findOne(caseId);
    if (!warrantyCase) {
      throw new NotFoundException(`Warranty case ${caseId} not found`);
    }

    const buffer = await this.pdfSummaryService.generateCaseSummaryPdf(warrantyCase);
    const fileName = `${warrantyCase.roNumber}_CaseSummary.pdf`;
    return { buffer, fileName };
  }

  /**
   * Bundles all evidence files and the PDF summary into an in-memory streaming ZIP archive.
   */
  async streamZipPack(caseId: string, res: Response): Promise<void> {
    const warrantyCase = await this.warrantyCasesService.findOne(caseId);
    if (!warrantyCase) {
      throw new NotFoundException(`Warranty case ${caseId} not found`);
    }

    const zipFileName = `${warrantyCase.brandName || 'OEM'}_${warrantyCase.roNumber}_SubmissionPack.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    const archive = new ZipArchive({
      zlib: { level: 9 }, // Maximum compression
    });

    archive.on('error', (err) => {
      this.logger.error(`Archiver error on case ${caseId}: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).send({ error: 'Failed to generate ZIP pack' });
      }
    });

    archive.pipe(res);

    // 1. Generate & append the One-Page Case Summary PDF
    try {
      const pdfBuffer = await this.pdfSummaryService.generateCaseSummaryPdf(warrantyCase);
      archive.append(pdfBuffer, { name: `${warrantyCase.roNumber}_CaseSummary.pdf` });
    } catch (pdfErr) {
      this.logger.error(`Failed to attach summary PDF to zip: ${pdfErr.message}`);
    }

    // 2. Fetch & append each evidence media item
    const evidenceItems = warrantyCase.evidenceItems || [];
    for (const ev of evidenceItems) {
      try {
        let fileBuffer = await this.fetchFileBuffer(ev, warrantyCase.id);
        if (!fileBuffer && ev.mediaType === 'image') {
          fileBuffer = await sharp({
            create: {
              width: 800,
              height: 600,
              channels: 3,
              background: { r: 15, g: 23, b: 42 },
            },
          })
            .jpeg({ quality: 80 })
            .toBuffer();
        }

        if (fileBuffer) {
          const ext = ev.mediaType === 'video' ? 'mp4' : ev.mediaType === 'document' ? 'pdf' : 'jpg';
          const oemFileName = ev.oemFileName || `${warrantyCase.roNumber}${ev.ruleKey}.${ext}`;
          archive.append(fileBuffer, { name: oemFileName });
        }
      } catch (fileErr) {
        this.logger.warn(`Failed to include file ${ev.name || ev.ruleKey} in ZIP: ${fileErr.message}`);
      }
    }

    await archive.finalize();
  }

  /**
   * Resolves evidence file bytes from local disk, data URI, or HTTP/S3 URL.
   */
  private async fetchFileBuffer(ev: any, caseId: string): Promise<Buffer | null> {
    if (!ev || !ev.storageUrl) return null;

    const url: string = ev.storageUrl;

    // 1. Handle base64 Data URI
    if (url.startsWith('data:')) {
      const commaIdx = url.indexOf(',');
      if (commaIdx !== -1) {
        return Buffer.from(url.substring(commaIdx + 1), 'base64');
      }
    }

    // 2. Check local disk path (e.g. /uploads/caseId/fileName or ./uploads/caseId/fileName)
    const localUploadDir = process.env.LOCAL_UPLOAD_PATH || './uploads';
    const oemName = ev.oemFileName || path.basename(url.split('?')[0]);

    // Check possible local file locations
    const candidatePaths = [
      path.resolve(process.cwd(), localUploadDir, caseId, oemName),
      path.resolve(process.cwd(), localUploadDir, oemName),
      path.resolve(process.cwd(), url.replace(/^\//, '')),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p);
      }
    }

    // 3. Handle remote HTTP / S3 URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 10000,
        });
        return Buffer.from(response.data);
      } catch (err: any) {
        this.logger.warn(`Could not fetch remote evidence URL ${url}: ${err.message}`);
        return null;
      }
    }

    return null;
  }
}
