import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import * as nodemailer from 'nodemailer';

export class SendNotificationDto {
  @ApiProperty({ example: 'tech_jake_s' })
  @IsString()
  recipientId: string;

  @ApiProperty({ example: '+61499918523' })
  @IsString()
  recipientPhone: string;

  @ApiProperty({ example: 'jake.smith@booran.com.au' })
  @IsString()
  recipientEmail: string;

  @ApiProperty({ example: 'Case CR-98421 Flagged: Please retake Fault Location photo' })
  @IsString()
  message: string;

  @ApiProperty({ example: 'CASE_FLAGGED' })
  @IsString()
  event: 'CASE_FLAGGED' | 'CASE_SUBMITTED' | 'AWAITING_REVIEW';
}

export interface NewTicketEmailParams {
  caseId: string;
  roNumber: string;
  vin: string;
  make: string;
  model: string;
  year?: number;
  concernTitle: string;
  faultCategory?: string;
  technicianName: string;
  siteName?: string;
  portalUrl?: string;
}

export interface CaseAcceptedEmailParams {
  caseId: string;
  roNumber: string;
  claimNumber: string;
  vin?: string;
  make?: string;
  model?: string;
  technicianName?: string;
  clerkNotes?: string;
  portalUrl?: string;
}

export interface CaseRejectedEmailParams {
  caseId: string;
  roNumber: string;
  evidenceRuleKey: string;
  reasonCode: string;
  instruction: string;
  flaggedBy?: string;
  vin?: string;
  make?: string;
  model?: string;
  technicianName?: string;
  portalUrl?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isSmtpConfigured = false;

