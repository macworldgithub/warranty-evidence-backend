import { BadRequestException, ConflictException, UnauthorizedException, ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.module';
import { AuthService } from '../auth/auth.service';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined, Prop: () => () => undefined, Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ index: jest.fn() }) }, MongooseModule: { forFeature: () => class {} },
}));
jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));
jest.mock('../auth/auth.module', () => ({ AuthModule: class {} }));

const copy = (value: any) => value == null ? value : structuredClone(value);
function matches(item: any, filter: any): boolean {
  return Object.entries(filter).every(([key, value]: [string, any]) => {
    if (key === '$or') return value.some((entry: any) => matches(item, entry));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if (value.$in) return value.$in.includes(item[key]);
      if (value.$gt) return new Date(item[key]) > value.$gt;
      if (value.$lte) return new Date(item[key]) <= value.$lte;
    }
    return item[key] === value;
  });
}
const query = (value: any): any => {
  const result: any = Promise.resolve(copy(value));
  result.lean = () => result; result.session = () => result;
  result.sort = () => result; result.limit = () => result;
  return result;
};
function setup() {
  const state = { invitations: [] as any[], users: [] as any[] };
  const mail = { acceptanceUrl: (token: string) => `https://portal.example/accept-invite#token=${token}`, send: jest.fn().mockResolvedValue(undefined) };
  const sites = { findOne: jest.fn((filter: any) => query(filter.id === 'site-one' ? { id: 'site-one', name: 'Test Dealership', isActive: true } : null)), exists: jest.fn((filter: any) => query(filter.id === 'site-one' ? { id: 'site-one' } : null)) };
  const users = {
    exists: jest.fn((filter: any) => query(state.users.find(item => matches(item, filter)) || null)),
    create: jest.fn(async (items: any[]) => { state.users.push(...copy(items)); return items; }),
  };
  let transactionQueue = Promise.resolve();
  const invitations: any = {
    db: { startSession: async () => ({
      withTransaction: async (operation: () => Promise<void>) => {
        const previous = transactionQueue;
        let release!: () => void;
        transactionQueue = new Promise<void>(resolve => { release = resolve; });
        await previous;
        const snapshot = copy(state);
        try { await operation(); }
        catch (error) { state.invitations = snapshot.invitations; state.users = snapshot.users; throw error; }
        finally { release(); }
      }, endSession: jest.fn(),
    }) },
    create: jest.fn(async (item: any) => {
      if (state.invitations.some(entry => entry.email === item.email && ['SENDING', 'PENDING', 'DELIVERY_FAILED'].includes(entry.status))) throw { code: 11000 };
      const created = { ...item, createdAt: new Date(), updatedAt: new Date() };
      state.invitations.push(created); return created;
    }),
    find: () => query(state.invitations),
    findOne: (filter: any) => query(state.invitations.find(item => matches(item, filter)) || null),
    findOneAndUpdate: (filter: any, update: any) => {
      const item = state.invitations.find(item => matches(item, filter));
      if (item) { Object.assign(item, update.$set || {}, { updatedAt: new Date() }); for (const key of Object.keys(update.$unset || {})) delete item[key]; }
      return query(item || null);
    },
    updateOne: async (filter: any, update: any) => {
      const item = state.invitations.find(item => matches(item, filter));
      if (item) Object.assign(item, update.$set || {}, { updatedAt: new Date() });
    },
  };
  const service = new InvitationsService(invitations, users as any, sites as any, mail as any);
  const create = () => service.create({ name: ' Sample Tech ', email: ' TECH@EXAMPLE.COM ', siteId: 'site-one' }, 'admin-one');
  const token = () => new URLSearchParams(new URL(mail.send.mock.calls[mail.send.mock.calls.length - 1][3]).hash.slice(1)).get('token')!;
  return { service, state, mail, users, sites, invitations, create, token };
}

