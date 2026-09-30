import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService, CreateUserDto } from './auth.service';
import { UserRole } from '../../common/enums';

jest.mock('@nestjs/mongoose', () => ({
  InjectModel: () => () => undefined,
  Prop: () => () => undefined,
  Schema: () => () => undefined,
  SchemaFactory: { createForClass: () => ({ index: jest.fn() }) },
}));

describe('AuthService session and clerk access rules', () => {
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

  function createUserManagementService(): AuthService {
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
      countDocuments: jest.fn().mockResolvedValue(1),
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
});
