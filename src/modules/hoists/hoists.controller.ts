import { Controller, Get, Post, Patch, Param, Query, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HoistsService, SubmitInspectionDto, UpdateHoistDto } from './hoists.service';

@ApiTags('Daily Hoist Inspections')
@Controller('hoists')
export class HoistsController {
  constructor(private readonly hoistsService: HoistsService) {}

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
