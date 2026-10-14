import { ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { InvitationMailService } from './invitation-mail.service';
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
function mail(settings: Record<string, string> = {}) {
  return new InvitationMailService({ get: (name: string) => settings[name] } as any);
}
describe('invitation email configuration and failures', () => {
  it('requires a portal URL and builds an HTTPS link with a fragment secret', () => {
    expect(() => mail().acceptanceUrl('secret')).toThrow(ServiceUnavailableException);
    expect(() => mail({ INVITATION_PORTAL_URL: 'http://public.example.com' }).acceptanceUrl('secret')).toThrow(ServiceUnavailableException);
    expect(mail({ INVITATION_PORTAL_URL: 'https://booran-warranty-new.vercel.app/login' }).acceptanceUrl('secret')).toBe('https://booran-warranty-new.vercel.app/accept-invite#token=secret');
  });
  it('never pretends to send when SMTP credentials are absent', async () => {
    await expect(mail().send('tech@example.com', 'Tech', 'Dealership', 'https://portal.example')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
  it('reports rejected recipients as failures and closes the SMTP transport', async () => {
    const transport = { sendMail: jest.fn().mockResolvedValue({ accepted: [], rejected: ['tech@example.com'] }), close: jest.fn() };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(transport);
    const sender = mail({ SMTP_USER: 'sender@example.com', SMTP_PASS: 'test-only' });
    await expect(sender.send('tech@example.com', 'Tech', 'Dealership', 'https://portal.example')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(transport.close).toHaveBeenCalled();
  });
});
