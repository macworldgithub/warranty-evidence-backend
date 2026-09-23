import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { LoanAgreement, LoanAgreementDocument } from '../../schemas/loan-agreement.schema';
import { CreateLoanAgreementDto } from './dto/create-loan-agreement.dto';
import { SignLoanAgreementDto } from './dto/sign-loan-agreement.dto';
import { ReturnLoanAgreementDto } from './dto/return-loan-agreement.dto';
import { LoanAgreementPdfService } from './loan-agreement-pdf.service';

@Injectable()
export class LoanAgreementsService implements OnModuleInit {
  private readonly logger = new Logger(LoanAgreementsService.name);

  constructor(
    @InjectModel(LoanAgreement.name)
    private readonly loanAgreementModel: Model<LoanAgreementDocument>,
    private readonly pdfService: LoanAgreementPdfService,
  ) {}

  async onModuleInit() {
    await this.seedInitialAgreements();
  }

  // ── Seed realistic agreements if collection is empty ───────────────────────
  private async seedInitialAgreements() {
    const count = await this.loanAgreementModel.countDocuments();
    if (count > 0) return;

    this.logger.log('Seeding initial Booran Customer Loan Agreements...');

    const sampleAgreements = [
      {
        id: 'lagr_cranbourne_001',
        agreementNumber: 'BMG-CRANBOURNE-2026-0148',
        siteId: 'site_cranbourne_byd',
        siteName: 'Booran BYD Cranbourne',
        roNumber: 'RO-48021',
        purpose: 'SERVICE_LOANER',
        status: 'ACTIVE',
        customer: {
          name: 'David Okonkwo',
          dob: '1988-06-14',
          mobile: '+61 412 000 006',
          email: 'david.okonkwo@gmail.com',
          residentialAddress: '42 Station St, Cranbourne VIC 3977',
          licenceNumber: '98421098',
          licenceState: 'VIC',
          licenceExpiry: '2028-11-20',
          licenceClass: 'C',
          licenceSighted: true,
        },
        vehicle: {
          vin: 'LGXCE4C86P0019283',
          rego: 'BMG214',
          make: 'Toyota',
          model: 'RAV4 Cruiser',
          year: 2024,
          colour: 'Pearl White',
          stockNumber: 'LN-9842',
        },
        loanStartDateTime: new Date(Date.now() - 3600000 * 5).toISOString(),
        dueBackDateTime: new Date(Date.now() + 3600000 * 2).toISOString(),
        dailyKmCap: 50,
        excessKmRate: 0.50,
        basicInsuranceExcess: 2500,
        outbound: {
          odometerOut: 12485,
          fuelLevelOutPercent: 75,
          damageNotes: 'Minor scuff on rear left wheel arch.',
          photos: {
            front: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
          },
          issuedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          issuedByStaffId: 'usr_tech_1',
          issuedByStaffName: 'Jake Smith',
        },
        signatures: {
          borrowerSignatureDataUrl: 'data:image/png;base64,sample_signature',
          borrowerSignedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          readAndAgreed: true,
          electronicConsent: true,
          privacyNoticeAcknowledged: true,
          marketingConsent: false,
          staffSignedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
        templateVersion: 'v1.0-2026',
      },
      {
        id: 'lagr_cranbourne_002',
        agreementNumber: 'BMG-CRANBOURNE-2026-0147',
        siteId: 'site_cranbourne_byd',
        siteName: 'Booran BYD Cranbourne',
        roNumber: 'RO-99120',
        purpose: 'TEST_DRIVE',
        status: 'OVERDUE',
        customer: {
          name: 'Priya Sharma',
          dob: '1995-02-18',
          mobile: '+61 422 111 888',
          email: 'priya.sharma@outlook.com',
          residentialAddress: '15 High St, Berwick VIC 3806',
          licenceNumber: '44102941',
          licenceState: 'VIC',
          licenceExpiry: '2027-04-12',
          licenceClass: 'C',
          licenceSighted: true,
        },
        vehicle: {
          vin: 'LGXCE4C86P0022391',
          rego: 'BMG198',
          make: 'Kia',
          model: 'Sportage GT-Line',
          year: 2024,
          colour: 'Gravity Grey',
          stockNumber: 'LN-7710',
        },
        loanStartDateTime: new Date(Date.now() - 86400000).toISOString(),
        dueBackDateTime: new Date(Date.now() - 3600000 * 4).toISOString(), // 4h overdue
        dailyKmCap: 50,
        excessKmRate: 0.50,
        basicInsuranceExcess: 2500,
        outbound: {
          odometerOut: 18450,
          fuelLevelOutPercent: 90,
          damageNotes: 'Clean, no existing damage observed.',
          photos: {},
          issuedAt: new Date(Date.now() - 86400000).toISOString(),
          issuedByStaffId: 'usr_admin_1',
          issuedByStaffName: 'Sarah Jenkins',
        },
        signatures: {
          borrowerSignatureDataUrl: 'data:image/png;base64,sample_signature',
          borrowerSignedAt: new Date(Date.now() - 86400000).toISOString(),
          readAndAgreed: true,
          electronicConsent: true,
          privacyNoticeAcknowledged: true,
          marketingConsent: true,
        },
        templateVersion: 'v1.0-2026',
      },
      {
        id: 'lagr_dandenong_001',
        agreementNumber: 'BMG-DANDENONG-2026-0044',
        siteId: 'site_dandenong_multi',
        siteName: 'Booran Dandenong Multi-Franchise',
        roNumber: 'RO-30219',
        purpose: 'SERVICE_LOANER',
        status: 'ACTIVE',
        customer: {
          name: 'James Wilson',
          dob: '1982-10-30',
          mobile: '+61 433 999 222',
          email: 'james.wilson@buildcorp.com.au',
          residentialAddress: '88 Lonsdale St, Dandenong VIC 3175',
          licenceNumber: '11029384',
          licenceState: 'VIC',
          licenceExpiry: '2029-08-01',
          licenceClass: 'C',
          licenceSighted: true,
        },
        vehicle: {
          vin: 'JM0KF4W2800192834',
          rego: 'BMG175',
          make: 'Mazda',
          model: 'CX-5 Akera',
          year: 2023,
          colour: 'Soul Red',
          stockNumber: 'LN-6020',
        },
        loanStartDateTime: new Date(Date.now() - 3600000 * 3).toISOString(),
        dueBackDateTime: new Date(Date.now() + 3600000 * 3).toISOString(),
        dailyKmCap: 50,
        excessKmRate: 0.50,
        basicInsuranceExcess: 2500,
        outbound: {
          odometerOut: 32100,
          fuelLevelOutPercent: 100,
          damageNotes: 'Stone chips on front bumper.',
          photos: {},
          issuedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          issuedByStaffId: 'usr_tech_2',
          issuedByStaffName: 'Liam Miller',
        },
        signatures: {
          borrowerSignatureDataUrl: 'data:image/png;base64,sample_signature',
          borrowerSignedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          readAndAgreed: true,
          electronicConsent: true,
          privacyNoticeAcknowledged: true,
          marketingConsent: false,
        },
        templateVersion: 'v1.0-2026',
      },
    ];

    for (const a of sampleAgreements) {
      const created = new this.loanAgreementModel(a);
      await created.save();
    }

    this.logger.log(`Seeded ${sampleAgreements.length} loan vehicle agreements.`);
  }

  // ── GET KPIS ─────────────────────────────────────────────────────────────
  async getKpis(siteId?: string) {
    const query: any = {};
    if (siteId && siteId !== 'all') {
      query.siteId = siteId;
    }

    const agreements = await this.loanAgreementModel.find(query).lean();

    const now = Date.now();
    const in60Min = now + 3600000;

    let outNowCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    for (const agr of agreements) {
      if (agr.status === 'ACTIVE' || agr.status === 'DUE_SOON' || agr.status === 'OVERDUE') {
        outNowCount++;
        const dueTime = new Date(agr.dueBackDateTime).getTime();
        if (dueTime < now) {
          overdueCount++;
        } else if (dueTime <= in60Min) {
          dueSoonCount++;
        }
      }
    }

    // Available loaner pool across Booran dealerships
    const totalLoanerFleet = siteId && siteId !== 'all' ? 12 : 36;
    const availableCount = Math.max(0, totalLoanerFleet - outNowCount);

    return {
      available: availableCount,
      outNow: outNowCount,
      dueSoon: dueSoonCount,
      overdue: overdueCount,
    };
  }

  // ── LIST AGREEMENTS ──────────────────────────────────────────────────────
  async findAll(siteId?: string, status?: string) {
    const query: any = {};
    if (siteId && siteId !== 'all') {
      query.siteId = siteId;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    return this.loanAgreementModel.find(query).sort({ createdAt: -1 }).lean();
  }

  // ── GET BY ID ────────────────────────────────────────────────────────────
  async findById(id: string) {
    const agreement = await this.loanAgreementModel.findOne({ id }).lean();
    if (!agreement) {
      throw new NotFoundException(`Loan agreement with ID ${id} not found.`);
    }
    return agreement;
  }

  // ── ISSUE NEW LOAN AGREEMENT ─────────────────────────────────────────────
  async issueAgreement(dto: CreateLoanAgreementDto, staffUser?: any) {
    // Generate clean agreement number: BMG-{SITE}-{YEAR}-{SEQ}
    const cleanSite = (dto.siteName || 'BOORAN').replace(/[^a-zA-Z]/g, '').slice(0, 10).toUpperCase();
    const year = new Date().getFullYear();
    const count = (await this.loanAgreementModel.countDocuments()) + 1;
    const seq = String(count).padStart(4, '0');
    const agreementNumber = `BMG-${cleanSite}-${year}-${seq}`;

    const id = `lagr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newAgreement = new this.loanAgreementModel({
      id,
      agreementNumber,
      siteId: dto.siteId,
      siteName: dto.siteName || 'Booran Motor Group',
      roNumber: dto.roNumber,
      purpose: dto.purpose || 'SERVICE_LOANER',
      status: 'DRAFT',
      customer: dto.customer,
      vehicle: dto.vehicle,
      loanStartDateTime: dto.loanStartDateTime || new Date().toISOString(),
      dueBackDateTime: dto.dueBackDateTime,
      dailyKmCap: dto.dailyKmCap || 50,
      excessKmRate: dto.excessKmRate || 0.50,
      basicInsuranceExcess: dto.basicInsuranceExcess || 2500,
      outbound: {
        ...dto.outbound,
        issuedAt: new Date().toISOString(),
        issuedByStaffId: staffUser?.id || dto.outbound.issuedByStaffId || 'usr_staff_1',
        issuedByStaffName: staffUser?.name || dto.outbound.issuedByStaffName || 'Dealership Staff',
      },
      templateVersion: 'v1.0-2026',
    });

    const saved = await newAgreement.save();
    return saved.toObject();
  }

  // ── SIGN & FINALIZE AGREEMENT ────────────────────────────────────────────
  async signAgreement(id: string, dto: SignLoanAgreementDto) {
    const agreement = await this.loanAgreementModel.findOne({ id });
    if (!agreement) {
      throw new NotFoundException(`Loan agreement ${id} not found.`);
    }

    agreement.signatures = {
      borrowerSignatureDataUrl: dto.borrowerSignatureDataUrl,
      borrowerSignedAt: new Date().toISOString(),
      readAndAgreed: dto.readAndAgreed,
      electronicConsent: dto.electronicConsent,
      privacyNoticeAcknowledged: dto.privacyNoticeAcknowledged,
      marketingConsent: dto.marketingConsent || false,
      staffSignatureDataUrl: dto.staffSignatureDataUrl,
      staffSignedAt: new Date().toISOString(),
      ipAddress: dto.ipAddress || '127.0.0.1',
      deviceUserAgent: dto.deviceUserAgent || 'Mobile Tablet App',
    };
    agreement.status = 'ACTIVE';

    // Generate Official PDF
    try {
      const { buffer, sha256 } = await this.pdfService.generateLoanAgreementPdf(agreement.toObject());
      const uploadDir = path.resolve(__dirname, '..', '..', '..', 'uploads', 'agreements');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const fileName = `${agreement.agreementNumber.replace(/[^a-zA-Z0-9]/g, '_')}_Signed.pdf`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      agreement.pdfStorageUrl = `/uploads/agreements/${fileName}`;
      agreement.pdfSha256Hash = sha256;
    } catch (err) {
      this.logger.warn('PDF generation deferred:', err?.message || err);
      agreement.pdfStorageUrl = `/uploads/agreements/${agreement.agreementNumber}.pdf`;
    }

    const saved = await agreement.save();
    return saved.toObject();
  }

  // ── RETURN & EXCESS KM CALCULATION ───────────────────────────────────────
  async returnAgreement(id: string, dto: ReturnLoanAgreementDto, staffUser?: any) {
    const agreement = await this.loanAgreementModel.findOne({ id });
    if (!agreement) {
      throw new NotFoundException(`Loan agreement ${id} not found.`);
    }

    const odoOut = agreement.outbound?.odometerOut || 0;
    const odoIn = dto.odometerIn;
    const kmTravelled = Math.max(0, odoIn - odoOut);

    // Calculate loan duration in days (minimum 1 day)
    const startMs = new Date(agreement.loanStartDateTime).getTime();
    const endMs = Date.now();
    const days = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));

    const allowableKm = days * (agreement.dailyKmCap || 50);
    const excessKm = Math.max(0, kmTravelled - allowableKm);
    const excessRate = agreement.excessKmRate || 0.50;
    const excessChargeAmount = Number((excessKm * excessRate).toFixed(2));

    agreement.inbound = {
      odometerIn: odoIn,
      fuelLevelInPercent: dto.fuelLevelInPercent,
      returnDamageNotes: dto.returnDamageNotes || 'Return check complete.',
      photos: dto.photos || {},
      returnedAt: new Date().toISOString(),
      receivedByStaffId: staffUser?.id || dto.receivedByStaffId || 'usr_staff_1',
      receivedByStaffName: staffUser?.name || dto.receivedByStaffName || 'Dealership Staff',
      totalKmTravelled: kmTravelled,
      allowableKm,
      excessKm,
      excessKmChargeAmount: excessChargeAmount,
      hasDamageIncident: dto.hasDamageIncident || false,
      applicableExcessBand: dto.applicableExcessBand,
      applicableExcessAmount: dto.applicableExcessAmount || 0,
    };
    agreement.status = 'RETURNED';

    const saved = await agreement.save();
    return saved.toObject();
  }
}
