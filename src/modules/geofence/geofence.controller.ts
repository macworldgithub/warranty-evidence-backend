import { Controller, Post, Get, Body, Param, Query, Headers, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeofenceService, PingTelemetryDto } from './geofence.service';
import { AuthService, UserProfileDto } from '../auth/auth.service';
import { UserRole } from '../../common/enums';

@ApiTags('Geofence & Staff Presence')
@Controller('geofence')
export class GeofenceController {
  constructor(
    private readonly geofenceService: GeofenceService,
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
      throw new ForbiddenException('This geofence site is outside your assigned sites.');
    }
  }

  @Post('ping')
  @ApiOperation({ summary: 'Send technician GPS telemetry ping and update ON_SITE / OFF_SITE status' })
  @ApiResponse({ status: 200, description: 'Evaluated geofence presence and boundary state' })
  async ping(@Body() dto: PingTelemetryDto, @Headers('authorization') authorization?: string) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    if (user.role !== UserRole.ADMIN && dto.technicianId !== user.id) {
      throw new ForbiddenException('You can only submit your own location telemetry.');
    }
    dto.siteId = dto.siteId || user.defaultSiteId;
    this.assertSiteAccess(user, dto.siteId);
    return this.geofenceService.processPing(dto);
  }

  @Get(['roster/:siteId', 'site/:siteId/roster'])
  @ApiOperation({ summary: 'Get live staff presence roster for a specific dealership site' })
  @ApiResponse({ status: 200, description: 'List of staff members and their ON_SITE/OFF_SITE status' })
  async getSiteRoster(@Param('siteId') siteId: string, @Headers('authorization') authorization?: string) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    const isAll = siteId === 'all' || siteId === 'all_sites';
    if (!isAll) this.assertSiteAccess(user, siteId);
    return this.geofenceService.getSiteRoster(siteId, isAll ? this.allowedSites(user) : undefined);
  }

  @Get(['events/:siteId', 'site/:siteId/events'])
  @ApiOperation({ summary: 'Get geofence perimeter transition event history for a site' })
  @ApiResponse({ status: 200, description: 'Recent geofence crossing events' })
  async getSiteEvents(
    @Param('siteId') siteId: string,
    @Query('limit') limit?: number,
    @Headers('authorization') authorization?: string,
  ) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    const isAll = siteId === 'all' || siteId === 'all_sites';
    if (!isAll) this.assertSiteAccess(user, siteId);
    return this.geofenceService.getSiteEvents(
      isAll ? this.allowedSites(user) : siteId,
      limit ? Number(limit) : 50,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get group-wide staff presence and test drive telemetry summary' })
  @ApiResponse({ status: 200, description: 'Aggregate presence metrics across all rooftops' })
  async getSummary(@Headers('authorization') authorization?: string) {
    const user = await this.authService.resolveUserFromAuthorization(authorization);
    return this.geofenceService.getSummary(this.allowedSites(user));
  }
}
