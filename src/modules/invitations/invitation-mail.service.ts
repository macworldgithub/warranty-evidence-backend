import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class InvitationMailService {
  constructor(private readonly config: ConfigService) {}
  acceptanceUrl(token: string): string {
    const configured = this.config.get<string>('INVITATION_PORTAL_URL');
    if (!configured) throw new ServiceUnavailableException('Invitation setup is incomplete: INVITATION_PORTAL_URL is required.');
    let url: URL;
    try { url = new URL(configured); } catch { throw new ServiceUnavailableException('INVITATION_PORTAL_URL must be a valid portal URL.'); }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
      throw new ServiceUnavailableException('The invitation portal URL must use HTTPS.');
    }
    // A fragment keeps the invitation secret out of web-server logs and referrers.
    return `${url.origin}/accept-invite#token=${token}`;
  }
  async send(email: string, name: string, site: string, url: string): Promise<void> {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!user || !pass) throw new ServiceUnavailableException('Invitation email is unavailable: SMTP credentials are not configured.');
    const port = Number(this.config.get('SMTP_PORT')) || 465;
    const transport = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST') || 'smtp.gmail.com', port,
      secure: this.config.get<string>('SMTP_SECURE') === 'true' || port === 465,
      auth: { user, pass }, connectionTimeout: 15_000, socketTimeout: 30_000,
    });
    try {
      const result = await transport.sendMail({
        from: this.config.get<string>('SMTP_FROM') || user, to: email,
        subject: 'Your Booran Motors technician invitation',
        text: `Hello ${name},\n\nYou have been invited to the Booran Motors technician app for ${site}.\n\nSet your password here:\n${url}\n\nThis link expires in 72 hours and can be used once. After setup, sign into the technician app with this email and your password.\n\nIf you were not expecting this invitation, ignore this email.`,
      });
      if (!result.accepted?.length || result.rejected?.length) throw new Error('Recipient was rejected');
    } catch {
      throw new ServiceUnavailableException('The invitation email could not be sent. Check SMTP configuration and resend the invitation.');
    } finally { transport.close(); }
  }
}
