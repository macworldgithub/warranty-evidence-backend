import { LoanReservationsService } from './loan-reservations.service';
import { Site, SiteSchema } from '../../schemas/site.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoanAgreement, LoanAgreementSchema } from '../../schemas/loan-agreement.schema';
import { LoanAgreementsService } from './loan-agreements.service';
import { LoanAgreementsController } from './loan-agreements.controller';
import { LoanAgreementPdfService } from './loan-agreement-pdf.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: LoanAgreement.name, schema: LoanAgreementSchema },
      { name: Site.name, schema: SiteSchema },
    ]),
  ],
  controllers: [LoanAgreementsController],
  providers: [LoanReservationsService, LoanAgreementsService, LoanAgreementPdfService],
  exports: [LoanAgreementsService],
})
export class LoanAgreementsModule {}
