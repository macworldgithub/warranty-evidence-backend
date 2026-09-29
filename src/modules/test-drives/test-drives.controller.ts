import { Controller, Post, Get, Put, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import {
  TestDrivesService,
  StartTestDriveDto,
  TelemetryPointDto,
  CompleteTestDriveDto,
  CreateTripDto,
  UpdateTripDto,
} from './test-drives.service';

@ApiTags('Client Vehicle Test Drive Logs')
@Controller('test-drives')
export class TestDrivesController {
  constructor(private readonly testDrivesService: TestDrivesService) {}

  @Post('start')
  @ApiOperation({ summary: 'Arm & start a live or simulated vehicle test drive' })
  @ApiResponse({ status: 201, description: 'Test drive record created and initialized' })
  async startTestDrive(@Body() dto: StartTestDriveDto) {
    return this.testDrivesService.startTestDrive(dto);
  }

  @Post(':id/points')
  @ApiOperation({ summary: 'Stream GPS telemetry breadcrumb points during active test drive' })
  @ApiResponse({ status: 200, description: 'Appended telemetry points to test drive' })
  async recordTelemetry(
    @Param('id') id: string,
    @Body() body: { points: TelemetryPointDto[] },
  ) {
    return this.testDrivesService.recordTelemetry(id, body.points || []);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Finalize test drive with duration, distance, max speed, and diagnostic outcome' })
  @ApiResponse({ status: 200, description: 'Test drive completed and saved to warranty evidence database' })
  async completeTestDrive(
    @Param('id') id: string,
    @Body() dto: CompleteTestDriveDto,
  ) {
    return this.testDrivesService.completeTestDrive(id, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new test drive trip record manually' })
  @ApiResponse({ status: 201, description: 'Created trip record' })
  async createTrip(@Body() dto: CreateTripDto) {
    return this.testDrivesService.createTrip(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing test drive trip record' })
  @ApiResponse({ status: 200, description: 'Updated trip record' })
  async updateTrip(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.testDrivesService.updateTrip(id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Patch fields of a test drive trip record' })
  @ApiResponse({ status: 200, description: 'Patched trip record' })
  async patchTrip(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.testDrivesService.updateTrip(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a test drive trip record' })
  @ApiResponse({ status: 200, description: 'Trip record deleted' })
  async deleteTrip(@Param('id') id: string) {
    return this.testDrivesService.deleteTrip(id);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter client vehicle test drive logs for Dealership Portal' })
  @ApiQuery({ name: 'siteId', required: false, description: 'Filter by dealership rooftop site ID' })
  @ApiQuery({ name: 'ro', required: false, description: 'Filter by Repair Order number' })
  @ApiQuery({ name: 'registration', required: false, description: 'Filter by vehicle registration plate' })
  @ApiQuery({ name: 'technicianId', required: false, description: 'Filter by technician ID' })
  @ApiQuery({ name: 'outcome', required: false, description: 'Filter by outcome (Passed, Flagged, Pending)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (IN_PROGRESS, COMPLETED, CANCELLED)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('siteId') siteId?: string,
    @Query('ro') ro?: string,
    @Query('registration') registration?: string,
    @Query('technicianId') technicianId?: string,
    @Query('outcome') outcome?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.testDrivesService.findAll({
      siteId,
      ro,
      registration,
      technicianId,
      outcome,
      status,
      page,
      limit,
    });
  }

  @Get('by-ro/:roNumber')
  @ApiOperation({ summary: 'Get all test drive logs linked to a specific Repair Order' })
  @ApiResponse({ status: 200, description: 'List of test drives for RO' })
  async findByRo(@Param('roNumber') roNumber: string) {
    return this.testDrivesService.findByRo(roNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single test drive log with full GPS route breadcrumbs' })
  @ApiResponse({ status: 200, description: 'Test drive record' })
  async findById(@Param('id') id: string) {
    return this.testDrivesService.findById(id);
  }
}
