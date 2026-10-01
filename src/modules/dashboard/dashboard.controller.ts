import { Controller, Get, Headers, Query, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  DashboardService,
  DashboardKpisDto,
  FlagReasonStatDto,
  SitePerformancePaginatedDto,
} from './dashboard.service';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../../common/enums';

@ApiTags('Manager & Group Analytics')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly authService: AuthService,
  ) {}

  private async getSiteScope(authorization?: string, userId?: string, siteId?: string): Promise<string[] | undefined> {
    const user = await this.authService.resolveUserFromAuthorization(authorization, userId);
    if (siteId) {
      if (user.role === UserRole.CLERK && !user.authorizedSiteIds.includes(siteId)) {
        throw new ForbiddenException(`Access denied: You are not assigned to site '${siteId}'.`);
      }
      return [siteId];
    }
    return user.role === UserRole.CLERK ? user.authorizedSiteIds : undefined;
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get Group-wide Warranty KPIs and SLA metrics' })
  @ApiResponse({ status: 200, type: DashboardKpisDto })
  async getKpis(
    @Query('siteId') siteId?: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<DashboardKpisDto> {
    return this.dashboardService.getKpis(await this.getSiteScope(authorization, userId, siteId));
  }

  @Get('flag-reasons')
  @ApiOperation({ summary: 'Get ranked failure reasons for technician training feed' })
  @ApiResponse({ status: 200, type: [FlagReasonStatDto] })
  async getFlagReasonStats(
    @Query('siteId') siteId?: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<FlagReasonStatDto[]> {
    return this.dashboardService.getFlagReasonStats(await this.getSiteScope(authorization, userId, siteId));
  }

  @Get('sites-performance')
  @ApiOperation({ summary: 'Get rooftop-by-rooftop pass rates and submission velocity' })
  @ApiResponse({ status: 200, type: SitePerformancePaginatedDto })
  async getSitePerformance(
    @Query('siteId') siteId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<SitePerformancePaginatedDto> {
    return this.dashboardService.getSitePerformance(
      await this.getSiteScope(authorization, userId, siteId),
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search,
      },
    );
  }
}
