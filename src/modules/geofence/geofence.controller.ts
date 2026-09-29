import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeofenceService, PingTelemetryDto } from './geofence.service';

@ApiTags('Geofence & Staff Presence')
@Controller('geofence')
export class GeofenceController {
  constructor(private readonly geofenceService: GeofenceService) {}

  @Post('ping')
  @ApiOperation({ summary: 'Send technician GPS telemetry ping and update ON_SITE / OFF_SITE status' })
  @ApiResponse({ status: 200, description: 'Evaluated geofence presence and boundary state' })
  async ping(@Body() dto: PingTelemetryDto) {
    try {
      return await this.geofenceService.processPing(dto);
    } catch (err: any) {
      console.error('Pinging error:', err);
      return { error: err.message || String(err), stack: err.stack };
    }
  }

  @Get(['roster/:siteId', 'site/:siteId/roster'])
  @ApiOperation({ summary: 'Get live staff presence roster for a specific dealership site' })
  @ApiResponse({ status: 200, description: 'List of staff members and their ON_SITE/OFF_SITE status' })
  async getSiteRoster(@Param('siteId') siteId: string) {
    return this.geofenceService.getSiteRoster(siteId);
  }

  @Get(['events/:siteId', 'site/:siteId/events'])
  @ApiOperation({ summary: 'Get geofence perimeter transition event history for a site' })
  @ApiResponse({ status: 200, description: 'Recent geofence crossing events' })
  async getSiteEvents(
    @Param('siteId') siteId: string,
    @Query('limit') limit?: number,
  ) {
    return this.geofenceService.getSiteEvents(siteId, limit ? Number(limit) : 50);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get group-wide staff presence and test drive telemetry summary' })
  @ApiResponse({ status: 200, description: 'Aggregate presence metrics across all rooftops' })
  async getSummary() {
    return this.geofenceService.getSummary();
  }
}
