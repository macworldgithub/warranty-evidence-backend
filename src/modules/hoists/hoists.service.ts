import { randomUUID } from 'crypto';
import { Injectable, NotFoundException, OnModuleInit, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hoist, HoistDocument } from '../../schemas/hoist.schema';
import { HoistInspection, HoistInspectionDocument } from '../../schemas/hoist-inspection.schema';

export interface SubmitInspectionDto {
  hoistId: string;
  inspectorId: string;
  inspectorName: string;
  inspectorRole?: string;
  shiftDate?: string;
  shiftType?: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'DAILY';
  status: 'PASS' | 'FAULT_IDENTIFIED' | 'TAGGED_OUT';
  checklistItems: Array<{
    itemId: string;
    title: string;
    status: 'PASS' | 'FAULT' | 'NA';
    notes?: string;
    photoUrl?: string;
  }>;
  faultNotes?: string;
  faultSeverity?: 'NONE' | 'MINOR' | 'MODERATE' | 'CRITICAL';
  photos?: string[];
  lockoutTagoutApplied?: boolean;
  correctiveActionRequired?: boolean;
  managerNotes?: string;
}

export interface UpdateHoistDto {
  name?: string;
  capacityKg?: number;
  type?: string;
  status?: 'OPERATIONAL' | 'FAULT_IDENTIFIED' | 'OUT_OF_SERVICE';
  lockoutTagoutActive?: boolean;
  activeFaultNotes?: string;
  isActive?: boolean;
}

@Injectable()
export class HoistsService implements OnModuleInit {
  constructor(
    @InjectModel(Hoist.name) private hoistModel: Model<HoistDocument>,
    @InjectModel(HoistInspection.name) private inspectionModel: Model<HoistInspectionDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultHoists();
  }

  static readonly southlandSiteIds = [
    'site_chery_southland', 'site_southland_isuzu_ute', 'site_southland_kia', 'site_southland_lepas',
  ];

  async seedDefaultHoists() {
    const hoistsToSeed: any[] = [];

    // 11 Hoists for Facility 1: Hyundai / Chery Workshop
    for (let i = 1; i <= 11; i++) {
      let type = '2-Post Clearfloor (4.5T)';
      let capacity = 4500;
      if (i === 6) {
        type = '4-Post Wheel Alignment (5.0T)';
        capacity = 5000;
      } else if (i === 11) {
        type = 'EV High-Voltage Drop Lift (4.5T)';
        capacity = 4500;
      } else if (i === 10) {
        type = 'Scissor Alignment Lift (4.0T)';
        capacity = 4000;
      }

      hoistsToSeed.push({
        id: `hoist_sm_hc_${String(i).padStart(2, '0')}`,
        hoistNumber: i,
        name: `Hoist ${i}`,
        facility: 'hyundai_chery',
        facilityName: 'Hyundai & Chery Workshop',
        siteId: 'site_south_morang_hyundai',
        brand: 'Hyundai / Chery',
        capacityKg: capacity,
        type,
        status: 'OPERATIONAL',
        lockoutTagoutActive: false,
        isActive: true,
      });
    }

    // 11 Hoists for Facility 2: BYD / Kia Workshop
    for (let i = 1; i <= 11; i++) {
      let type = '2-Post Clearfloor (4.5T)';
      let capacity = 4500;
      if (i === 4 || i === 8) {
        type = 'EV Heavy-Duty Lift (5.0T)';
        capacity = 5000;
      } else if (i === 7) {
        type = '4-Post Wheel Alignment (5.5T)';
        capacity = 5500;
      } else if (i === 12) {
        type = 'Scissor Underbody Platform (3.5T)';
        capacity = 3500;
      }

      hoistsToSeed.push({
        id: `hoist_sm_bk_${String(i).padStart(2, '0')}`,
        hoistNumber: i,
        name: `Hoist ${i}`,
        facility: 'byd_kia',
        facilityName: 'BYD & Kia Workshop',
        siteId: 'site_south_morang_byd',
        brand: 'BYD / Kia',
        capacityKg: capacity,
        type,
        status: 'OPERATIONAL',
        lockoutTagoutActive: false,
        isActive: true,
      });
    }

    const southlandAreas = [
      { code: 'mw', name: 'Main Workshop', count: 22 },
      { code: 'hy', name: 'Holding Yard', count: 3 },
      { code: 'ur', name: 'Used Car Reco', count: 5 },
    ];
    let southlandNumber = 0;
    for (const area of southlandAreas) {
      for (let bay = 1; bay <= area.count; bay++) {
        const id = 'hoist_sl_' + area.code + '_' + String(bay).padStart(2, '0');
        await this.hoistModel.updateOne({ id }, { $setOnInsert: {
          id, hoistNumber: ++southlandNumber, name: area.name + ' Hoist ' + bay,
          facility: 'southland', facilityName: area.name, siteId: HoistsService.southlandSiteIds[0],
          brand: 'Unrecorded', type: 'Unrecorded', capacityKg: null,
          status: 'OPERATIONAL', isActive: true, lockoutTagoutActive: false,
        } }, { upsert: true });
      }
    }

    for (const h of hoistsToSeed) {
      const { name, ...initialFields } = h;
      await this.hoistModel.updateOne(
        { id: h.id }, { $set: { name }, $setOnInsert: initialFields }, { upsert: true },
      );
    }
    // Retire the old twelfth bay without removing its inspection history.
    await this.hoistModel.updateOne({ id: 'hoist_sm_bk_12' }, { $set: { isActive: false } });
  }