  onModuleInit() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
        });

        this.transporter.verify((error) => {
          if (error) {
            this.logger.error(`[SMTP] Verification failed for ${user}@${host}:${port}: ${error.message}`);
          } else {
            this.isSmtpConfigured = true;
            this.logger.log(`[SMTP] Connected and ready to dispatch emails as <${user}> via ${host}:${port}`);
          }
        });
      } catch (err: any) {
        this.logger.error(`[SMTP] Error creating nodemailer transporter: ${err.message}`);
      }
    } else {
      this.logger.warn('[SMTP] Credentials not set in .env; notifications will run in mock log mode.');
    }
  }

  /**
   * Internal generic mail sender
   */
  async sendMail(options: { to: string | string[]; subject: string; html: string; text?: string }) {
    const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to;
    const fromUser = process.env.SMTP_USER || 'adteam@omnisuiteai.com';
    const sender = `"Booran Warranty Portal" <${fromUser}>`;

    this.logger.log(`[SMTP] Dispatching email to: ${recipients} | Subject: "${options.subject}"`);

    if (!this.transporter) {
      this.logger.warn(`[SMTP] Transporter not ready. Mock email logged: ${options.subject}`);
      return { success: false, reason: 'TRANSPORTER_NOT_READY' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: sender,
        to: options.to,
        subject: options.subject,
        text: options.text || options.subject,
        html: options.html,
      });
      this.logger.log(`[SMTP] Email successfully delivered to ${recipients} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      this.logger.error(`[SMTP] Failed to send email to ${recipients}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 1. Triggered when technician raises a warranty ticket -> Sent to Admin(s)
   */
  async sendNewTicketRaisedAlert(params: NewTicketEmailParams, adminEmails: string[]) {
    if (!adminEmails || adminEmails.length === 0) {
      this.logger.warn('[SMTP] No admin email recipients provided for new ticket notification.');
      return;
    }

    const appUrl = params.portalUrl || process.env.APP_URL || 'http://localhost:3000';
    const caseUrl = `${appUrl}/cases/${params.caseId}`;

    const subject = `[Booran Warranty] New Ticket Raised: RO #${params.roNumber} (${params.make} ${params.model})`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: #0b192c; padding: 24px; text-align: center; }
    .logo { color: #3b82f6; font-size: 20px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 0; }
    .subhead { color: #94a3b8; font-size: 13px; margin-top: 4px; }
    .badge-bar { background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 20px; font-size: 14px; font-weight: 600; color: #1e40af; }
    .content { padding: 24px; color: #1e293b; }
    .title { font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #0f172a; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .details-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .label { color: #64748b; font-weight: 600; width: 35%; }
    .val { color: #0f172a; font-weight: 500; }
    .btn-container { text-align: center; margin: 28px 0 16px; }
    .btn { background: #2563eb; color: #ffffff !important; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 6px; text-decoration: none; display: inline-block; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Booran Warranty Evidence</div>
      <div class="subhead">Automated Dealership Warranty Notification</div>
    </div>
    <div class="badge-bar">
      📋 ACTION REQUIRED: New Warranty Case Awaiting Review
    </div>
    <div class="content">
      <h2 class="title">Technician ${escapeHtml(params.technicianName)} has raised a warranty ticket</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-top: 0;">
        A new warranty case has been initiated and is now ready for warranty clerk / admin review. Please verify the evidence checklist and OEM compliance details.
      </p>

      <table class="details-table">
        <tr>
          <td class="label">RO Number</td>
          <td class="val"><strong>#${escapeHtml(params.roNumber)}</strong></td>
        </tr>
        <tr>
          <td class="label">Vehicle</td>
          <td class="val">${escapeHtml(params.year ? String(params.year) + ' ' : '')}${escapeHtml(params.make)} ${escapeHtml(params.model)}</td>
        </tr>
        <tr>
          <td class="label">VIN</td>
          <td class="val"><code>${escapeHtml(params.vin)}</code></td>
        </tr>
        <tr>
          <td class="label">Customer Concern</td>
          <td class="val">${escapeHtml(params.concernTitle)}</td>
        </tr>
        ${params.faultCategory ? `<tr><td class="label">Fault Category</td><td class="val">${escapeHtml(params.faultCategory)}</td></tr>` : ''}
        <tr>
          <td class="label">Technician</td>
          <td class="val">${escapeHtml(params.technicianName)}</td>
        </tr>
        ${params.siteName ? `<tr><td class="label">Dealership Site</td><td class="val">${escapeHtml(params.siteName)}</td></tr>` : ''}
      </table>

      <div class="btn-container">
        <a href="${caseUrl}" class="btn">Open Case in Admin Portal</a>
      </div>
    </div>
    <div class="footer">
      This is an automated transmission from Booran Motors Warranty Evidence Engine. Replies are not monitored.
    </div>
  </div>
</body>
</html>
    `;

    const text = `[Booran Warranty] New Ticket Raised: RO #${params.roNumber}\nTechnician: ${params.technicianName}\nVehicle: ${params.make} ${params.model} (VIN: ${params.vin})\nConcern: ${params.concernTitle}\nReview at: ${caseUrl}`;

    return this.sendMail({
      to: adminEmails,
      subject,
      html,
      text,
    });
  }

  /**
   * 2. Triggered when admin accepts/submits warranty ticket -> Sent to Technician
   */
  async sendCaseAcceptedAlert(params: CaseAcceptedEmailParams, technicianEmail: string) {
    if (!technicianEmail) {
      this.logger.warn('[SMTP] No technician email recipient provided for case accepted alert.');
      return;
    }

    const appUrl = params.portalUrl || process.env.APP_URL || 'http://localhost:3000';
    const caseUrl = `${appUrl}/cases/${params.caseId}`;

    const subject = `[Booran Warranty] Ticket Approved & Submitted: RO #${params.roNumber} (OEM Claim #${params.claimNumber})`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: #0b192c; padding: 24px; text-align: center; }
    .logo { color: #10b981; font-size: 20px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 0; }
    .subhead { color: #94a3b8; font-size: 13px; margin-top: 4px; }
    .badge-bar { background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 20px; font-size: 14px; font-weight: 600; color: #065f46; }
    .content { padding: 24px; color: #1e293b; }
    .title { font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #0f172a; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .details-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .label { color: #64748b; font-weight: 600; width: 35%; }
    .val { color: #0f172a; font-weight: 500; }
    .note-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 13px; color: #334155; margin-bottom: 20px; }
    .btn-container { text-align: center; margin: 28px 0 16px; }
    .btn { background: #10b981; color: #ffffff !important; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 6px; text-decoration: none; display: inline-block; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Booran Warranty Evidence</div>
      <div class="subhead">Warranty Ticket Update</div>
    </div>
    <div class="badge-bar">
      ✅ APPROVED: Warranty Case Submitted to OEM
    </div>
    <div class="content">
      <h2 class="title">Good news, your warranty claim has been approved!</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-top: 0;">
        ${params.technicianName ? `Hi <strong>${escapeHtml(params.technicianName)}</strong>, ` : ''}Your warranty evidence pack for <strong>RO #${escapeHtml(params.roNumber)}</strong> has passed warranty review and has been submitted into the OEM portal.
      </p>

      <table class="details-table">
        <tr>
          <td class="label">RO Number</td>
          <td class="val"><strong>#${escapeHtml(params.roNumber)}</strong></td>
        </tr>
        <tr>
          <td class="label">OEM Claim #</td>
          <td class="val"><strong style="color: #059669;">${escapeHtml(params.claimNumber)}</strong></td>
        </tr>
        ${params.make ? `<tr><td class="label">Vehicle</td><td class="val">${escapeHtml(params.make)} ${escapeHtml(params.model || '')}</td></tr>` : ''}
        ${params.vin ? `<tr><td class="label">VIN</td><td class="val"><code>${escapeHtml(params.vin)}</code></td></tr>` : ''}
        <tr>
          <td class="label">Status</td>
          <td class="val"><span style="background:#d1fae5; color:#065f46; padding: 3px 8px; border-radius: 4px; font-weight:600; font-size:12px;">Submitted & Locked</span></td>
        </tr>
      </table>

      ${params.clerkNotes ? `
      <div class="note-box">
        <strong>Clerk Review Note:</strong><br>
        "${escapeHtml(params.clerkNotes)}"
      </div>` : ''}

      <div class="btn-container">
        <a href="${caseUrl}" class="btn">View Case Details</a>
      </div>
    </div>
    <div class="footer">
      This is an automated transmission from Booran Motors Warranty Evidence Engine. Replies are not monitored.
    </div>
  </div>
</body>
</html>
    `;

    const text = `[Booran Warranty] Ticket Approved & Submitted: RO #${params.roNumber}\nOEM Claim Number: ${params.claimNumber}\nStatus: Submitted to OEM\nView at: ${caseUrl}`;

    return this.sendMail({
      to: technicianEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * 3. Triggered when admin rejects/flags warranty ticket -> Sent to Technician
   */
  async sendCaseRejectedOrFlaggedAlert(params: CaseRejectedEmailParams, technicianEmail: string) {
    if (!technicianEmail) {
      this.logger.warn('[SMTP] No technician email recipient provided for case flagged/rejected alert.');
      return;
    }

    const appUrl = params.portalUrl || process.env.APP_URL || 'http://localhost:3000';
    const caseUrl = `${appUrl}/cases/${params.caseId}`;

    const subject = `[Booran Warranty - Action Required] Ticket Flagged / Evidence Rejected: RO #${params.roNumber}`;

    const humanReadableReason = params.reasonCode
      ? params.reasonCode.replace(/_/g, ' ')
      : 'Evidence Rejected';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: #0b192c; padding: 24px; text-align: center; }
    .logo { color: #ef4444; font-size: 20px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin: 0; }
    .subhead { color: #94a3b8; font-size: 13px; margin-top: 4px; }
    .badge-bar { background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 20px; font-size: 14px; font-weight: 600; color: #991b1b; }
    .content { padding: 24px; color: #1e293b; }
    .title { font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 16px; color: #0f172a; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .details-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .label { color: #64748b; font-weight: 600; width: 35%; }
    .val { color: #0f172a; font-weight: 500; }
    .instruction-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 16px; font-size: 14px; color: #9f1239; margin-bottom: 24px; }
    .instruction-box strong { display: block; margin-bottom: 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .btn-container { text-align: center; margin: 28px 0 16px; }
    .btn { background: #ef4444; color: #ffffff !important; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 6px; text-decoration: none; display: inline-block; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Booran Warranty Evidence</div>
      <div class="subhead">Evidence Compliance Alert</div>
    </div>
    <div class="badge-bar">
      ⚠️ ACTION REQUIRED: Evidence Flagged by Warranty Reviewer
    </div>
    <div class="content">
      <h2 class="title">Attention required on RO #${escapeHtml(params.roNumber)}</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-top: 0;">
        ${params.technicianName ? `Hi <strong>${escapeHtml(params.technicianName)}</strong>, ` : ''}An evidence item in your warranty case has been flagged and requires updating before the claim can be approved.
      </p>

      <table class="details-table">
        <tr>
          <td class="label">RO Number</td>
          <td class="val"><strong>#${escapeHtml(params.roNumber)}</strong></td>
        </tr>
        <tr>
          <td class="label">Evidence Item</td>
          <td class="val"><code>${escapeHtml(params.evidenceRuleKey)}</code></td>
        </tr>
        <tr>
          <td class="label">Reject Reason</td>
          <td class="val"><span style="background:#fee2e2; color:#991b1b; padding: 3px 8px; border-radius: 4px; font-weight:600; font-size:12px;">${escapeHtml(humanReadableReason)}</span></td>
        </tr>
        ${params.flaggedBy ? `<tr><td class="label">Flagged By</td><td class="val">${escapeHtml(params.flaggedBy)}</td></tr>` : ''}
        ${params.make ? `<tr><td class="label">Vehicle</td><td class="val">${escapeHtml(params.make)} ${escapeHtml(params.model || '')}</td></tr>` : ''}
      </table>

      <div class="instruction-box">
        <strong>Reviewer Instruction / Action Required:</strong>
        "${escapeHtml(params.instruction)}"
      </div>

      <div class="btn-container">
        <a href="${caseUrl}" class="btn">Retake & Upload Replacement Evidence</a>
      </div>
    </div>
    <div class="footer">
      This is an automated transmission from Booran Motors Warranty Evidence Engine. Replies are not monitored.
    </div>
  </div>
</body>
</html>
    `;

    const text = `[Booran Warranty - Action Required] RO #${params.roNumber} Flagged\nEvidence: ${params.evidenceRuleKey}\nReason: ${params.reasonCode}\nInstruction: ${params.instruction}\nFix at: ${caseUrl}`;

    return this.sendMail({
      to: technicianEmail,
      subject,
      html,
      text,
    });
  }

  // Legacy backwards-compatibility wrappers
  sendCaseFlaggedAlert(caseId: string, roNumber: string, reason: string, techPhone: string, techEmail: string) {
    const text = `[Booran Warranty Alert] Case for RO #${roNumber} was flagged by Warranty Clerk: "${reason}". Please open the Tech App to update evidence.`;
    this.logger.log(`[Twilio SMS] Dispatching to ${techPhone}: ${text}`);
    this.logger.log(`[Nodemailer Email] Dispatching to ${techEmail}: ${text}`);
    this.sendCaseRejectedOrFlaggedAlert(
      {
        caseId,
        roNumber,
        evidenceRuleKey: 'general_evidence',
        reasonCode: 'FLAGGED_FOR_REVIEW',
        instruction: reason,
      },
      techEmail,
    ).catch((err) => this.logger.error(`Error in sendCaseFlaggedAlert: ${err.message}`));

    return {
      smsStatus: 'SENT_TWILIO',
      emailStatus: 'SENT_NODEMAILER',
      deliveredAt: new Date().toISOString(),
      recipientPhone: techPhone,
      recipientEmail: techEmail,
    };
  }

  sendCaseSubmittedAlert(caseId: string, roNumber: string, claimNumber: string, clerkEmail: string) {
    const text = `[Booran Warranty] RO #${roNumber} has been marked SUBMITTED under OEM Claim #${claimNumber}. Case file locked.`;
    this.logger.log(`[Nodemailer Email] Dispatching to ${clerkEmail}: ${text}`);
    this.sendCaseAcceptedAlert(
      {
        caseId,
        roNumber,
        claimNumber,
      },
      clerkEmail,
    ).catch((err) => this.logger.error(`Error in sendCaseSubmittedAlert: ${err.message}`));

    return {
      emailStatus: 'SENT_NODEMAILER',
      deliveredAt: new Date().toISOString(),
      recipientEmail: clerkEmail,
    };
  }
}

function escapeHtml(str: string | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

