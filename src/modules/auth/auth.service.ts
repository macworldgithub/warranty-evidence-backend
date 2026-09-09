import { Injectable, UnauthorizedException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../common/enums';
import { User, UserDocument } from '../../schemas/user.schema';

export class UserProfileDto {
  @ApiProperty({ example: 'usr_admin_1' })
  id: string;

  @ApiProperty({ example: 'Marcus Vance' })
  name: string;

  @ApiProperty({ example: 'admin@booran.com.au' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role: UserRole;

  @ApiProperty({ example: 'site_cranbourne_byd' })
  defaultSiteId: string;

  @ApiProperty({ example: ['site_cranbourne_byd', 'site_dandenong_multi'] })
  authorizedSiteIds: string[];
}

export class LoginDto {
  @ApiProperty({ example: 'admin@booran.com.au' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Booran2026!' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.ADMIN })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class SignupDto {
  @ApiProperty({ example: 'David Miller' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'david.miller@booran.com.au' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Booran2026!' })
  @IsString()
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.TECHNICIAN })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ example: 'site_cranbourne_byd' })
  @IsOptional()
  @IsString()
  siteId?: string;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    try {
      const indexes = await this.userModel.collection.indexes();
      if (indexes.some((idx) => idx.name === 'supabaseUserId_1')) {
        await this.userModel.collection.dropIndex('supabaseUserId_1');
        console.log('🍃 Dropped legacy supabaseUserId_1 index from users collection');
      }
    } catch (err) {
      // ignore
    }

    console.log('🍃 Synchronizing portal users in MongoDB...');
    const defaultUsers = [
      {
        id: 'usr_admin_1',
        name: 'Marcus Vance',
        email: 'admin@booran.com.au',
        passwordHash: 'Booran2026!',
        role: UserRole.ADMIN,
        defaultSiteId: 'site_cranbourne_byd',
        authorizedSiteIds: ['site_cranbourne_byd', 'site_dandenong_multi', 'site_cheltenham_mg', 'site_berwick_toyota_ford'],
        isActive: true,
      },
      {
        id: 'usr_tech_1',
        name: 'Jake Smith',
        email: 'technician@booran.com.au',
        passwordHash: 'Booran2026!',
        role: UserRole.TECHNICIAN,
        defaultSiteId: 'site_cranbourne_byd',
        authorizedSiteIds: ['site_cranbourne_byd'],
        isActive: true,
      },
    ];

    for (const user of defaultUsers) {
      await this.userModel.updateOne(
        { id: user.id },
        { $set: user },
        { upsert: true },
      );
    }
    console.log(`🍃 Successfully synchronized ${defaultUsers.length} portal users (ADMIN & TECHNICIAN) into MongoDB`);
  }

  async findAllUsers(): Promise<UserProfileDto[]> {
    const users = await this.userModel.find({ isActive: true }).lean();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as UserRole,
      defaultSiteId: u.defaultSiteId,
      authorizedSiteIds: u.authorizedSiteIds,
    }));
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required.');
    }

    // Step 1: Find user by email only
    const userByEmail = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() }).lean();

    if (!userByEmail) {
      throw new UnauthorizedException('No account found with this email address.');
    }

    // Step 2: Validate password
    if (userByEmail.passwordHash !== dto.password) {
      throw new UnauthorizedException('Incorrect password. Please try again.');
    }

    // Step 3: Validate role if provided
    if (dto.role && userByEmail.role !== dto.role) {
      throw new UnauthorizedException(
        `This account is registered as ${userByEmail.role}. Please select the correct role.`,
      );
    }

    // Step 4: Check account is active
    if (userByEmail.isActive === false) {
      throw new UnauthorizedException('Your account has been deactivated. Please contact your administrator.');
    }

    const profile: UserProfileDto = {
      id: userByEmail.id,
      name: userByEmail.name,
      email: userByEmail.email,
      role: userByEmail.role as UserRole,
      defaultSiteId: userByEmail.defaultSiteId || 'site_cranbourne_byd',
      authorizedSiteIds: userByEmail.authorizedSiteIds || ['site_cranbourne_byd'],
    };

    return {
      accessToken: `jwt_token_${Date.now()}_${userByEmail.id}`,
      user: profile,
    };
  }

  async signup(dto: SignupDto): Promise<LoginResponseDto> {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() }).lean();
    if (existing) {
      throw new BadRequestException('An account with this email address already exists.');
    }

    const role = dto.role === UserRole.TECHNICIAN ? UserRole.TECHNICIAN : UserRole.ADMIN;
    const siteId = dto.siteId || 'site_cranbourne_byd';

    const newUser = new this.userModel({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash: dto.password,
      role,
      defaultSiteId: siteId,
      authorizedSiteIds: role === UserRole.ADMIN 
        ? ['site_cranbourne_byd', 'site_dandenong_multi', 'site_cheltenham_mg', 'site_berwick_toyota_ford']
        : [siteId],
      isActive: true,
    });

    const saved = (await newUser.save()).toObject();

    const profile: UserProfileDto = {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: saved.role as UserRole,
      defaultSiteId: saved.defaultSiteId,
      authorizedSiteIds: saved.authorizedSiteIds,
    };

    return {
      accessToken: `jwt_token_${Date.now()}_${saved.id}`,
      user: profile,
    };
  }

  async getMe(userId: string): Promise<UserProfileDto> {
    let user = await this.userModel.findOne({ id: userId }).lean();
    if (!user) {
      user = await this.userModel.findOne().lean();
    }
    if (!user) {
      throw new UnauthorizedException('User session not found');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role === 'TECHNICIAN' ? UserRole.TECHNICIAN : UserRole.ADMIN,
      defaultSiteId: user.defaultSiteId,
      authorizedSiteIds: user.authorizedSiteIds,
    };
  }
}
