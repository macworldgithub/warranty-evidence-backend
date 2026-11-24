import { AuthService } from '../auth/auth.service';
import { AssignHoistDto, ReleaseHoistDto } from './assignment.dto';
﻿import { Controller, Get, Post, Patch, Param, Query, Body, Headers, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HoistsService, SubmitInspectionDto, UpdateHoistDto } from './hoists.service';

@ApiTags('Daily Hoist Inspections')
@Controller('hoists')
export class HoistsController {
  constructor(private readonly hoistsService: HoistsService, private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'List all workshop hoists, optionally filtered by facility (hyundai_chery / byd_kia)' })
  async findAll(
    @Query('facility') facility?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.hoistsService.findAll(facility, siteId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get summary metrics of daily hoist inspection completion & faults' })
  async getSummary(@Query('facility') facility?: string) {
    return this.hoistsService.getSummary(facility);
  }

  @Get('inspections')
  @ApiOperation({ summary: 'Query inspection audit logs and history' })
  async getInspections(
    @Query('hoistId') hoistId?: string,
    @Query('facility') facility?: string,
    @Query('shiftDate') shiftDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.hoistsService.getInspections(hoistId, facility, shiftDate, limit ? Number(limit) : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single hoist details' })
  async findOne(@Param('id') id: string) {
    return this.hoistsService.findOne(id);
  }

  private async assignmentUser(id: string, authorization?: string) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    const hoist = await this.hoistsService.findOne(id);
    const sites = [user.defaultSiteId, ...(user.authorizedSiteIds || [])];
    const sharedSouthland = hoist.facility === 'southland' && sites.some(site => HoistsService.southlandSiteIds.includes(site));
    if (user.role !== 'ADMIN' && !sites.includes(hoist.siteId) && !sharedSouthland) {
      throw new ForbiddenException('This hoist is outside your assigned sites.');
    }
    return user;
  }

  @Post(':id/assign')
  async assign(@Param('id') id: string, @Body() dto: AssignHoistDto, @Headers('authorization') authorization?: string) {
    const user = await this.assignmentUser(id, authorization);
    return this.hoistsService.assign(id, dto, user.id);
  }

  @Post(':id/release')
  async release(@Param('id') id: string, @Body() dto: ReleaseHoistDto, @Headers('authorization') authorization?: string) {
    await this.assignmentUser(id, authorization);
    return this.hoistsService.release(id, dto.assignmentId);
  }

  @Post('inspect')
  @ApiOperation({ summary: 'Submit pre-shift daily hoist inspection with 9-item checklist' })
  async submitInspection(@Body() dto: SubmitInspectionDto) {
    return this.hoistsService.submitInspection(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update hoist configuration, status, or lockout/tagout (Admin / Manager)' })
  async updateHoist(@Param('id') id: string, @Body() dto: UpdateHoistDto) {
    return this.hoistsService.updateHoist(id, dto);
  }
}
