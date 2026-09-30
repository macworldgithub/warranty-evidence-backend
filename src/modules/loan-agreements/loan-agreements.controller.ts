import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { LoanAgreementsService } from './loan-agreements.service';
import { CreateLoanAgreementDto } from './dto/create-loan-agreement.dto';
import { UpdateLoanAgreementDto } from './dto/update-loan-agreement.dto';
import { SignLoanAgreementDto } from './dto/sign-loan-agreement.dto';
import { ReturnLoanAgreementDto } from './dto/return-loan-agreement.dto';
import { AuthService, UserProfileDto } from '../auth/auth.service';
import { UserRole } from '../../common/enums';

@ApiTags('Loan Vehicle Agreements')
@Controller('loan-agreements')
export class LoanAgreementsController {
  constructor(
    private readonly service: LoanAgreementsService,
    private readonly authService: AuthService,
  ) {}

  private allowedSites(user: UserProfileDto): string[] | undefined {
    if (user.role === UserRole.ADMIN) return undefined;
    const assigned = (user.authorizedSiteIds || []).filter(Boolean);
    if (assigned.length > 0) return assigned;
    if (user.defaultSiteId) return [user.defaultSiteId];
    return ['site_cranbourne_byd'];
  }

  private assertSiteAccess(user: UserProfileDto, siteId: string): void {
    const allowed = this.allowedSites(user);
    if (allowed && !allowed.includes(siteId)) {
      throw new ForbiddenException('This loan record is outside your assigned sites.');
    }
  }

  private async scopedSite(user: UserProfileDto, requestedSiteId?: string): Promise<string | string[] | undefined> {
    if (requestedSiteId && requestedSiteId !== 'all') {
      this.assertSiteAccess(user, requestedSiteId);
      return requestedSiteId;
    }
    return this.allowedSites(user);
  }

  private async assertAgreementAccess(user: UserProfileDto, id: string) {
    const agreement = await this.service.findById(id);
    this.assertSiteAccess(user, agreement.siteId);
    return agreement;
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get operational KPIs: Available, Out now, Due soon, Overdue' })
  async getKpis(
    @Query('siteId') siteId?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    return this.service.getKpis(await this.scopedSite(user, siteId));
  }

  @Get()
  @ApiOperation({ summary: 'List loan agreements with site and status filtering' })
  async findAll(
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    return this.service.findAll(await this.scopedSite(user, siteId), status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single loan agreement by ID' })
  async findById(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    return this.assertAgreementAccess(user, id);
  }

  @Post('issue')
  @ApiOperation({ summary: 'Issue new loan vehicle agreement draft' })
  async issueAgreement(
    @Body() dto: CreateLoanAgreementDto,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    this.assertSiteAccess(user, dto.siteId);
    return this.service.issueAgreement(dto, user);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Submit borrower electronic signature and lock agreement' })
  async signAgreement(
    @Param('id') id: string,
    @Body() dto: SignLoanAgreementDto,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    await this.assertAgreementAccess(user, id);
    return this.service.signAgreement(id, dto);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Complete return inspection, calculate excess km, and return vehicle' })
  async returnAgreement(
    @Param('id') id: string,
    @Body() dto: ReturnLoanAgreementDto,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    await this.assertAgreementAccess(user, id);
    return this.service.returnAgreement(id, dto, user);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Stream signed agreement PDF' })
  async getPdf(@Param('id') id: string, @Headers('authorization') authorization: string | undefined, @Res() res: Response) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    const agreement = await this.assertAgreementAccess(user, id);

    const cleanPath = agreement.pdfStorageUrl ? agreement.pdfStorageUrl.replace(/^\//, '') : null;
    const absolutePath = cleanPath ? path.resolve(__dirname, '..', '..', '..', cleanPath) : null;

    if (absolutePath && fs.existsSync(absolutePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${agreement.agreementNumber}.pdf"`);
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update/edit loan vehicle agreement details' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLoanAgreementDto,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    await this.assertAgreementAccess(user, id);
    if (dto.siteId) this.assertSiteAccess(user, dto.siteId);
    return this.service.update(id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update/edit loan vehicle agreement details (PUT)' })
  async updatePut(
    @Param('id') id: string,
    @Body() dto: UpdateLoanAgreementDto,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    await this.assertAgreementAccess(user, id);
    if (dto.siteId) this.assertSiteAccess(user, dto.siteId);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete/void loan vehicle agreement' })
  async delete(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    await this.assertAgreementAccess(user, id);
    return this.service.delete(id);
  }
}
