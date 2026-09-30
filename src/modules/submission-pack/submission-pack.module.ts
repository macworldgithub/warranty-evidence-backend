import { Module } from '@nestjs/common';
import { SubmissionPackController } from './submission-pack.controller';
import { SubmissionPackService } from './submission-pack.service';
import { PdfSummaryService } from './pdf-summary.service';
import { WarrantyCasesModule } from '../warranty-cases/warranty-cases.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [WarrantyCasesModule, AuthModule],
  controllers: [SubmissionPackController],
  providers: [SubmissionPackService, PdfSummaryService],
  exports: [SubmissionPackService, PdfSummaryService],
})
export class SubmissionPackModule {}