  private activeHoistFilter() {
    return {
      isActive: true,
      $or: [
        { facility: 'southland', hoistNumber: { $gte: 1 } },
        { facility: { $ne: 'southland' }, hoistNumber: { $gte: 1, $lte: 11 } },
      ],
    };
  }

  async findAll(facility?: string, siteId?: string): Promise<Hoist[]> {
    const filter: any = this.activeHoistFilter();
    if (facility && facility !== 'all') {
      filter.facility = facility;
    }
    if (siteId) {
      if (HoistsService.southlandSiteIds.includes(siteId)) {
        filter.$and = [{ $or: [{ siteId }, { facility: 'southland' }] }];
      } else {
        filter.siteId = siteId;
      }
    }
    return this.hoistModel.find(filter).sort({ facility: 1, hoistNumber: 1, facilityName: 1 }).lean();
  }

  async findOne(id: string): Promise<Hoist> {
    const hoist = await this.hoistModel.findOne({ id }).lean();
    if (!hoist) {
      throw new NotFoundException(`Hoist with id ${id} not found`);
    }
    return hoist;
  }

  async getSummary(facility?: string) {
    const filter: any = this.activeHoistFilter();
    if (facility && facility !== 'all') {
      filter.facility = facility;
    }

    const hoists = await this.hoistModel.find(filter).lean();
    const today = new Date().toISOString().slice(0, 10);

    let operational = 0;
    let faultIdentified = 0;
    let outOfService = 0;
    let inspectedToday = 0;
    let pendingToday = 0;

    for (const h of hoists) {
      if (h.status === 'OUT_OF_SERVICE' || h.lockoutTagoutActive) {
        outOfService++;
      } else if (h.status === 'FAULT_IDENTIFIED') {
        faultIdentified++;
      } else {
        operational++;
      }

      const isCheckedToday = h.lastInspectionDate &&
        new Date(h.lastInspectionDate).toISOString().slice(0, 10) === today;

      if (isCheckedToday) {
        inspectedToday++;
      } else {
        pendingToday++;
      }
    }

    return {
      totalHoists: hoists.length,
      inspectedToday,
      pendingToday,
      operational,
      faultIdentified,
      outOfService,
      todayDate: today,
    };
  }

