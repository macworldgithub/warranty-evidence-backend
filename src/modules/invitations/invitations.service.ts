import { Injectable, BadRequestException, ConflictException, NotFoundException, HttpException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Invitation, InvitationDocument } from './invitation.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Site, SiteDocument } from '../../schemas/site.schema';
import { InvitationMailService } from './invitation-mail.service';

export const tokenDigest = (token: string) => createHash('sha256').update(token).digest('hex');
const invalid = () => new BadRequestException('This invitation is invalid, expired, cancelled, or already used. Ask your administrator for a new invitation.');
@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  constructor(
    @InjectModel(Invitation.name) private readonly invitations: Model<InvitationDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
    @InjectModel(Site.name) private readonly sites: Model<SiteDocument>,
    private readonly mail: InvitationMailService,
  ) {}
  private view(invitation: any) {
    const { tokenHash, _id, __v, ...result } = invitation;
    return { ...result, role: 'TECHNICIAN', status: invitation.status === 'PENDING' && new Date(invitation.expiresAt).getTime() <= Date.now() ? 'EXPIRED' : invitation.status };
  }
  private failure(error: any, stage: string): never {
    if (error instanceof HttpException) throw error;
    // Report names/codes, never raw database errors, credentials, passwords or tokens.
    const name = /^[A-Za-z][A-Za-z\d]{0,60}$/.test(error?.name || '') ? error.name : 'DatabaseError';
    const code = typeof error?.code === 'number' ? ` code ${error.code}` : '';
    const allowedFields = new Set(['id', 'name', 'email', 'siteId', 'invitedBy', 'tokenHash', 'expiresAt', 'status']);
    const fields = Object.keys(error?.errors || {}).filter(field => allowedFields.has(field));
    const reference = `${stage}: ${name}${code}${fields.length ? `; fields ${fields.join(', ')}` : ''}`;
    this.logger.error(`Invitation request failed (${reference})`);
    throw new ServiceUnavailableException(`Invitation request failed (${reference}). Refresh invitation history before retrying. Share this reference with your administrator.`);
  }
  async list() {
    return (await this.invitations.find().sort({ createdAt: -1 }).limit(500).lean()).map(item => this.view(item));
  }
  private async activeSite(siteId: string) {
    const site = await this.sites.findOne({ id: siteId, isActive: true }).lean();
    if (!site) throw new BadRequestException('Select an active dealership for the technician.');
    return site;
  }
  private async noAccount(email: string) {
    if (await this.users.exists({ email })) throw new ConflictException('An account with this email already exists. Use the existing account or password reset.');
  }
  private secret() {
    const token = randomBytes(32).toString('hex');
    return { token, tokenHash: tokenDigest(token), expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) };
  }
  private async deliver(invitation: any, secret: ReturnType<InvitationsService['secret']>, siteName: string) {
    try {
      await this.mail.send(invitation.email, invitation.name, siteName, this.mail.acceptanceUrl(secret.token));
    } catch (error) {
      await this.invitations.updateOne({ id: invitation.id, tokenHash: secret.tokenHash, status: 'SENDING' }, { $set: { status: 'DELIVERY_FAILED', deliveryError: 'Email delivery failed. Check SMTP configuration and resend.' } });
      throw error;
    }
    const sent = await this.invitations.findOneAndUpdate({ id: invitation.id, tokenHash: secret.tokenHash, status: 'SENDING' }, { $set: { status: 'PENDING', sentAt: new Date() }, $unset: { deliveryError: 1 } }, { new: true }).lean();
    if (!sent) throw new ConflictException('Invitation changed while the email was being sent. Refresh the invitation list.');
    return this.view(sent);
  }
  async create(input: { name: string; email: string; siteId: string }, invitedBy: string) {
    try { return await this.createInvitation(input, invitedBy); }
    catch (error) { return this.failure(error, 'create-invitation'); }
  }
  private async createInvitation(input: { name: string; email: string; siteId: string }, invitedBy: string) {
    const email = input.email.trim().toLowerCase();
    await this.noAccount(email);
    const site = await this.activeSite(input.siteId);
    const secret = this.secret();
    this.mail.acceptanceUrl(secret.token); // Validate configuration before inserting.
    let invitation;
    try {
      invitation = await this.invitations.create({ id: randomUUID(), name: input.name.trim(), email, siteId: site.id, invitedBy, tokenHash: secret.tokenHash, expiresAt: secret.expiresAt, status: 'SENDING' });
    } catch (error) {
      if (error.code === 11000) throw new ConflictException('An invitation for this email already exists. Resend or cancel it from the list.');
      throw error;
    }
    return this.deliver(invitation, secret, site.name);
  }
  async resend(id: string, invitedBy: string) {
    const invitation = await this.invitations.findOne({ id }).lean();
    if (!invitation) throw new NotFoundException('Invitation not found.');
    await this.noAccount(invitation.email);
    const site = await this.activeSite(invitation.siteId);
    const secret = this.secret();
    this.mail.acceptanceUrl(secret.token);
    const updated = await this.invitations.findOneAndUpdate({ id, $or: [
      { status: { $in: ['PENDING', 'DELIVERY_FAILED'] } },
      { status: 'SENDING', updatedAt: { $lte: new Date(Date.now() - 5 * 60 * 1000) } },
    ] }, { $set: { tokenHash: secret.tokenHash, expiresAt: secret.expiresAt, status: 'SENDING', invitedBy }, $unset: { sentAt: 1, deliveryError: 1 } }, { new: true }).lean();
    if (!updated) throw new ConflictException('This invitation cannot be resent, or another email is currently being sent.');
    return this.deliver(updated, secret, site.name);
  }
  async cancel(id: string) {
    const invitation = await this.invitations.findOneAndUpdate({ id, status: { $in: ['SENDING', 'PENDING', 'DELIVERY_FAILED'] } }, { $set: { status: 'CANCELLED' } }, { new: true }).lean();
    if (!invitation) throw new ConflictException('This invitation cannot be cancelled.');
    return this.view(invitation);
  }
  private lookup(token: string) {
    if (!/^[a-f\d]{64}$/.test(token)) throw invalid();
    return { tokenHash: tokenDigest(token), status: 'PENDING', expiresAt: { $gt: new Date() } };
  }
  async inspect(token: string) {
    const invitation = await this.invitations.findOne(this.lookup(token)).lean();
    if (!invitation) throw invalid();
    const site = await this.activeSite(invitation.siteId);
    await this.noAccount(invitation.email);
    return { name: invitation.name, email: invitation.email, siteName: site.name, role: 'TECHNICIAN', expiresAt: invitation.expiresAt };
  }
  async accept(token: string, password: string) {
    this.lookup(token);
    const session = await this.invitations.db.startSession();
    try {
      await session.withTransaction(async () => {
        // Claim and account creation commit together. Failed creation leaves the invite usable.
        const invitation = await this.invitations.findOneAndUpdate(this.lookup(token), { $set: { status: 'ACCEPTED', acceptedAt: new Date() } }, { new: true, session }).lean();
        if (!invitation) throw invalid();
        if (!await this.sites.exists({ id: invitation.siteId, isActive: true }).session(session)) throw new BadRequestException('The assigned dealership is no longer active. Contact your administrator.');
        if (await this.users.exists({ email: invitation.email }).session(session)) throw new ConflictException('An account with this email already exists. Sign in or reset its password.');
        const id = `usr_${randomUUID()}`;
        // Use the existing user schema and credential representation; login is unchanged.
        await this.users.create([{ id, name: invitation.name, email: invitation.email, passwordHash: password, role: 'TECHNICIAN', defaultSiteId: invitation.siteId, authorizedSiteIds: [invitation.siteId], isActive: true }], { session });
        await this.invitations.updateOne({ id: invitation.id }, { $set: { acceptedUserId: id } }, { session });
      });
    } catch (error) {
      if (error.code === 11000) throw new ConflictException('An account with this email already exists. Sign in or reset its password.');
      throw error;
    } finally { await session.endSession(); }
    return { success: true, message: 'Your technician account is ready. Sign into the technician app with your email and password.' };
  }
}
