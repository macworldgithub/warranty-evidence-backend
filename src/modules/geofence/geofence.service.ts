import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Site, SiteDocument } from '../../schemas/site.schema';
import { User, UserDocument } from '../../schemas/user.schema';

export interface PingTelemetryDto {
  technicianId: string;
  technicianName?: string;
  siteId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speedKmh?: number;
  currentActivity?: 'INSPECTION' | 'ROAD_TEST' | 'WORKSHOP' | 'IDLE';
  activeCaseId?: string;
  activeRoNumber?: string;
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

@Injectable()
export class GeofenceService {
  constructor(
    @InjectModel(Site.name) private siteModel: Model<SiteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async processPing(dto: PingTelemetryDto) {
    let targetSite: Site | null = null;

    if (dto.siteId) {
      targetSite = await this.siteModel.findOne({ id: dto.siteId, isActive: true }).lean();
    }

    // If siteId not provided or doesn't have coordinates, find nearest site with coordinates
    if (!targetSite || targetSite.latitude === undefined || targetSite.longitude === undefined) {
      const allSites = await this.siteModel.find({ isActive: true, latitude: { $exists: true } }).lean();
      if (allSites.length > 0) {
        let minDistance = Infinity;
        for (const s of allSites) {
          if (s.latitude !== undefined && s.longitude !== undefined) {
            const dist = calculateDistanceMeters(dto.latitude, dto.longitude, s.latitude, s.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              targetSite = s;
            }
          }
        }
      }
    }

    const siteLat = targetSite?.latitude ?? -38.0992;
    const siteLng = targetSite?.longitude ?? 145.2813;
    const radius = targetSite?.geofenceRadiusMeters ?? 200;

    const distance = calculateDistanceMeters(dto.latitude, dto.longitude, siteLat, siteLng);
    const isInside = distance <= radius;
    const newStatus: 'ON_SITE' | 'OFF_SITE' = isInside ? 'ON_SITE' : 'OFF_SITE';

    // Find technician in users collection (by id or email)
    const user = await this.userModel.findOne({
      $or: [{ id: dto.technicianId }, { email: dto.technicianId }],
    }).lean();

    const prevStatus = user?.presenceStatus;
    const newEvent =
      prevStatus && prevStatus !== newStatus && targetSite
        ? {
            eventType:
              newStatus === 'OFF_SITE'
                ? dto.currentActivity === 'ROAD_TEST'
                  ? 'ROAD_TEST_STARTED'
                  : 'EXITED_SITE'
                : prevStatus === 'OFF_SITE' && dto.currentActivity === 'ROAD_TEST'
                ? 'ROAD_TEST_RETURNED'
                : 'ENTERED_SITE',
            siteId: targetSite.id,
            siteName: targetSite.name,
            latitude: dto.latitude,
            longitude: dto.longitude,
            distanceMeters: distance,
            activeRoNumber: dto.activeRoNumber,
            notes: `Crossed ${radius}m boundary (${distance}m from site center)`,
            timestamp: new Date(),
          }
        : null;

    const updateDoc: any = {
      $set: {
        presenceStatus: newStatus,
        presenceLatitude: dto.latitude,
        presenceLongitude: dto.longitude,
        presenceDistanceMeters: distance,
        presenceSpeedKmh: dto.speedKmh ?? 0,
        presenceAccuracy: dto.accuracy,
        presenceActivity: dto.currentActivity ?? 'WORKSHOP',
        presenceSiteId: targetSite?.id,
        presenceSiteName: targetSite?.name,
        presenceRoNumber: dto.activeRoNumber,
        presenceLastPingAt: new Date(),
      },
    };

    if (newEvent) {
      updateDoc.$push = {
        geofenceEvents: {
          $each: [newEvent],
          $slice: -50, // Keep last 50 events
        },
      };
    }

    // Upsert or update technician presence in users collection
    let updatedUser = await this.userModel.findOneAndUpdate(
      { $or: [{ id: dto.technicianId }, { email: dto.technicianId }] },
      updateDoc,
      { new: true },
    ).lean();

    // If user not in database yet (e.g. mobile tech session), create stub user
    if (!updatedUser) {
      const newUser = new this.userModel({
        id: dto.technicianId,
        name: dto.technicianName || 'Technician',
        email: `${dto.technicianId.toLowerCase().replace(/[^a-z0-9]/g, '')}@booran.com.au`,
        passwordHash: 'PIN_AUTH_PLACEHOLDER',
        role: 'TECHNICIAN',
        defaultSiteId: targetSite?.id || 'site_cranbourne_byd',
        authorizedSiteIds: [targetSite?.id || 'site_cranbourne_byd'],
        isActive: true,
        presenceStatus: newStatus,
        presenceLatitude: dto.latitude,
        presenceLongitude: dto.longitude,
        presenceDistanceMeters: distance,
        presenceSpeedKmh: dto.speedKmh ?? 0,
        presenceAccuracy: dto.accuracy,
        presenceActivity: dto.currentActivity ?? 'WORKSHOP',
        presenceSiteId: targetSite?.id,
        presenceSiteName: targetSite?.name,
        presenceRoNumber: dto.activeRoNumber,
        presenceLastPingAt: new Date(),
        geofenceEvents: newEvent ? [newEvent] : [],
      });
      updatedUser = (await newUser.save()).toObject();
    }

    return {
      status: newStatus,
      insideGeofence: isInside,
      distanceMeters: distance,
      siteId: targetSite?.id,
      siteName: targetSite?.name,
      radiusMeters: radius,
      presence: {
        technicianId: updatedUser.id,
        technicianName: updatedUser.name,
        siteId: targetSite?.id,
        siteName: targetSite?.name,
        status: newStatus,
        distanceMeters: distance,
        currentActivity: dto.currentActivity ?? 'WORKSHOP',
        speedKmh: dto.speedKmh ?? 0,
        lastPingAt: new Date(),
      },
    };
  }

  async getSiteRoster(siteId: string) {
    const isAll = !siteId || siteId.toLowerCase() === 'all' || siteId === 'all_sites';
    const query: any = {
      role: 'TECHNICIAN',
      isActive: true,
    };
    if (!isAll) {
      query.$or = [{ presenceSiteId: siteId }, { defaultSiteId: siteId }, { authorizedSiteIds: siteId }];
    }

    const technicians = await this.userModel
      .find(query)
      .select('-passwordHash')
      .lean();

    const roster = technicians.map((t) => ({
      technicianId: t.id,
      technicianName: t.name,
      email: t.email,
      siteId: t.presenceSiteId || t.defaultSiteId,
      siteName: t.presenceSiteName,
      status: t.presenceStatus || 'ON_SITE',
      distanceMeters: t.presenceDistanceMeters ?? 0,
      speedKmh: t.presenceSpeedKmh ?? 0,
      currentActivity: t.presenceActivity || 'WORKSHOP',
      activeRoNumber: t.presenceRoNumber,
      lastPingAt: t.presenceLastPingAt || (t as any).updatedAt || new Date(),
    }));

    roster.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'OFF_SITE' ? -1 : 1;
      }
      return new Date(b.lastPingAt).getTime() - new Date(a.lastPingAt).getTime();
    });

