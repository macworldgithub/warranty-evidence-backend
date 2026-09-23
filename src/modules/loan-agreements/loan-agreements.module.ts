import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoanAgreement, LoanAgreementSchema } from '../../schemas/loan-agreement.schema';
import { LoanAgreementsService } from './loan-agreements.service';
import { LoanAgreementsController } from './loan-agreements.controller';
import { LoanAgreementPdfService } from './loan-agreement-pdf.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LoanAgreement.name, schema: LoanAgreementSchema },
    ]),
  ],
  controllers: [LoanAgreementsController],
  providers: [LoanAgreementsService, LoanAgreementPdfService],
  exports: [LoanAgreementsService],
})
export class LoanAgreementsModule {}
