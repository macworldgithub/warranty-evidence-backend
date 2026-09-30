import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TestDriveLog, TestDriveLogDocument } from '../../schemas/test-drive-log.schema';
import { Site, SiteDocument } from '../../schemas/site.schema';
import { User, UserDocument } from '../../schemas/user.schema';

export interface StartTestDriveDto {
  repairOrder: string;
  registration: string;
  vin?: string;
  vehicleLabel?: string;
  make?: string;
  model?: string;
  year?: number;
  variant?: string;
  colour?: string;
  odometerKm?: number;
  customerName?: string;
  customerConcern?: string;
  technicianId: string;
  technicianName?: string;
  siteId?: string;
  isLiveGps?: boolean;
}

export interface TelemetryPointDto {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp?: number;
  x?: number;
  y?: number;
  isInsideFence?: boolean;
}

export interface CompleteTestDriveDto {
  duration?: string;
  durationSeconds?: number;
  distanceKm?: number;
  maxSpeedKph?: number;
  avgSpeedKph?: number;
  outcome: 'Passed' | 'Flagged';
  technicianNotes?: string;
  routePoints?: TelemetryPointDto[];
  geofenceAutoVerified?: boolean;
}

export interface CreateTripDto {
  repairOrder: string;
  registration: string;
  vin?: string;
  vehicleLabel?: string;
  make?: string;
  model?: string;
  year?: number;
  customerConcern?: string;
  technicianId?: string;
  technicianName?: string;
  siteId?: string;
  siteName?: string;
  duration?: string;
  durationSeconds?: number;
  distanceKm?: number;
  maxSpeedKph?: number;
  avgSpeedKph?: number;
  outcome?: 'Passed' | 'Flagged';
  technicianNotes?: string;
  status?: string;
}

export interface UpdateTripDto {
  repairOrder?: string;
  registration?: string;
  vin?: string;
  vehicleLabel?: string;
  make?: string;
  model?: string;
  year?: number;
  customerConcern?: string;
  technicianId?: string;
  technicianName?: string;
  siteId?: string;
  siteName?: string;
  duration?: string;
  durationSeconds?: number;
  distanceKm?: number;
  maxSpeedKph?: number;
  avgSpeedKph?: number;
  outcome?: 'Passed' | 'Flagged';
  technicianNotes?: string;
  status?: string;
}

