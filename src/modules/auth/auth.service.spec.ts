import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService, CreateUserDto, SignupDto } from './auth.service';
import { validate } from 'class-validator';
import { UserRole } from '../../common/enums';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ index: jest.fn() }) },
}));

describe('AuthService session and clerk access rules', () => {
  function registrationService(existing: unknown = null, saveError?: unknown) {
    let saved: any;
    const model = Object.assign(jest.fn().mockImplementation(data => ({
      save: jest.fn(async () => {
        if (saveError) throw saveError;
        saved = data;
        return { toObject: () => data };
      }),
    })), {
      findOne: jest.fn(() => ({ lean: async () => saved || existing })),
    });
    const sites = { countDocuments: jest.fn(async query => query.id.$in.length) };
    const service = new AuthService(model as never, {} as never, sites as never, {} as never);
    jest.spyOn(service, 'verifyWorkshopPin').mockResolvedValue(undefined);
    return { service, model, sites, saved: () => saved };
  }

  const signup = { name: 'Staff Example', username: '001234', password: 'test-password', workshopPin: '0000', role: UserRole.ADMIN, siteId: 'site_a' };

  it('saves every selected rooftop and retains them on later sign-in', async () => {
    const { service, saved, sites } = registrationService();
    const result = await service.signup({ ...signup, authorizedSiteIds: ['site_a', 'site_b', 'site_c'] });
    expect(result.user).toMatchObject({ defaultSiteId: 'site_a', authorizedSiteIds: ['site_a', 'site_b', 'site_c'] });
    expect(saved().authorizedSiteIds).toEqual(['site_a', 'site_b', 'site_c']);
    expect(sites.countDocuments).toHaveBeenCalledWith({ id: { $in: ['site_a', 'site_b', 'site_c'] }, isActive: true });
    await expect(service.login({ email: signup.username, password: signup.password })).resolves.toMatchObject({ user: { authorizedSiteIds: ['site_a', 'site_b', 'site_c'] } });
  });

  it('uses the first selected rooftop when no primary site is supplied', async () => {
    const { service } = registrationService();
    await expect(service.signup({ ...signup, siteId: undefined, authorizedSiteIds: ['site_b', 'site_c'] })).resolves.toMatchObject({ user: { defaultSiteId: 'site_b' } });
  });

  it('rejects missing or inactive rooftops before saving the account', async () => {
    const { service, model, sites } = registrationService();
    sites.countDocuments.mockResolvedValue(1);
    await expect(service.signup({ ...signup, authorizedSiteIds: ['site_a', 'missing_site'] })).rejects.toThrow('Every assigned dealership site must exist and be active.');
    expect(model).not.toHaveBeenCalled();
  });

  it.each([[], ['site_a', 'site_a'], ['site_b'], ['site_a', '']].map(authorizedSiteIds => ({ authorizedSiteIds })))('rejects invalid rooftop selections $authorizedSiteIds', async ({ authorizedSiteIds }) => {
    const { service, model } = registrationService();
    await expect(service.signup({ ...signup, authorizedSiteIds })).rejects.toBeInstanceOf(BadRequestException);
    expect(model).not.toHaveBeenCalled();
  });

  it('keeps multiple rooftops through DTO whitelisting', async () => {
    const dto = Object.assign(new SignupDto(), signup, { authorizedSiteIds: ['site_a', 'site_b'] });
    expect(await validate(dto, { whitelist: true })).toEqual([]);
    expect(dto.authorizedSiteIds).toEqual(['site_a', 'site_b']);
  });

  it.each(['001234', 'Jake.Smith'])('registers %s without email and supports subsequent sign-in', async username => {
    const { service, saved } = registrationService();
    const result = await service.signup({ ...signup, username: ` ${username} ` });
    expect(result.user).toMatchObject({ username: username.toLowerCase(), role: UserRole.TECHNICIAN, defaultSiteId: 'site_a', authorizedSiteIds: ['site_a'] });
    expect(saved().passwordHash).toMatch(/^scrypt:/);
    expect(saved().passwordHash).not.toBe(signup.password);
    await expect(service.login({ email: username.toUpperCase(), password: signup.password })).resolves.toMatchObject({ user: { id: result.user.id } });
    await expect(service.login({ email: username, password: 'incorrect' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects duplicate identifiers after case normalization, including inactive accounts', async () => {
    const { service, model } = registrationService({ username: 'jake.smith', isActive: false });
    await expect(service.signup({ ...signup, username: 'JAKE.SMITH' })).rejects.toThrow('This username or employee number is already in use.');
    expect(model.findOne).toHaveBeenCalledWith({ $or: [{ username: 'jake.smith' }, { email: 'jake.smith@staff.booran.invalid' }] });
    expect(model).not.toHaveBeenCalled();
  });

  it('converts a database duplicate from a simultaneous registration to a useful error', async () => {
    const { service } = registrationService(null, { code: 11000 });
    await expect(service.signup(signup)).rejects.toThrow('This username or employee number is already in use.');
  });

  it.each(['ab', 'staff name', 'staff@example.com', 'x'.repeat(41)])('rejects invalid identifier %s', async username => {
    const { service, model } = registrationService();
    await expect(service.signup({ ...signup, username })).rejects.toBeInstanceOf(BadRequestException);
    expect(model).not.toHaveBeenCalled();
  });

  it('keeps legacy email registration and sign-in working', async () => {
    const { service } = registrationService();
    const result = await service.signup({ ...signup, username: undefined, email: 'existing@example.com' });
    expect(result.user.email).toBe('existing@example.com');
    await expect(service.login({ email: result.user.email, password: signup.password })).resolves.toMatchObject({ user: { id: result.user.id } });
  });

  it('requires the PIN before creating a username account', async () => {
    const { service, model } = registrationService();
    jest.spyOn(service, 'verifyWorkshopPin').mockRejectedValue(new UnauthorizedException());
    await expect(service.signup(signup)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(model).not.toHaveBeenCalled();
  });

  it('accepts username-only signup through DTO validation', async () => {
    expect(await validate(Object.assign(new SignupDto(), signup))).toEqual([]);
  });

  const activeAdmin = {
    id: 'usr_admin_1',
    name: 'Admin User',
    email: 'admin@booran.com.au',
    passwordHash: 'password',
    role: UserRole.ADMIN,
    defaultSiteId: 'site_a',
    authorizedSiteIds: ['site_a', 'site_b'],
    isActive: true,
  };

  function createService(findOneResult: unknown = activeAdmin): AuthService {
    const userModel = {
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(findOneResult) }),
    };
    return new AuthService(userModel as never, {} as never, {} as never, {} as never);
  }

  function createUserManagementService(activeSiteCount = 1): AuthService {
    const UserModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        toObject: () => data,
      }),
    }));
    Object.assign(UserModel, {
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    });
    const siteModel = {
      countDocuments: jest.fn().mockResolvedValue(activeSiteCount),
    };
    return new AuthService(UserModel as never, {} as never, siteModel as never, {} as never);
  }

  it('issues a signed session and resolves its database user', async () => {
    const service = createService();
    const login = await service.login({
      email: activeAdmin.email,
      password: activeAdmin.passwordHash,
      role: UserRole.ADMIN,
    });

    expect(login.accessToken).toMatch(/^session_v1\./);
    await expect(
      service.resolveUserFromAuthorization(`Bearer ${login.accessToken}`),
    ).resolves.toMatchObject({ id: activeAdmin.id, role: UserRole.ADMIN });
  });

  it('rejects a modified session and does not trust a user-id header fallback', async () => {
    const service = createService();
    const login = await service.login({
      email: activeAdmin.email,
      password: activeAdmin.passwordHash,
    });
    const tampered = `${login.accessToken.slice(0, -1)}x`;

    await expect(
      service.resolveUserFromAuthorization(`Bearer ${tampered}`),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.resolveUserFromAuthorization(undefined, activeAdmin.id),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requires at least one site when an admin creates a clerk', async () => {
    const service = createService(null);
    const dto: CreateUserDto = {
      name: 'Warranty Clerk',
      email: 'clerk@booran.com.au',
      password: 'password',
      role: UserRole.CLERK,
      authorizedSiteIds: [],
    };

    await expect(service.createUser(dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows an admin to create a clerk assigned to one or more sites', async () => {
    const service = createUserManagementService();
    const dto: CreateUserDto = {
      name: 'Warranty Clerk',
      email: 'clerk@booran.com.au',
      password: 'password',
      role: UserRole.CLERK,
      siteId: 'site_a',
      authorizedSiteIds: ['site_a'],
    };

    await expect(service.createUser(dto)).resolves.toMatchObject({
      name: 'Warranty Clerk',
      email: 'clerk@booran.com.au',
      role: UserRole.CLERK,
      defaultSiteId: 'site_a',
      authorizedSiteIds: ['site_a'],
    });
  });

  it('saves both admin-assigned technician rooftops with a separate default', async () => {
    const service = createUserManagementService(2);
    await expect(service.createUser({
      name: 'Technician Example', email: 'tech@booran.com.au', password: 'password',
      role: UserRole.TECHNICIAN, siteId: 'site_b', authorizedSiteIds: ['site_a', 'site_b'],
    })).resolves.toMatchObject({ defaultSiteId: 'site_b', authorizedSiteIds: ['site_a', 'site_b'] });
  });

  it('preserves technician assignments on profile edits and removes the old default when explicitly unassigned', async () => {
    const account = { ...activeAdmin, id: 'tech-id', role: UserRole.TECHNICIAN, save: async () => account };
    const users = { findOne: jest.fn().mockResolvedValue(account) };
    const sites = { countDocuments: jest.fn().mockResolvedValue(1) };
    const service = new AuthService(users as never, {} as never, sites as never, {} as never);

    await expect(service.updateUser(account.id, { name: 'Updated Name' })).resolves.toMatchObject({
      defaultSiteId: 'site_a', authorizedSiteIds: ['site_a', 'site_b'],
    });
    expect(sites.countDocuments).not.toHaveBeenCalled();
    await expect(service.updateUser(account.id, { authorizedSiteIds: ['site_b'] })).resolves.toMatchObject({
      defaultSiteId: 'site_b', authorizedSiteIds: ['site_b'],
    });
  });

  it('adds a rooftop to an existing technician without replacing the primary rooftop', async () => {
    const account = { ...activeAdmin, id: 'tech-id', role: UserRole.TECHNICIAN, authorizedSiteIds: ['site_a'], save: jest.fn(async () => account) };
    const users = { findOne: jest.fn().mockResolvedValue(account) };
    const sites = { countDocuments: jest.fn().mockResolvedValue(2) };
    const service = new AuthService(users as never, {} as never, sites as never, {} as never);

    await expect(service.updateUser(account.id, {
      role: UserRole.TECHNICIAN, siteId: 'site_a', authorizedSiteIds: ['site_a', 'site_b'],
    })).resolves.toMatchObject({ defaultSiteId: 'site_a', authorizedSiteIds: ['site_a', 'site_b'] });
    expect(account.save).toHaveBeenCalledTimes(1);
    expect(account.authorizedSiteIds).toEqual(['site_a', 'site_b']);
  });

  it('rejects inactive technician assignments', async () => {
    const service = createUserManagementService(1);
    await expect(service.createUser({
      name: 'Technician Example', email: 'tech@booran.com.au', password: 'password',
      role: UserRole.TECHNICIAN, authorizedSiteIds: ['site_a', 'inactive-site'],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates an invited username account and lets it sign in with mixed case', async () => {
    const invitation = { role: UserRole.CLERK, siteIds: ['site_a', 'site_b'] };
    let saved: any;
    const collection = {
      findOne: jest.fn().mockResolvedValue(invitation),
      updateOne: jest.fn().mockResolvedValueOnce({ matchedCount: 1 }).mockResolvedValueOnce({ matchedCount: 0 }),
    };
    const session = {};
    const model = {
      db: { collection: () => collection, transaction: async (run: (value: object) => Promise<void>) => run(session) },
      create: jest.fn(async ([account]) => { saved = account; }),
      findOne: jest.fn((query) => ({ lean: async () => query.username === saved?.username ? saved : null })),
    };
    const sites = { countDocuments: jest.fn().mockResolvedValue(2) };
    const service = new AuthService(model as never, {} as never, sites as never, {} as never);
    const dto = { name: 'Clerk Example', username: 'Clerk.Example', password: 'test-passphrase', token: 'test.invite' };
    await service.redeemRegistrationQr(dto);
    expect(saved).toMatchObject({ username: 'clerk.example', role: UserRole.CLERK, authorizedSiteIds: invitation.siteIds });
    expect(saved.passwordHash).toMatch(/^scrypt:/);
    expect(model.create).toHaveBeenCalledWith([saved], { session });
    await expect(service.login({ email: 'CLERK.EXAMPLE', password: dto.password })).resolves.toMatchObject({
      user: { username: 'clerk.example', role: UserRole.CLERK },
    });
    await expect(service.login({ email: 'clerk.example', password: 'wrong' })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.redeemRegistrationQr(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(model.create).toHaveBeenCalledTimes(1);
  });

  it('resets a staff password once and invalidates the existing session', async () => {
    const account = { ...activeAdmin, role: UserRole.TECHNICIAN, username: 'tech-example', sessionVersion: 0 };
    const model = {
      findOne: jest.fn(() => ({ lean: async () => account })),
      exists: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      updateOne: jest.fn(async (_filter, update) => {
        account.passwordHash = update.$set.passwordHash;
        account.sessionVersion += update.$inc.sessionVersion;
        return { matchedCount: 1 };
      }),
    };
    const service = new AuthService(model as never, {} as never, {} as never, {} as never);
    const { accessToken } = await service.login({ email: account.username, password: account.passwordHash });
    const dto = { token: `${account.id}.test`, password: 'new-passphrase' };
    await service.redeemPasswordResetQr(dto);
    await expect(service.resolveUserFromAuthorization(`Bearer ${accessToken}`)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.login({ email: account.username, password: dto.password })).resolves.toMatchObject({ user: { id: account.id } });
    await expect(service.redeemPasswordResetQr(dto)).rejects.toBeInstanceOf(BadRequestException);
  });
});