describe('technician invitation lifecycle', () => {
  it('stores a token hash, returns no secret, and preserves fixed identity on acceptance', async () => {
    const ctx = setup(); const invitation = await ctx.create();
    expect(invitation.tokenHash).toBeUndefined();
    expect(ctx.state.invitations[0].tokenHash).not.toEqual(ctx.token());
    expect(ctx.state.users).toHaveLength(0);
    expect(await ctx.service.inspect(ctx.token())).toMatchObject({ name: 'Sample Tech', email: 'tech@example.com', siteName: 'Test Dealership', role: 'TECHNICIAN' });
    await ctx.service.accept(ctx.token(), 'Password123!');
    expect(ctx.state.users[0]).toMatchObject({ email: 'tech@example.com', passwordHash: 'Password123!', role: 'TECHNICIAN', defaultSiteId: 'site-one', authorizedSiteIds: ['site-one'] });
    await expect(ctx.service.accept(ctx.token(), 'OtherPassword')).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.state.users).toHaveLength(1);
  });
  it('invalidates the old link when resending and refuses cancelled links', async () => {
    const ctx = setup(); const invitation = await ctx.create(); const old = ctx.token();
    await ctx.service.resend(invitation.id, 'admin-two');
    await expect(ctx.service.inspect(old)).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.token()).not.toBe(old);
    await ctx.service.cancel(invitation.id);
    await expect(ctx.service.accept(ctx.token(), 'Password123!')).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.state.users).toHaveLength(0);
  });
  it('rejects expired and malformed links', async () => {
    const ctx = setup(); await ctx.create(); ctx.state.invitations[0].expiresAt = new Date(Date.now() - 1);
    await expect(ctx.service.inspect(ctx.token())).rejects.toBeInstanceOf(BadRequestException);
    await expect(ctx.service.accept(ctx.token(), 'Password123!')).rejects.toBeInstanceOf(BadRequestException);
    await expect(ctx.service.inspect('not-a-token')).rejects.toBeInstanceOf(BadRequestException);
    expect((await ctx.service.list())[0].status).toBe('EXPIRED');
  });
  it('keeps failed email delivery visible and allows resending', async () => {
    const ctx = setup(); ctx.mail.send.mockRejectedValueOnce(new ServiceUnavailableException('SMTP unavailable'));
    await expect(ctx.create()).rejects.toThrow('SMTP unavailable');
    expect(ctx.state.invitations[0].status).toBe('DELIVERY_FAILED');
    await expect(ctx.service.inspect(ctx.token())).rejects.toBeInstanceOf(BadRequestException);
    await ctx.service.resend(ctx.state.invitations[0].id, 'admin-one');
    expect(ctx.state.invitations[0].status).toBe('PENDING');
  });
  it('rejects duplicate accounts, duplicate pending invitations, and inactive sites', async () => {
    const ctx = setup(); await ctx.create();
    await expect(ctx.create()).rejects.toBeInstanceOf(ConflictException);
    ctx.state.users.push({ email: 'tech@example.com' });
    await expect(ctx.service.accept(ctx.token(), 'Password123!')).rejects.toBeInstanceOf(ConflictException);
    expect(ctx.state.invitations[0].status).toBe('PENDING');
    await expect(ctx.service.create({ name: 'Tech', email: 'new@example.com', siteId: 'inactive-site' }, 'admin-one')).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rolls back invitation consumption if account creation fails', async () => {
    const ctx = setup(); await ctx.create(); ctx.users.create.mockRejectedValueOnce(new Error('Database error'));
    await expect(ctx.service.accept(ctx.token(), 'Password123!')).rejects.toThrow('Database error');
    expect(ctx.state.invitations[0].status).toBe('PENDING');
    await ctx.service.accept(ctx.token(), 'Password123!');
    expect(ctx.state.users).toHaveLength(1);
  });
  it('accepts only once when requests race', async () => {
    const ctx = setup(); await ctx.create(); const secret = ctx.token();
    const results = await Promise.allSettled([ctx.service.accept(secret, 'Password123!'), ctx.service.accept(secret, 'Password123!')]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(ctx.state.users).toHaveLength(1);
  });
  it('provides a safe error reference for unexpected creation failures', async () => {
    const ctx = setup();
    ctx.invitations.create.mockRejectedValueOnce({ name: 'ValidationError', errors: { invitedBy: { message: 'private connection string or token' } } });
    try { await ctx.create(); throw new Error('Expected rejection'); }
    catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(error.message).toContain('create-invitation: ValidationError; fields invitedBy');
      expect(error.message).not.toContain('private connection string or token');
    }
  });
});

describe('invitation API authorization and validation', () => {
  let app: any;
  const service = { list: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'new-invite' }), resend: jest.fn(), cancel: jest.fn(), inspect: jest.fn().mockResolvedValue({ role: 'TECHNICIAN' }), accept: jest.fn().mockResolvedValue({ success: true }) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [InvitationsController], providers: [
      { provide: InvitationsService, useValue: service },
      { provide: AuthService, useValue: { assertAdmin: async (header?: string) => { if (header !== 'Bearer admin') throw new UnauthorizedException(); return { id: 'admin-one' }; } } },
    ] }).compile();
    app = module.createNestApplication(); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })); await app.init();
  });
  afterAll(async () => { await app.close(); });
  it('restricts management to administrators', async () => {
    for (const identity of ['', 'Bearer clerk', 'Bearer technician']) {
      await request(app.getHttpServer()).get('/invitations').set('Authorization', identity).expect(401);
      for (const url of ['/invitations', '/invitations/id/resend', '/invitations/id/cancel']) await request(app.getHttpServer()).post(url).set('Authorization', identity).send(url === '/invitations' ? { name: 'Tech', email: 'tech@example.com', siteId: 'site-one' } : {}).expect(401);
    }
    await request(app.getHttpServer()).get('/invitations').set('Authorization', 'Bearer admin').expect(200);
  });
  it('validates request bodies and rejects attempts to choose a role', async () => {
    await request(app.getHttpServer()).post('/invitations').set('Authorization', 'Bearer admin').send({ name: 'Tech', email: 'tech@example.com', siteId: 'site-one', role: 'ADMIN' }).expect(400);
    await request(app.getHttpServer()).post('/invitations/accept').send({ token: 'a'.repeat(64), password: 'short' }).expect(400);
    await request(app.getHttpServer()).post('/invitations/inspect').send({ token: 'bad' }).expect(400);
  });
  it('allows token setup without a session and keeps it uncached', async () => {
    await request(app.getHttpServer()).post('/invitations/inspect').send({ token: 'a'.repeat(64) }).expect(201).expect('Cache-Control', 'private, no-store');
    await request(app.getHttpServer()).post('/invitations/accept').send({ token: 'a'.repeat(64), password: 'Password123!' }).expect(201);
    expect(service.accept).toHaveBeenCalledWith('a'.repeat(64), 'Password123!');
  });
});
