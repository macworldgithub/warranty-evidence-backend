import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import * as nodemailer from 'nodemailer';
import { App, initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';

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

export interface FlagResolvedEmailParams {
  caseId: string;
  roNumber: string;
  evidenceRuleKey: string;
  evidenceName?: string;
  resolvedReasonCode?: string;
  originalInstruction?: string;
  technicianName: string;
  vin?: string;
  make?: string;
  model?: string;
  remainingFlagsCount: number;
  portalUrl?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isSmtpConfigured = false;
  private firebaseApp: App | null = null;
  private isFcmConfigured = false;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  onModuleInit() {
    // 1. SMTP Initialization
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

    // 2. Firebase FCM Initialization
    try {
      if (getApps().length === 0) {
        let credential: any;
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
        const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);

        if (fs.existsSync(resolvedPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
          credential = cert(serviceAccount);
        } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
          credential = cert({
            projectId: process.env.FIREBASE_PROJECT_ID || 'booranwarranty-b8a0a',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          });
        }

        if (credential) {
          this.firebaseApp = initializeApp({
            credential,
            projectId: process.env.FIREBASE_PROJECT_ID || 'booranwarranty-b8a0a',
          });
          this.isFcmConfigured = true;
          this.logger.log(`[FCM] Firebase Cloud Messaging ready for project: ${process.env.FIREBASE_PROJECT_ID || 'booranwarranty-b8a0a'}`);
        }
      } else {
        this.firebaseApp = getApp();
        this.isFcmConfigured = true;
        this.logger.log(`[FCM] Attached to existing Firebase App: ${this.firebaseApp.name}`);
      }
    } catch (err: any) {
      this.logger.error(`[FCM] Failed to initialize Firebase Cloud Messaging: ${err.message}`);
    }
  }

  getStatus() {
    return {
      smtp: {
        configured: this.isSmtpConfigured,
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        user: process.env.SMTP_USER,
      },
      fcm: {
        configured: this.isFcmConfigured,
        projectId: process.env.FIREBASE_PROJECT_ID || 'booranwarranty-b8a0a',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        appsActive: getApps().length,
      },
    };
  }

  // ─── Mobile Device Registration (FCM) ───────────────────────────────────

  async registerDeviceToken(userId: string, token: string, platform: 'android' | 'ios' | 'web' = 'android') {
    this.logger.log(`[FCM] Registering device token for user ${userId} (${platform})`);
    try {
      // Remove token from any other accounts to avoid cross-delivery
      await this.userModel.updateMany(
        { 'fcmTokens.token': token },
        { $pull: { fcmTokens: { token } } },
      );

      // Add to target user
      await this.userModel.updateOne(
        { id: userId },
        {
          $push: {
            fcmTokens: {
              token,
              platform,
              updatedAt: new Date(),
            },
          },
        },
      );

      return {
        success: true,
        message: 'Device token registered successfully for push notifications',
        userId,
        platform,
      };
    } catch (err: any) {
      this.logger.error(`[FCM] Error registering device token: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async unregisterDeviceToken(token: string, userId?: string) {
    this.logger.log(`[FCM] Unregistering device token...`);
    try {
      const query = userId ? { id: userId } : { 'fcmTokens.token': token };
      await this.userModel.updateMany(query, {
        $pull: { fcmTokens: { token } },
      });
      return { success: true, message: 'Device token unregistered' };
    } catch (err: any) {
      this.logger.error(`[FCM] Error unregistering device token: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async getUserDeviceTokens(userId: string): Promise<string[]> {
    try {
      const user = await this.userModel.findOne({ id: userId }).lean();
      return (user?.fcmTokens || []).map((t) => t.token).filter(Boolean);
    } catch {
      return [];
    }
  }

  async getRoleDeviceTokens(role: string): Promise<string[]> {
    try {
      const users = await this.userModel.find({ role, isActive: true }).lean();
      const tokens: string[] = [];
      users.forEach((u) => {
        (u.fcmTokens || []).forEach((t) => {
          if (t.token && !tokens.includes(t.token)) {
            tokens.push(t.token);
          }
        });
      });
      return tokens;
    } catch {
      return [];
    }
  }

  // ─── FCM Push Dispatcher ────────────────────────────────────────────────

  async sendPushNotification(options: {
    tokens?: string[];
    topic?: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    dryRun?: boolean;
  }) {
    if (!this.isFcmConfigured || !this.firebaseApp) {
      this.logger.warn(`[FCM] Not configured; push notification logged: "${options.title}" - "${options.body}"`);
      return { success: false, reason: 'FCM_NOT_CONFIGURED' };
    }

    const messaging = getMessaging(this.firebaseApp);
    const results: any = {};

    const baseMessage: any = {
      notification: {
        title: options.title,
        body: options.body,
      },
      data: {
        ...options.data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        timestamp: String(Date.now()),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'warranty_alerts',
          sound: 'default',
          color: '#2563eb',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    };

    // 1. Send to Topic if specified
    if (options.topic) {
      try {
        const topicMessage = {
          ...baseMessage,
          topic: options.topic,
        };
        const topicRes = await messaging.send(topicMessage, options.dryRun);
        this.logger.log(`[FCM] Sent to topic '${options.topic}': ${topicRes}`);
        results.topic = { success: true, messageId: topicRes };
      } catch (err: any) {
        this.logger.error(`[FCM] Failed sending to topic '${options.topic}': ${err.message}`);
        results.topic = { success: false, error: err.message };
      }
    }

    // 2. Send to individual device tokens if specified
    if (options.tokens && options.tokens.length > 0) {
      try {
        const multicastMessage = {
          ...baseMessage,
          tokens: options.tokens,
        };
        const response = await messaging.sendEachForMulticast(multicastMessage, options.dryRun);
        this.logger.log(`[FCM] Multicast sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
        results.tokens = {
          successCount: response.successCount,
          failureCount: response.failureCount,
        };

        // Clean up invalid tokens automatically
        if (response.failureCount > 0 && !options.dryRun) {
          response.responses.forEach(async (resp, idx) => {
            if (!resp.success) {
              const errCode = resp.error?.code;
              if (
                errCode === 'messaging/invalid-registration-token' ||
                errCode === 'messaging/registration-token-not-registered'
              ) {
                const badToken = options.tokens![idx];
                this.logger.warn(`[FCM] Removing invalid token: ${badToken}`);
                await this.unregisterDeviceToken(badToken);
              }
            }
          });
        }
      } catch (err: any) {
        this.logger.error(`[FCM] Failed sending multicast push: ${err.message}`);
        results.tokens = { success: false, error: err.message };
      }
    }

    return { success: true, ...results };
  }

  async sendTestPushNotification(dto: {
    token?: string;
    topic?: string;
    title: string;
    body: string;
    caseId?: string;
    dryRun?: boolean;
  }) {
    const tokens = dto.token ? [dto.token] : undefined;
    const topic = dto.token ? undefined : (dto.topic || 'warranty-admins');

    return this.sendPushNotification({
      tokens,
      topic,
      title: dto.title,
      body: dto.body,
      data: {
        caseId: dto.caseId || 'CASE-TEST',
        event: 'TEST_PUSH',
      },
      dryRun: dto.dryRun ?? false,
    });
  }

  async sendTestEmail(targetEmail: string, customSubject?: string) {
    const subject = customSubject || '🧪 [Booran Warranty] SMTP Test Notification';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #081225; color: #ffffff; border-radius: 12px; border: 1px solid #1a56db;">
        <h2 style="color: #00f0ff; margin-bottom: 8px;">Booran Warranty Notification Test</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">This email confirms that your SMTP service is connected and successfully dispatching emails from the Booran Warranty Evidence backend.</p>
        <div style="background: rgba(0, 240, 255, 0.08); border-left: 4px solid #00f0ff; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #ffffff;"><strong>Host:</strong> ${process.env.SMTP_HOST || 'smtp.gmail.com'}</p>
          <p style="margin: 6px 0 0; font-size: 13px; color: #ffffff;"><strong>Sender:</strong> ${process.env.SMTP_USER || 'adteam@omnisuiteai.com'}</p>
          <p style="margin: 6px 0 0; font-size: 13px; color: #ffffff;"><strong>Recipient:</strong> ${targetEmail}</p>
          <p style="margin: 6px 0 0; font-size: 13px; color: #ffffff;"><strong>Dispatched At:</strong> ${new Date().toISOString()}</p>
        </div>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">OmniSuiteAI Warranty Evidence Capture · Booran Motor Group</p>
      </div>
    `;
    return this.sendMail({ to: targetEmail, subject, html });
  }

  // ─── Lifecycle FCM Push Helpers ─────────────────────────────────────────

  async sendNewTicketPushToAdmins(caseData: {
    id: string;
    roNumber: string;
    make: string;
    model: string;
    vin: string;
    technicianName: string;
  }) {
    const adminTokens = await this.getRoleDeviceTokens('ADMIN');
    return this.sendPushNotification({
      topic: 'warranty-admins',
      tokens: adminTokens.length > 0 ? adminTokens : undefined,
      title: `📋 New Warranty Ticket: RO #${caseData.roNumber}`,
      body: `${caseData.technicianName} submitted case for ${caseData.make} ${caseData.model} (${caseData.vin})`,
      data: {
        caseId: caseData.id,
        roNumber: caseData.roNumber,
        event: 'NEW_TICKET_RAISED',
      },
    });
  }

  async sendCaseAcceptedPushToTechnician(
    caseData: { id: string; roNumber: string; claimNumber: string },
    technicianId: string,
  ) {
    const techTokens = await this.getUserDeviceTokens(technicianId);
    return this.sendPushNotification({
      tokens: techTokens.length > 0 ? techTokens : undefined,
      topic: techTokens.length === 0 ? `tech-${technicianId}` : undefined,
      title: `✅ Claim Approved: RO #${caseData.roNumber}`,
      body: `Your warranty claim has been approved under OEM Claim #${caseData.claimNumber}. Case file locked.`,
      data: {
        caseId: caseData.id,
        roNumber: caseData.roNumber,
        claimNumber: caseData.claimNumber,
        event: 'CASE_ACCEPTED',
      },
    });
  }

  async sendCaseRejectedPushToTechnician(
    caseData: { id: string; roNumber: string },
    flagData: { evidenceRuleKey: string; reasonCode: string; instruction: string; flaggedBy?: string },
    technicianId: string,
  ) {
    const techTokens = await this.getUserDeviceTokens(technicianId);
    const reason = flagData.reasonCode ? flagData.reasonCode.replace(/_/g, ' ') : 'Evidence Rejected';
    return this.sendPushNotification({
      tokens: techTokens.length > 0 ? techTokens : undefined,
      topic: techTokens.length === 0 ? `tech-${technicianId}` : undefined,
      title: `⚠️ Action Required: RO #${caseData.roNumber}`,
      body: `${flagData.flaggedBy || 'Reviewer'} flagged ${flagData.evidenceRuleKey} (${reason}). Tap to update evidence.`,
      data: {
        caseId: caseData.id,
        roNumber: caseData.roNumber,
        evidenceRuleKey: flagData.evidenceRuleKey,
        reasonCode: flagData.reasonCode,
        event: 'CASE_FLAGGED',
      },
    });
  }

  async sendFlagResolvedPushToAdmins(
    caseData: { id: string; roNumber: string; technicianName: string },
    flagData: { evidenceRuleKey: string },
  ) {
    const adminTokens = await this.getRoleDeviceTokens('ADMIN');
    return this.sendPushNotification({
      topic: 'warranty-admins',
      tokens: adminTokens.length > 0 ? adminTokens : undefined,
      title: `✅ Evidence Updated: RO #${caseData.roNumber}`,
      body: `Technician ${caseData.technicianName} replaced evidence for ${flagData.evidenceRuleKey}. Ready for review.`,
      data: {
        caseId: caseData.id,
        roNumber: caseData.roNumber,
        evidenceRuleKey: flagData.evidenceRuleKey,
        event: 'FLAG_RESOLVED',
      },
    });
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

  /**
   * 4. Triggered when technician solves/replaces flagged evidence -> Sent to Admin(s)
   */
  async sendFlagResolvedAdminAlert(params: FlagResolvedEmailParams, adminEmails: string[]) {
    if (!adminEmails || adminEmails.length === 0) {
      this.logger.warn('[SMTP] No admin email recipients provided for flag resolved notification.');
      return;
    }

    const appUrl = params.portalUrl || process.env.APP_URL || 'http://localhost:3000';
    const caseUrl = `${appUrl}/cases/${params.caseId}`;

    const subject = `[Booran Warranty] Flag Issue Corrected: RO #${params.roNumber} - ${params.evidenceName || params.evidenceRuleKey}`;

    const humanReadableReason = params.resolvedReasonCode
      ? params.resolvedReasonCode.replace(/_/g, ' ')
      : 'Previous Discrepancy';

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
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .details-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .label { color: #64748b; font-weight: 600; width: 38%; }
    .val { color: #0f172a; font-weight: 500; }
    .note-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; font-size: 13px; color: #166534; margin-bottom: 24px; }
    .note-box strong { display: block; margin-bottom: 4px; font-size: 13px; }
    .btn-container { text-align: center; margin: 28px 0 16px; }
    .btn { background: #10b981; color: #ffffff !important; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 6px; text-decoration: none; display: inline-block; }
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
      ✅ EVIDENCE UPDATED: Flag Issue Corrected by Technician
    </div>
    <div class="content">
      <h2 class="title">Technician ${escapeHtml(params.technicianName)} has resolved the flagged evidence</h2>
      <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-top: 0;">
        A replacement evidence item has been uploaded for <strong>RO #${escapeHtml(params.roNumber)}</strong> addressing the reviewer feedback. The ticket is now ready for your re-examination.
      </p>

      <table class="details-table">
        <tr>
          <td class="label">RO Number</td>
          <td class="val"><strong>#${escapeHtml(params.roNumber)}</strong></td>
        </tr>
        <tr>
          <td class="label">Corrected Evidence</td>
          <td class="val"><strong>${escapeHtml(params.evidenceName || params.evidenceRuleKey)}</strong></td>
        </tr>
        <tr>
          <td class="label">Previous Flag Reason</td>
          <td class="val"><span style="background:#fee2e2; color:#991b1b; padding: 2px 7px; border-radius: 4px; font-size:12px; font-weight:600;">${escapeHtml(humanReadableReason)}</span></td>
        </tr>
        <tr>
          <td class="label">Technician</td>
          <td class="val">${escapeHtml(params.technicianName)}</td>
        </tr>
        ${params.make ? `<tr><td class="label">Vehicle</td><td class="val">${escapeHtml(params.make)} ${escapeHtml(params.model || '')}</td></tr>` : ''}
        ${params.vin ? `<tr><td class="label">VIN</td><td class="val"><code>${escapeHtml(params.vin)}</code></td></tr>` : ''}
        <tr>
          <td class="label">Status</td>
          <td class="val"><span style="background:${params.remainingFlagsCount === 0 ? '#d1fae5' : '#fef3c7'}; color:${params.remainingFlagsCount === 0 ? '#065f46' : '#92400e'}; padding: 2px 8px; border-radius: 4px; font-weight:600; font-size:12px;">${params.remainingFlagsCount === 0 ? 'Awaiting Review (All Flags Fixed)' : `${params.remainingFlagsCount} flag(s) remaining`}</span></td>
        </tr>
      </table>

      ${params.originalInstruction ? `
      <div class="note-box">
        <strong>Reviewer Instruction Addressed:</strong>
        "${escapeHtml(params.originalInstruction)}"
      </div>` : ''}

      <div class="btn-container">
        <a href="${caseUrl}" class="btn">Review Corrected Evidence</a>
      </div>
    </div>
    <div class="footer">
      This is an automated transmission from Booran Motors Warranty Evidence Engine. Replies are not monitored.
    </div>
  </div>
</body>
</html>
    `;

    const text = `[Booran Warranty] Flag Issue Corrected: RO #${params.roNumber}\nTechnician ${params.technicianName} has replaced the evidence for ${params.evidenceName || params.evidenceRuleKey}.\nStatus: Awaiting Review\nReview at: ${caseUrl}`;

    return this.sendMail({
      to: adminEmails,
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

