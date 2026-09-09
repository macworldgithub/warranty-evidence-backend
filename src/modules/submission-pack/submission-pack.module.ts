import { Module } from '@nestjs/common';
import { SubmissionPackController } from './submission-pack.controller';
import { SubmissionPackService } from './submission-pack.service';
import { WarrantyCasesModule } from '../warranty-cases/warranty-cases.module';

@Module({
  imports: [WarrantyCasesModule],
  controllers: [SubmissionPackController],
  providers: [SubmissionPackService],
  exports: [SubmissionPackService],
})
export class SubmissionPackModule {}
