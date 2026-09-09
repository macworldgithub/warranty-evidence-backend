import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  DashboardService,
  DashboardKpisDto,
  FlagReasonStatDto,
  SitePerformanceDto,
} from './dashboard.service';

@ApiTags('Manager & Group Analytics')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get Group-wide Warranty KPIs and SLA metrics' })
  @ApiResponse({ status: 200, type: DashboardKpisDto })
  async getKpis(): Promise<DashboardKpisDto> {
    return this.dashboardService.getKpis();
  }

  @Get('flag-reasons')
  @ApiOperation({ summary: 'Get ranked failure reasons for technician training feed' })
  @ApiResponse({ status: 200, type: [FlagReasonStatDto] })
  async getFlagReasonStats(): Promise<FlagReasonStatDto[]> {
    return this.dashboardService.getFlagReasonStats();
  }

  @Get('sites-performance')
  @ApiOperation({ summary: 'Get rooftop-by-rooftop pass rates and submission velocity' })
  @ApiResponse({ status: 200, type: [SitePerformanceDto] })
  async getSitePerformance(): Promise<SitePerformanceDto[]> {
    return this.dashboardService.getSitePerformance();
  }
}