  async submitInspection(dto: SubmitInspectionDto): Promise<HoistInspection> {
    const hoist = await this.hoistModel.findOne({ id: dto.hoistId });
    if (!hoist) {
      throw new NotFoundException(`Hoist ${dto.hoistId} not found`);
    }

    const shiftDate = dto.shiftDate || new Date().toISOString().slice(0, 10);
    const inspId = `insp_${dto.hoistId}_${Date.now()}`;

    const inspection = new this.inspectionModel({
      id: inspId,
      hoistId: hoist.id,
      hoistNumber: hoist.hoistNumber,
      facility: hoist.facility,
      siteId: hoist.siteId,
      inspectorId: dto.inspectorId,
      inspectorName: dto.inspectorName,
      inspectorRole: dto.inspectorRole || 'TECHNICIAN',
      shiftDate,
      shiftType: dto.shiftType || 'DAILY',
      status: dto.status,
      checklistItems: dto.checklistItems || [],
      faultNotes: dto.faultNotes,
      faultSeverity: dto.faultSeverity || (dto.status === 'PASS' ? 'NONE' : 'MINOR'),
      photos: dto.photos || [],
      lockoutTagoutApplied: dto.lockoutTagoutApplied || false,
      correctiveActionRequired: dto.correctiveActionRequired || dto.status !== 'PASS',
      managerNotes: dto.managerNotes,
      signedAt: new Date(),
    });

    const saved = await inspection.save();

    // Determine new hoist status
    let newStatus: 'OPERATIONAL' | 'FAULT_IDENTIFIED' | 'OUT_OF_SERVICE' = 'OPERATIONAL';
    if (dto.status === 'TAGGED_OUT' || dto.lockoutTagoutApplied || dto.faultSeverity === 'CRITICAL') {
      newStatus = 'OUT_OF_SERVICE';
    } else if (dto.status === 'FAULT_IDENTIFIED') {
      newStatus = 'FAULT_IDENTIFIED';
    }

    await this.hoistModel.updateOne(
      { id: hoist.id },
      {
        $set: {
          status: newStatus,
          lastInspectionDate: new Date(),
          lastInspectionStatus: dto.status,
          lastInspectedBy: dto.inspectorId,
          lastInspectedByName: dto.inspectorName,
          activeFaultNotes: dto.faultNotes || (dto.status === 'PASS' ? '' : hoist.activeFaultNotes),
          lockoutTagoutActive: dto.lockoutTagoutApplied || false,
        },
      },
    );

    return saved.toObject();
  }

  async assign(id: string, dto: { jobNumber?: string; vehicleRego?: string }, staffId: string) {
    const jobNumber = dto.jobNumber?.trim();
    const vehicleRego = dto.vehicleRego?.trim().toUpperCase();
    if (!jobNumber && !vehicleRego) throw new BadRequestException('Enter a job / RO number or vehicle registration.');
    const assigned = await this.hoistModel.findOneAndUpdate({
      id, ...this.activeHoistFilter(), status: 'OPERATIONAL',
      lockoutTagoutActive: { $ne: true }, assignment: null,
    }, { $set: { assignment: { id: randomUUID(), jobNumber, vehicleRego, assignedBy: staffId, assignedAt: new Date().toISOString() } } }, { returnDocument: 'after' }).lean();
    if (!assigned) throw new ConflictException('This hoist is occupied, inactive or unavailable. Refresh and choose an operational hoist.');
    return assigned;
  }

  async release(id: string, assignmentId: string) {
    const released = await this.hoistModel.findOneAndUpdate({ id, 'assignment.id': assignmentId },
      { $unset: { assignment: '' } }, { returnDocument: 'after' }).lean();
    if (!released) throw new ConflictException('The hoist assignment changed. Refresh before releasing it.');
    return released;
  }

  async getInspections(hoistId?: string, facility?: string, shiftDate?: string, limit: number = 50): Promise<HoistInspection[]> {
    const filter: any = {};
    if (hoistId) filter.hoistId = hoistId;
    if (facility && facility !== 'all') filter.facility = facility;
    if (shiftDate) filter.shiftDate = shiftDate;

    return this.inspectionModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async updateHoist(id: string, dto: UpdateHoistDto): Promise<Hoist> {
    const updated = await this.hoistModel
      .findOneAndUpdate({ id }, { $set: dto }, { returnDocument: 'after' })
      .lean();
    if (!updated) {
      throw new NotFoundException(`Hoist with id ${id} not found`);
    }
    return updated;
  }
}