    const onSiteCount = roster.filter((p) => p.status === 'ON_SITE').length;
    const offSiteCount = roster.filter((p) => p.status === 'OFF_SITE').length;

    return {
      siteId,
      onSiteCount,
      offSiteCount,
      totalTracked: roster.length,
      roster,
    };
  }

  async getSiteEvents(siteId: string, limit = 50) {
    const usersWithEvents = await this.userModel
      .find({
        'geofenceEvents.siteId': siteId,
      })
      .select('name id geofenceEvents')
      .lean();

    const allEvents: any[] = [];
    for (const u of usersWithEvents) {
      if (u.geofenceEvents) {
        for (const ev of u.geofenceEvents) {
          if (ev.siteId === siteId) {
            allEvents.push({
              technicianId: u.id,
              technicianName: u.name,
              ...ev,
            });
          }
        }
      }
    }

    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return allEvents.slice(0, limit);
  }

  async getSummary() {
    const technicians = await this.userModel
      .find({ role: 'TECHNICIAN', isActive: true })
      .select('id name presenceStatus presenceActivity presenceSiteId presenceSiteName')
      .lean();

    const onSiteCount = technicians.filter((p) => p.presenceStatus === 'ON_SITE').length;
    const offSiteCount = technicians.filter((p) => p.presenceStatus === 'OFF_SITE').length;
    const roadTestCount = technicians.filter((p) => p.presenceActivity === 'ROAD_TEST').length;

    const sitesMap: Record<string, { onSite: number; offSite: number; total: number; siteName: string }> = {};
    for (const p of technicians) {
      const sId = p.presenceSiteId || 'unassigned';
      if (!sitesMap[sId]) {
        sitesMap[sId] = { onSite: 0, offSite: 0, total: 0, siteName: p.presenceSiteName || sId };
      }
      sitesMap[sId].total += 1;
      if (p.presenceStatus === 'ON_SITE') sitesMap[sId].onSite += 1;
      else sitesMap[sId].offSite += 1;
    }

    return {
      totalTracked: technicians.length,
      onSiteCount,
      offSiteCount,
      roadTestCount,
      sites: sitesMap,
    };
  }
}
