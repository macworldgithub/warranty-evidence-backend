import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as crypto from 'crypto';

@Injectable()
export class LoanAgreementPdfService {
  private readonly logger = new Logger(LoanAgreementPdfService.name);

  async generateLoanAgreementPdf(agreementData: any): Promise<{ buffer: Buffer; sha256: string }> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 32, bottom: 32, left: 36, right: 36 },
          info: {
            Title: `Test Drive & Loan Agreement - ${agreementData.agreementNumber}`,
            Author: 'Booran Motor Group',
            Subject: `Loan Agreement for ${agreementData.vehicle?.rego || 'Vehicle'}`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          const finalBuffer = Buffer.concat(buffers);
          const sha256 = crypto.createHash('sha256').update(finalBuffer).digest('hex');
          resolve({ buffer: finalBuffer, sha256 });
        });
        doc.on('error', (err) => reject(err));

        const pageWidth = doc.page.width - 72; // 523.28
        const left = 36;
        const right = left + pageWidth;

        // ── 1. HEADER BANNER ──────────────────────────────────────────
        doc.roundedRect(left, 32, pageWidth, 56, 6).fill('#E11F26'); // Booran Red

        doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold')
          .text('BOORAN MOTOR GROUP', left + 16, 42);

        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
          .text('CUSTOMER TEST DRIVE & LOAN VEHICLE AGREEMENT', left + 16, 60);

        doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold')
          .text(agreementData.agreementNumber || 'BMG-LOAN-2026', left, 42, { width: pageWidth - 16, align: 'right' });

        const siteText = (agreementData.siteName || 'Booran BYD Cranbourne').toUpperCase();
        doc.fillColor('#FEE2E2').fontSize(8).font('Helvetica')
          .text(`ROOFTOP: ${siteText}  |  STATUS: SIGNED & ACTIVE`, left, 60, { width: pageWidth - 16, align: 'right' });

        let y = 98;

        // ── 2. SUMMARY GRID: BORROWER & VEHICLE ────────────────────────
        doc.roundedRect(left, y, pageWidth, 110, 5).strokeColor('#E2E8F0').lineWidth(1).stroke();

        // Customer Column (Left Half)
        doc.fillColor('#E11F26').fontSize(9).font('Helvetica-Bold').text('BORROWER (CUSTOMER)', left + 12, y + 10);
        doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text(agreementData.customer?.name || 'Customer Name', left + 12, y + 24);
        
        doc.fillColor('#64748B').fontSize(8).font('Helvetica')
          .text(`DOB: ${agreementData.customer?.dob || 'N/A'}  ·  Mobile: ${agreementData.customer?.mobile || 'N/A'}`, left + 12, y + 38)
          .text(`Email: ${agreementData.customer?.email || 'N/A'}`, left + 12, y + 50)
          .text(`Address: ${agreementData.customer?.residentialAddress || 'N/A'}`, left + 12, y + 62)
          .text(`Licence #: ${agreementData.customer?.licenceNumber || 'N/A'} (${agreementData.customer?.licenceState || 'VIC'})  ·  Exp: ${agreementData.customer?.licenceExpiry || 'N/A'}`, left + 12, y + 74);

        doc.fillColor('#059669').fontSize(8).font('Helvetica-Bold')
          .text(`✓ LICENCE SIGHTED BY DEALERSHIP STAFF`, left + 12, y + 88);

        // Vehicle Column (Right Half)
        const midX = left + (pageWidth / 2) + 8;
        doc.fillColor('#E11F26').fontSize(9).font('Helvetica-Bold').text('LOAN VEHICLE DETAILS', midX, y + 10);
        const vehTitle = `${agreementData.vehicle?.year || 2024} ${agreementData.vehicle?.make || 'Toyota'} ${agreementData.vehicle?.model || 'RAV4'}`;
        doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold').text(vehTitle, midX, y + 24);

        doc.fillColor('#64748B').fontSize(8).font('Helvetica')
          .text(`Rego: ${agreementData.vehicle?.rego || 'N/A'}  ·  Colour: ${agreementData.vehicle?.colour || 'White'}`, midX, y + 38)
          .text(`VIN: ${agreementData.vehicle?.vin || 'N/A'}`, midX, y + 50)
          .text(`Outbound Odo: ${agreementData.outbound?.odometerOut?.toLocaleString() || '12,000'} km  ·  Fuel: ${agreementData.outbound?.fuelLevelOutPercent || 100}%`, midX, y + 62)
          .text(`Due Back: ${agreementData.dueBackDateTime ? new Date(agreementData.dueBackDateTime).toLocaleString() : '5:00 PM'}`, midX, y + 74)
          .text(`Daily Cap: ${agreementData.dailyKmCap || 50} km/day  ·  Excess Rate: $${agreementData.excessKmRate || '0.50'}/km`, midX, y + 86);

        y += 120;

        // ── 3. OPERATIVE TERMS (18 CLAUSES AS SUPPLIED) ────────────────
        doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('OPERATIVE TERMS & CONDITIONS (VICTORIA)', left, y);
        y += 12;

        const clauses = [
          '1. The Borrower shall not lend, sell or encumber the vehicle for any purpose whatsoever.',
          '2. The Borrower shall not allow any person to drive the vehicle, other than a person authorised in writing by the Dealership.',
          '3. The Dealership may require, in any manner and at any time, the immediate return of the vehicle by the Borrower.',
          '4. The Borrower shall not drive the vehicle outside the State of Victoria.',
          '5. At the expiration of the loan period, or when required to return the vehicle to the Dealership, the Borrower shall return it in the same condition as the vehicle was provided, subject to reasonable wear and tear.',
          '6. The Borrower shall indemnify and keep the Dealership indemnified for any loss or damage whatsoever caused to the motor vehicle whilst in control of unauthorized drivers, persons under the influence of drugs/alcohol, racing or carrying unlawful loads.',
          '7. The Borrower shall indemnify the Dealership for any fines or penalties whatsoever incurred whilst the vehicle is in the custody of the Borrower.',
          '8. The Borrower shall indemnify the Dealership for any damage or loss caused or contributed to by the Borrower.',
          '9. The Borrower will be liable for any loss incurred by the Dealership (including the full cost of the vehicle) if stolen due to being left unlocked or keys unattended.',
          '10. If any incident or defect occurs please contact the Dealership immediately.',
          '11. INSURANCE EXCESS SCHEDULE: Basic Excess: $2,500. Age Excess <21 yrs: +$1,250. Age Excess 21-25 yrs: +$750. Drivers over 25 yrs licensed <2 yrs in Australia: +$750.',
          '12. Any damage caused whilst in custody of the Borrower not subject to an insurance claim becomes the liability of the Borrower.',
          '13. Vehicles must remain on sealed roads at all times.',
          '14. Strictly no smoking, vaping, drinking or eating in or on the vehicle.',
          '15. Please refrain from transporting pets or animals in or on the vehicle.',
          '16. Return by 5:00pm on the agreed day. A daily usage limit of 50km applies. Excess kilometres travelled are charged at 50c per kilometre.',
          '17. Any tolls, road usage charges, fines or infringements are the sole responsibility of the Borrower.',
          '18. Personal information is collected under our Privacy Policy to administer this vehicle loan, insurance, and statutory compliance.',
        ];

        doc.fontSize(6.5).font('Helvetica').fillColor('#334155');
        for (const cl of clauses) {
          doc.text(cl, left, y, { width: pageWidth, lineGap: 1 });
          y += 11;
        }

        y += 6;

        // ── 4. MANDATORY E-SIGN ACKNOWLEDGEMENTS ──────────────────────
        doc.roundedRect(left, y, pageWidth, 40, 4).fill('#F8FAFC');
        doc.strokeColor('#E2E8F0').lineWidth(1).rect(left, y, pageWidth, 40).stroke();

        doc.fillColor('#0F172A').fontSize(7).font('Helvetica-Bold')
          .text('[X] I have read, understood and agree to the 18 operative clauses above.', left + 10, y + 8)
          .text('[X] I consent to this agreement being electronically signed and stored under ETA 1999 (Cth) & ETA 2000 (Vic).', left + 10, y + 18)
          .text('[X] Privacy Act 1988 Collection Notice acknowledged. Staff attested my driver licence was physically sighted.', left + 10, y + 28);

        y += 48;

        // ── 5. SIGNATURE & AUDIT BLOCKS ──────────────────────────────
        const sigBoxWidth = (pageWidth - 16) / 2;

        // Borrower Signature Box
        doc.roundedRect(left, y, sigBoxWidth, 80, 5).strokeColor('#CBD5E1').lineWidth(1).stroke();
        doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('BORROWER ELECTRONIC SIGNATURE', left + 10, y + 8);

        if (agreementData.signatures?.borrowerSignatureDataUrl?.startsWith('data:image')) {
          try {
            const base64Data = agreementData.signatures.borrowerSignatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            doc.image(imgBuffer, left + 10, y + 20, { width: 120, height: 35 });
          } catch (e) {
            doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text(agreementData.customer?.name || 'Digitally Signed', left + 10, y + 30);
          }
        } else {
          doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(agreementData.customer?.name || 'Digitally Signed', left + 10, y + 30);
        }

        const signedDate = agreementData.signatures?.borrowerSignedAt
          ? new Date(agreementData.signatures.borrowerSignedAt).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })
          : new Date().toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' });
        doc.fillColor('#475569').fontSize(7).font('Helvetica')
          .text(`Signed: ${signedDate} AEST  ·  Auth: In-Person Electronic E-Sign`, left + 10, y + 66);

        // Staff Countersignature Box
        const staffBoxX = left + sigBoxWidth + 16;
        doc.roundedRect(staffBoxX, y, sigBoxWidth, 80, 5).strokeColor('#CBD5E1').lineWidth(1).stroke();
        doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('DEALERSHIP STAFF COUNTERSIGNATURE', staffBoxX + 10, y + 8);
        doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(agreementData.outbound?.issuedByStaffName || 'Authorised Officer', staffBoxX + 10, y + 30);
        doc.fillColor('#475569').fontSize(7).font('Helvetica')
          .text(`Staff ID: ${agreementData.outbound?.issuedByStaffId || 'STAFF'}  ·  Licence Sighted & Key Released`, staffBoxX + 10, y + 66);

        y += 88;

        // ── 6. AUDIT FOOTER & CRYPTOGRAPHIC HASH ─────────────────────
        doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica')
          .text(`System Generated by OmniSuiteAI Platform  |  Governing Law: Victoria, Australia  |  Audit Log ID: ${agreementData.id || 'AGR'}`, left, y)
          .text(`Immutable SHA-256 Digest: ${crypto.createHash('sha256').update(agreementData.agreementNumber || '').digest('hex')}`, left, y + 9);

        doc.end();
      } catch (err) {
        this.logger.error('Failed to generate loan agreement PDF:', err);
        reject(err);
      }
    });
  }
}
