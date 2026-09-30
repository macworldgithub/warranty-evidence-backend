import { Module } from '@nestjs/common';
import { LegalDocumentsController } from './legal-documents.controller';

@Module({
  controllers: [LegalDocumentsController],
})
export class LegalDocumentsModule {}
