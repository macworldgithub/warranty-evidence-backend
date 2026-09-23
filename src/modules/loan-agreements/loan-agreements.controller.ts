import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LoanAgreementsService } from './loan-agreements.service';
import { CreateLoanAgreementDto } from './dto/create-loan-agreement.dto';
import { SignLoanAgreementDto } from './dto/sign-loan-agreement.dto';
import { ReturnLoanAgreementDto } from './dto/return-loan-agreement.dto';

@ApiTags('Loan Vehicle Agreements')
@Controller('loan-agreements')
export class LoanAgreementsController {
  constructor(private readonly service: LoanAgreementsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get operational KPIs: Available, Out now, Due soon, Overdue' })
  async getKpis(@Query('siteId') siteId?: string) {
    return this.service.getKpis(siteId);
  }

  @Get()
  @ApiOperation({ summary: 'List loan agreements with site and status filtering' })
  async findAll(
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(siteId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single loan agreement by ID' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('issue')
  @ApiOperation({ summary: 'Issue new loan vehicle agreement draft' })
  async issueAgreement(
    @Body() dto: CreateLoanAgreementDto,
    @Req() req: any,
  ) {
    return this.service.issueAgreement(dto, req.user);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Submit borrower electronic signature and lock agreement' })
  async signAgreement(
    @Param('id') id: string,
    @Body() dto: SignLoanAgreementDto,
  ) {
    return this.service.signAgreement(id, dto);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Complete return inspection, calculate excess km, and return vehicle' })
  async returnAgreement(
    @Param('id') id: string,
    @Body() dto: ReturnLoanAgreementDto,
    @Req() req: any,
  ) {
    return this.service.returnAgreement(id, dto, req.user);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Stream signed agreement PDF' })
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const agreement = await this.service.findById(id);

    const cleanPath = agreement.pdfStorageUrl ? agreement.pdfStorageUrl.replace(/^\//, '') : null;
    const absolutePath = cleanPath ? path.resolve(__dirname, '..', '..', '..', cleanPath) : null;

    if (absolutePath && fs.existsSync(absolutePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${agreement.agreementNumber}.pdf"`);
      return fs.createReadStream(absolutePath).pipe(res);
    }

    // Generate dynamically on the fly
    try {
      const { buffer } = await this.service.generatePdfForAgreement(agreement);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${agreement.agreementNumber}.pdf"`);
      return res.send(buffer);
    } catch (err: any) {
      return res.status(500).json({ message: 'Failed to generate PDF', error: err?.message });
    }
  }
}
