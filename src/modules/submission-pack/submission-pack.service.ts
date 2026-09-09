import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { WarrantyCasesService } from '../warranty-cases/warranty-cases.service';

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

  @ApiProperty({ example: 'https://s3.ap-southeast-2.amazonaws.com/booran-warranty/packs/BYD_CR-98421_SubmissionPack.zip' })
  zipDownloadUrl: string;

  @ApiProperty({ example: 'CR-98421_CaseSummary.pdf' })
  pdfSummaryFileName: string;

  @ApiProperty({ example: 'https://s3.ap-southeast-2.amazonaws.com/booran-warranty/packs/CR-98421_CaseSummary.pdf' })
  pdfSummaryDownloadUrl: string;

  @ApiProperty({ type: [SubmissionPackFileItemDto] })
  includedFiles: SubmissionPackFileItemDto[];

  @ApiProperty({ example: '2026-09-03T10:00:00.000Z' })
  generatedAt: string;
}

@Injectable()
export class SubmissionPackService {
  constructor(private readonly warrantyCasesService: WarrantyCasesService) {}

  async generateSubmissionPack(caseId: string): Promise<SubmissionPackResponseDto> {
    const warrantyCase = await this.warrantyCasesService.findOne(caseId);

    const includedFiles: SubmissionPackFileItemDto[] = (warrantyCase.evidenceItems || []).map((ev: any) => ({
      oemFileName: `${warrantyCase.roNumber}${ev.ruleKey}.${ev.mediaType === 'video' ? 'mp4' : 'jpg'}`,
      mimeType: ev.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
      downloadUrl: ev.storageUrl,
      sizeBytes: ev.mediaType === 'video' ? 14200000 : 1850000,
    }));

    // Add generated Case Summary PDF
    const pdfSummaryFileName = `${warrantyCase.roNumber}_CaseSummary.pdf`;
    includedFiles.push({
      oemFileName: pdfSummaryFileName,
      mimeType: 'application/pdf',
      downloadUrl: `https://s3.ap-southeast-2.amazonaws.com/booran-warranty/pdfs/${pdfSummaryFileName}`,
      sizeBytes: 320000,
    });

    const zipFileName = `${warrantyCase.brandName}_${warrantyCase.roNumber}_SubmissionPack.zip`;

    return {
      caseId: warrantyCase.id,
      roNumber: warrantyCase.roNumber,
      claimNumber: warrantyCase.claimNumber || 'PENDING',
      zipFileName,
      zipDownloadUrl: `https://s3.ap-southeast-2.amazonaws.com/booran-warranty/packs/${zipFileName}`,
      pdfSummaryFileName,
      pdfSummaryDownloadUrl: `https://s3.ap-southeast-2.amazonaws.com/booran-warranty/pdfs/${pdfSummaryFileName}`,
      includedFiles,
      generatedAt: new Date().toISOString(),
    };
  }
}