export interface TestDriveQueryFilters {
  siteId?: string;
  siteIds?: string[];
  ro?: string;
  registration?: string;
  technicianId?: string;
  outcome?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class TestDrivesService {
  constructor(
    @InjectModel(TestDriveLog.name) private testDriveModel: Model<TestDriveLogDocument>,
    @InjectModel(Site.name) private siteModel: Model<SiteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    await this.seedInitialLogsIfEmpty();
  }

  async startTestDrive(dto: StartTestDriveDto) {
    let site = await this.siteModel.findOne({ id: dto.siteId }).lean();
    if (!site) {
      site = await this.siteModel.findOne({ isActive: true }).lean();
    }

    const tech = await this.userModel.findOne({
      $or: [{ id: dto.technicianId }, { email: dto.technicianId }],
    }).lean();

    const techName = dto.technicianName || tech?.name || 'Active Technician';
    const siteId = site?.id || 'site_cranbourne_byd';
    const siteName = site?.name || 'Booran BYD Cranbourne';
    const vehicleLabel = dto.vehicleLabel || `${dto.year || ''} ${dto.make || ''} ${dto.model || ''}`.trim() || dto.registration;

    const id = `TD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newDrive = new this.testDriveModel({
      id,
      repairOrder: dto.repairOrder.toUpperCase().trim(),
      registration: dto.registration.toUpperCase().trim(),
      vin: dto.vin || '',
      vehicleLabel,
      make: dto.make,
      model: dto.model,
      year: dto.year,
      variant: dto.variant,
      colour: dto.colour,
      odometerKm: dto.odometerKm || 0,
      customerName: dto.customerName || 'Customer',
      customerConcern: dto.customerConcern || '',
      technicianId: dto.technicianId,
      technicianName: techName,
      siteId,
      siteName,
      startTime: new Date(),
      duration: '0m 00s',
      durationSeconds: 0,
      distanceKm: 0,
      maxSpeedKph: 0,
      outcome: 'Pending',
      technicianNotes: '',
      geofenceAutoVerified: false,
      status: 'IN_PROGRESS',
      isLiveGps: dto.isLiveGps !== false,
      routePoints: [],
    });

    try {
      const saved = await newDrive.save();
      return saved.toObject();
    } catch (err: any) {
      console.error('Error saving new TestDriveLog:', err);
      throw err;
    }
  }

  async recordTelemetry(id: string, points: TelemetryPointDto[]) {
    const drive = await this.testDriveModel.findOne({ id });
    if (!drive) throw new NotFoundException(`Test drive ${id} not found`);

    if (points && points.length > 0) {
      const highestSpeed = Math.max(...points.map((p) => p.speed || 0));
      if (highestSpeed > drive.maxSpeedKph) {
        drive.maxSpeedKph = Math.round(highestSpeed);
      }

      // Check boundary crossings
      for (const p of points) {
        if (p.isInsideFence === false && !drive.geofenceExitAt) {
          drive.geofenceExitAt = new Date(p.timestamp || Date.now());
        }
        if (p.isInsideFence === true && drive.geofenceExitAt && !drive.geofenceReturnAt) {
          drive.geofenceReturnAt = new Date(p.timestamp || Date.now());
          drive.geofenceAutoVerified = true;
        }
      }

      drive.routePoints.push(...(points as any));
      if (drive.routePoints.length > 500) {
        drive.routePoints = drive.routePoints.slice(drive.routePoints.length - 500);
      }
    }

    await drive.save();
    return { success: true, count: drive.routePoints.length, maxSpeedKph: drive.maxSpeedKph };
  }

  async completeTestDrive(id: string, dto: CompleteTestDriveDto) {
    const drive = await this.testDriveModel.findOne({ id });
    if (!drive) throw new NotFoundException(`Test drive ${id} not found`);

    drive.endTime = new Date();
    if (dto.duration) drive.duration = dto.duration;
    if (dto.durationSeconds !== undefined) drive.durationSeconds = dto.durationSeconds;
    if (dto.distanceKm !== undefined) drive.distanceKm = Number(dto.distanceKm.toFixed(2));
    if (dto.maxSpeedKph !== undefined) drive.maxSpeedKph = Math.max(drive.maxSpeedKph, Math.round(dto.maxSpeedKph));
    if (dto.avgSpeedKph !== undefined) drive.avgSpeedKph = Math.round(dto.avgSpeedKph);

    drive.outcome = dto.outcome;
    if (dto.technicianNotes !== undefined) drive.technicianNotes = dto.technicianNotes;
    drive.status = 'COMPLETED';
    drive.geofenceAutoVerified = dto.geofenceAutoVerified ?? true;
    if (!drive.geofenceReturnAt) drive.geofenceReturnAt = new Date();

    if (dto.routePoints && dto.routePoints.length > 0) {
      drive.routePoints = dto.routePoints as any;
    }

    const updated = await drive.save();
    return updated.toObject();
  }

  async findAll(filters: TestDriveQueryFilters) {
    const query: any = {};

    if (filters.siteIds) {
      query.siteId = { $in: filters.siteIds };
    } else if (filters.siteId && filters.siteId.toLowerCase() !== 'all' && filters.siteId !== 'all_sites') {
      query.siteId = filters.siteId;
    }

    if (filters.outcome && filters.outcome.toLowerCase() !== 'all') {
      query.outcome = filters.outcome;
    }

    if (filters.status && filters.status.toLowerCase() !== 'all') {
      query.status = filters.status;
    }

    if (filters.technicianId) {
      query.technicianId = filters.technicianId;
    }

    if (filters.ro) {
      query.repairOrder = { $regex: filters.ro.trim(), $options: 'i' };
    }

    if (filters.registration) {
      query.registration = { $regex: filters.registration.trim(), $options: 'i' };
    }

    const page = Math.max(1, filters.page ? Number(filters.page) : 1);
    const limit = Math.max(1, Math.min(100, filters.limit ? Number(filters.limit) : 20));
    const skip = (page - 1) * limit;

    let total = await this.testDriveModel.countDocuments(query);
    if (total === 0 && Object.keys(query).length === 0) {
      await this.seedInitialLogsIfEmpty();
      total = await this.testDriveModel.countDocuments(query);
    }

    const items = await this.testDriveModel.find(query).sort({ startTime: -1 }).skip(skip).limit(limit).lean();

    // Calculate aggregated KPIs for dashboard
    const allMatching = await this.testDriveModel.find(query).select('outcome maxSpeedKph distanceKm geofenceAutoVerified').lean();
    const totalDrives = allMatching.length;
    const passedCount = allMatching.filter((t) => t.outcome === 'Passed').length;
    const flaggedCount = allMatching.filter((t) => t.outcome === 'Flagged').length;
    const autoVerifiedCount = allMatching.filter((t) => t.geofenceAutoVerified).length;
    const avgMaxSpeed = totalDrives > 0
      ? Math.round(allMatching.reduce((acc, t) => acc + (t.maxSpeedKph || 0), 0) / totalDrives)
      : 0;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      kpis: {
        totalDrives,
        passedCount,
        flaggedCount,
        autoVerifiedRate: totalDrives > 0 ? Math.round((autoVerifiedCount / totalDrives) * 100) : 100,
        avgMaxSpeed,
      },
    };
  }

  async findById(id: string) {
    const drive = await this.testDriveModel.findOne({ id }).lean();
    if (!drive) throw new NotFoundException(`Test drive ${id} not found`);
    return drive;
  }

  async findByRo(roNumber: string) {
    const q = roNumber.trim();
    return this.testDriveModel
      .find({ repairOrder: { $regex: `^${q}$`, $options: 'i' } })
      .sort({ startTime: -1 })
      .lean();
  }

  async createTrip(dto: CreateTripDto) {
    let site = dto.siteId ? await this.siteModel.findOne({ id: dto.siteId }).lean() : null;
    if (!site) {
      site = await this.siteModel.findOne({ isActive: true }).lean();
    }

    const tech = dto.technicianId
      ? await this.userModel.findOne({
          $or: [{ id: dto.technicianId }, { email: dto.technicianId }],
        }).lean()
      : null;

    const techName = dto.technicianName || tech?.name || 'Technician';
    const siteId = site?.id || dto.siteId || 'site_cranbourne_byd';
    const siteName = site?.name || dto.siteName || 'Booran BYD Cranbourne';
    const vehicleLabel = dto.vehicleLabel || `${dto.year || ''} ${dto.make || ''} ${dto.model || ''}`.trim() || dto.registration;

    const id = `TD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newTrip = new this.testDriveModel({
      id,
      repairOrder: dto.repairOrder.toUpperCase().trim(),
      registration: dto.registration.toUpperCase().trim(),
      vin: dto.vin || '',
      vehicleLabel,
      make: dto.make,
      model: dto.model,
      year: dto.year,
      customerConcern: dto.customerConcern || '',
      technicianId: dto.technicianId || 'usr_tech_1',
      technicianName: techName,
      siteId,
      siteName,
      startTime: new Date(),
      endTime: new Date(),
      status: dto.status || 'COMPLETED',
      duration: dto.duration || '10m 00s',
      durationSeconds: dto.durationSeconds || 600,
      distanceKm: dto.distanceKm !== undefined ? Number(dto.distanceKm.toFixed(2)) : 5.0,
      maxSpeedKph: dto.maxSpeedKph || 60,
      avgSpeedKph: dto.avgSpeedKph || 45,
      outcome: dto.outcome || 'Passed',
      technicianNotes: dto.technicianNotes || '',
      geofenceAutoVerified: true,
      geofenceReturnAt: new Date(),
      routePoints: [],
    });

    const saved = await newTrip.save();
    return saved.toObject();
  }

  async updateTrip(id: string, dto: UpdateTripDto) {
    const drive = await this.testDriveModel.findOne({ id });
    if (!drive) throw new NotFoundException(`Test drive trip ${id} not found`);

    if (dto.repairOrder) drive.repairOrder = dto.repairOrder.toUpperCase().trim();
    if (dto.registration) drive.registration = dto.registration.toUpperCase().trim();
    if (dto.vin !== undefined) drive.vin = dto.vin;
    if (dto.vehicleLabel) drive.vehicleLabel = dto.vehicleLabel;
    if (dto.make !== undefined) drive.make = dto.make;
    if (dto.model !== undefined) drive.set('model', dto.model);
    if (dto.year !== undefined) drive.year = dto.year;
    if (dto.customerConcern !== undefined) drive.customerConcern = dto.customerConcern;
    if (dto.technicianId) drive.technicianId = dto.technicianId;
    if (dto.technicianName) drive.technicianName = dto.technicianName;
    if (dto.siteId) drive.siteId = dto.siteId;
    if (dto.siteName) drive.siteName = dto.siteName;
    if (dto.duration !== undefined) drive.duration = dto.duration;
    if (dto.durationSeconds !== undefined) drive.durationSeconds = dto.durationSeconds;
    if (dto.distanceKm !== undefined) drive.distanceKm = Number(dto.distanceKm.toFixed(2));
    if (dto.maxSpeedKph !== undefined) drive.maxSpeedKph = Math.round(dto.maxSpeedKph);
    if (dto.avgSpeedKph !== undefined) drive.avgSpeedKph = Math.round(dto.avgSpeedKph);
    if (dto.outcome) drive.outcome = dto.outcome;
    if (dto.technicianNotes !== undefined) drive.technicianNotes = dto.technicianNotes;
    if (dto.status) drive.status = dto.status as any;

    const updated = await drive.save();
    return updated.toObject();
  }

  async deleteTrip(id: string) {
    const res = await this.testDriveModel.deleteOne({ id });
    if (res.deletedCount === 0) {
      throw new NotFoundException(`Test drive trip ${id} not found`);
    }
    return { success: true, message: `Trip ${id} deleted successfully`, id };
  }

  private async seedInitialLogsIfEmpty() {
    const count = await this.testDriveModel.countDocuments();
    if (count > 0) return;

    const demoRouteCranbourne = [
      { x: 18, y: 68, speed: 0, latitude: -38.0992, longitude: 145.2813 },
      { x: 18, y: 65, speed: 14, latitude: -38.0988, longitude: 145.2814 },
      { x: 19, y: 58, speed: 32, latitude: -38.0975, longitude: 145.2816 },
      { x: 23, y: 54, speed: 48, latitude: -38.0962, longitude: 145.2825 },
      { x: 31, y: 55, speed: 60, latitude: -38.0955, longitude: 145.2845 },
      { x: 42, y: 62, speed: 68, latitude: -38.0968, longitude: 145.2875 },
      { x: 50, y: 68, speed: 74, latitude: -38.0980, longitude: 145.2895 },
      { x: 62, y: 76, speed: 76, latitude: -38.0995, longitude: 145.2925 },
      { x: 74, y: 79, speed: 71, latitude: -38.1005, longitude: 145.2955 },
      { x: 84, y: 72, speed: 58, latitude: -38.0990, longitude: 145.2980 },
      { x: 80, y: 58, speed: 46, latitude: -38.0965, longitude: 145.2970 },
      { x: 68, y: 44, speed: 62, latitude: -38.0935, longitude: 145.2940 },
      { x: 55, y: 35, speed: 66, latitude: -38.0915, longitude: 145.2905 },
      { x: 44, y: 28, speed: 52, latitude: -38.0900, longitude: 145.2880 },
      { x: 35, y: 24, speed: 48, latitude: -38.0890, longitude: 145.2855 },
      { x: 26, y: 22, speed: 36, latitude: -38.0885, longitude: 145.2830 },
      { x: 21, y: 32, speed: 28, latitude: -38.0910, longitude: 145.2818 },
      { x: 18, y: 48, speed: 20, latitude: -38.0945, longitude: 145.2814 },
      { x: 18, y: 68, speed: 0, latitude: -38.0992, longitude: 145.2813 },
    ];

    const seeds = [
      {
        id: 'TD-RO48291-01',
        repairOrder: 'RO-48291',
        registration: 'SGS 274',
        vin: '6G1MK5E37LL194821',
        vehicleLabel: '2021 Holden Commodore RS-V',
        make: 'Holden',
        model: 'Commodore',
        year: 2021,
        variant: 'RS-V Liftback',
        colour: 'Heron White',
        odometerKm: 48210,
        customerName: 'Marcus Vance',
        customerConcern: 'Intermittent shudder under light load at 60–80 km/h after transmission fluid service.',
        technicianId: 'tech_byd_01',
        technicianName: 'Aaron Miller (Senior Tech)',
        siteId: 'site_cranbourne_byd',
        siteName: 'Booran BYD Cranbourne',
        startTime: new Date(Date.now() - 3600000 * 2),
        endTime: new Date(Date.now() - 3600000 * 2 + 768000),
        duration: '12m 48s',
        durationSeconds: 768,
        distanceKm: 6.8,
        maxSpeedKph: 76,
        avgSpeedKph: 51,
        outcome: 'Passed' as const,
        technicianNotes: 'Transmission lockup shudder reproduced at 68 km/h on Dandenong Rd test sector. Telemetry confirms lockup clutch slip variance; adaptation reset applied and verified clear.',
        geofenceExitAt: new Date(Date.now() - 3600000 * 2 + 60000),
        geofenceReturnAt: new Date(Date.now() - 3600000 * 2 + 760000),
        geofenceAutoVerified: true,
        status: 'COMPLETED' as const,
        isLiveGps: true,
        routePoints: demoRouteCranbourne,
      },
      {
        id: 'TD-RO48305-02',
        repairOrder: 'RO-48305',
        registration: 'BWM 882',
        vin: 'KMHJ381BBNU842109',
        vehicleLabel: '2022 Hyundai Tucson Highlander',
        make: 'Hyundai',
        model: 'Tucson',
        year: 2022,
        variant: 'Highlander AWD',
        colour: 'Phantom Black',
        odometerKm: 32150,
        customerName: 'Sarah Jenkins',
        customerConcern: 'Rattle from front-right suspension over sharp road joints.',
        technicianId: 'tech_byd_02',
        technicianName: 'Liam Cooper (Diagnostics Tech)',
        siteId: 'site_cranbourne_byd',
        siteName: 'Booran BYD Cranbourne',
        startTime: new Date(Date.now() - 3600000 * 24),
        endTime: new Date(Date.now() - 3600000 * 24 + 912000),
        duration: '15m 12s',
        durationSeconds: 912,
        distanceKm: 9.4,
        maxSpeedKph: 82,
        avgSpeedKph: 54,
        outcome: 'Passed' as const,
        technicianNotes: 'Post-sway bar link and bushing replacement verification. Suspension quiet across railway crossings and rough road surface.',
        geofenceExitAt: new Date(Date.now() - 3600000 * 24 + 55000),
        geofenceReturnAt: new Date(Date.now() - 3600000 * 24 + 905000),
        geofenceAutoVerified: true,
        status: 'COMPLETED' as const,
        isLiveGps: true,
        routePoints: demoRouteCranbourne,
      },
      {
        id: 'TD-RO48319-03',
        repairOrder: 'RO-48319',
        registration: 'VIC 901',
        vin: 'KNAFX81ABPT291048',
        vehicleLabel: '2023 Kia Sportage GT-Line',
        make: 'Kia',
        model: 'Sportage',
        year: 2023,
        variant: 'GT-Line Diesel',
        colour: 'Steel Grey',
        odometerKm: 18400,
        customerName: 'David Chen',
        customerConcern: 'Check engine warning lamp illuminated during sustained highway driving.',
        technicianId: 'tech_byd_01',
        technicianName: 'Aaron Miller (Senior Tech)',
        siteId: 'site_cranbourne_byd',
        siteName: 'Booran BYD Cranbourne',
        startTime: new Date(Date.now() - 3600000 * 48),
        endTime: new Date(Date.now() - 3600000 * 48 + 500000),
        duration: '8m 20s',
        durationSeconds: 500,
        distanceKm: 4.2,
        maxSpeedKph: 64,
        avgSpeedKph: 42,
        outcome: 'Flagged' as const,
        technicianNotes: 'DTC P0299 (Turbo Underboost) set at 62 km/h under moderate acceleration. Intercooler charge hose clamp found loose. Requires warranty clamp replacement.',
        geofenceExitAt: new Date(Date.now() - 3600000 * 48 + 45000),
        geofenceReturnAt: new Date(Date.now() - 3600000 * 48 + 490000),
        geofenceAutoVerified: true,
        status: 'COMPLETED' as const,
        isLiveGps: true,
        routePoints: demoRouteCranbourne,
      },
    ];

    try {
      await this.testDriveModel.insertMany(seeds);
      console.log('🚗 Seeded initial client vehicle test drive logs');
    } catch (e) {
      console.warn('Seeding test drives failed:', e);
    }
  }
}
