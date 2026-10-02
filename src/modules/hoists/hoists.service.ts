import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
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

  async seedDefaultHoists() {
    const count = await this.hoistModel.countDocuments();
    if (count >= 23) {
      return;
    }

    console.log('?? Seeding 23 Booran South Morang Hoists (11 Hyundai/Chery, 12 BYD/Kia)...');

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
        name: `Hoist Bay ${i}`,
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

    // 12 Hoists for Facility 2: BYD / Kia Workshop
    for (let i = 1; i <= 12; i++) {
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
        name: `Hoist Bay ${i}`,
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

    for (const h of hoistsToSeed) {
      await this.hoistModel.updateOne(
        { id: h.id },
        { $setOnInsert: h },
        { upsert: true },
      );
    }

    console.log(`? Hoist inventory synchronized: 23 hoists across 2 facilities`);
  }

  async findAll(facility?: string, siteId?: string): Promise<Hoist[]> {
    const filter: any = { isActive: true };
    if (facility && facility !== 'all') {
      filter.facility = facility;
    }
    if (siteId) {
      filter.siteId = siteId;
    }
    return this.hoistModel.find(filter).sort({ facility: 1, hoistNumber: 1 }).lean();
  }

  async findOne(id: string): Promise<Hoist> {
    const hoist = await this.hoistModel.findOne({ id }).lean();
    if (!hoist) {
      throw new NotFoundException(`Hoist with id ${id} not found`);
    }
    return hoist;
  }

  async getSummary(facility?: string) {
    const filter: any = { isActive: true };
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
