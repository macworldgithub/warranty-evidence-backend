import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../common/enums';
import { User, UserDocument } from '../../schemas/user.schema';
import { Otp, OtpDocument } from '../../schemas/otp.schema';

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

export class CreateUserDto {
  @ApiProperty({ example: 'Sarah Jenkins' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'sarah.j@booran.com.au' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Booran2026!' })
  @IsString()
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ example: 'site_cranbourne_byd' })
  @IsOptional()
  @IsString()
  siteId?: string;
}

export class SendRegistrationOtpDto {
  @ApiProperty({ example: 'technician@booran.com.au' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Jake Smith' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class VerifyRegistrationOtpDto {
  @ApiProperty({ example: 'technician@booran.com.au' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  otp: string;

  @ApiProperty({ example: 'Jake Smith' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Booran2026!' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.TECHNICIAN })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'site_cranbourne_byd' })
  @IsOptional()
  @IsString()
  siteId?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'technician@booran.com.au' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'technician@booran.com.au' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  otp: string;

  @ApiProperty({ example: 'NewPassword2026!' })
  @IsString()
  newPassword: string;
}

export class GenericAuthResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Verification code sent to your email' })
  message: string;

  @ApiPropertyOptional({ example: '123456' })
  devOtp?: string;
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
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
  ) {}

  async onModuleInit() {
    try {
      const indexes = await this.userModel.collection.indexes();
      if (indexes.some((idx) => idx.name === 'supabaseUserId_1')) {
        await this.userModel.collection.dropIndex('supabaseUserId_1');
      }
    } catch (err) {
      // ignore
    }

    console.log('🔄 Synchronizing portal users in MongoDB...');
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
    console.log(`✅ Successfully synchronized ${defaultUsers.length} portal users (ADMIN & TECHNICIAN) into MongoDB`);
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

  async createUser(dto: CreateUserDto): Promise<UserProfileDto> {
    if (!dto.email || !dto.name || !dto.password) {
      throw new BadRequestException('Name, email, and password are required.');
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.userModel.findOne({ email }).lean();
    if (existing) {
      throw new BadRequestException('An account with this email address already exists.');
    }

    const role = dto.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.TECHNICIAN;
    const siteId = dto.siteId || 'site_cranbourne_byd';

    const newUser = new this.userModel({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: dto.name.trim(),
      email,
      passwordHash: dto.password,
      role,
      defaultSiteId: siteId,
      authorizedSiteIds:
        role === UserRole.ADMIN
          ? ['site_cranbourne_byd', 'site_dandenong_multi', 'site_cheltenham_mg', 'site_berwick_toyota_ford']
          : [siteId],
      isActive: true,
    });

    const saved = (await newUser.save()).toObject();

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: saved.role as UserRole,
      defaultSiteId: saved.defaultSiteId,
      authorizedSiteIds: saved.authorizedSiteIds,
    };
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    if (id === 'usr_admin_1') {
      throw new BadRequestException('The primary system administrator account cannot be deleted.');
    }

    const user = await this.userModel.findOne({ id });
    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found.`);
    }

    await this.userModel.deleteOne({ id });
    return {
      success: true,
      message: `User account for '${user.name}' has been deleted successfully.`,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required.');
    }

    const userByEmail = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() }).lean();

    if (!userByEmail) {
      throw new UnauthorizedException('No account found with this email address.');
    }

    if (userByEmail.passwordHash !== dto.password) {
      throw new UnauthorizedException('Incorrect password. Please try again.');
    }

    if (dto.role && userByEmail.role !== dto.role) {
      throw new UnauthorizedException(
        `This account is registered as ${userByEmail.role}. Please select the correct role.`,
      );
    }

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
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() }).lean();
    if (existing) {
      throw new BadRequestException('An account with this email address already exists.');
    }

    // Public registration is restricted to Workshop Technicians
    const role = UserRole.TECHNICIAN;
    const siteId = dto.siteId || 'site_cranbourne_byd';

    const newUser = new this.userModel({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: dto.name,
      email: dto.email.toLowerCase().trim(),
      passwordHash: dto.password,
      role,
      defaultSiteId: siteId,
      authorizedSiteIds: [siteId],
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

  async sendRegistrationOtp(dto: SendRegistrationOtpDto): Promise<GenericAuthResponseDto> {
    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('A valid email address is required.');
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.userModel.findOne({ email, isActive: true }).lean();
    if (existing) {
      throw new BadRequestException('An account with this email address already exists. Please sign in instead.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpModel.findOneAndUpdate(
      { email, purpose: 'REGISTRATION' },
      { otp, expiresAt, createdAt: new Date() },
      { upsert: true, new: true },
    );

    console.log(`📧 [AUTH OTP] Registration verification code for ${email}: ${otp}`);

    return {
      success: true,
      message: `Verification code sent to ${email}`,
      devOtp: otp,
    };
  }

  async verifyRegistrationOtp(dto: VerifyRegistrationOtpDto): Promise<LoginResponseDto> {
    if (!dto.email || !dto.otp) {
      throw new BadRequestException('Email and verification code are required.');
    }

    const email = dto.email.toLowerCase().trim();
    const otpRecord = await this.otpModel.findOne({
      email,
      purpose: 'REGISTRATION',
    });

    if (!otpRecord) {
      throw new BadRequestException('No verification code found. Please request a new code.');
    }

    if (otpRecord.otp !== dto.otp.trim()) {
      throw new BadRequestException('Incorrect verification code. Please check and try again.');
    }

    if (new Date() > otpRecord.expiresAt) {
      await this.otpModel.deleteOne({ _id: otpRecord._id });
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    await this.otpModel.deleteOne({ _id: otpRecord._id });

    const existing = await this.userModel.findOne({ email }).lean();
    if (existing) {
      throw new BadRequestException('An account with this email address already exists.');
    }

    // Public self-registration is strictly for Technicians
    const role = UserRole.TECHNICIAN;
    const siteId = dto.siteId || 'site_cranbourne_byd';

    const newUser = new this.userModel({
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: dto.name || 'Technician',
      email,
      passwordHash: dto.password || 'Booran2026!',
      role,
      defaultSiteId: siteId,
      authorizedSiteIds: [siteId],
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

  async sendForgotPasswordOtp(dto: ForgotPasswordDto): Promise<GenericAuthResponseDto> {
    if (!dto.email) {
      throw new BadRequestException('Email is required.');
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.userModel.findOne({ email, isActive: true }).lean();
    if (!existing) {
      throw new BadRequestException('No active account found with this email address.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.otpModel.findOneAndUpdate(
      { email, purpose: 'PASSWORD_RESET' },
      { otp, expiresAt, createdAt: new Date() },
      { upsert: true, new: true },
    );

    console.log(`📧 [AUTH OTP] Password reset code for ${email}: ${otp}`);

    return {
      success: true,
      message: `Password reset code sent to ${email}`,
      devOtp: otp,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<GenericAuthResponseDto> {
    if (!dto.email || !dto.otp || !dto.newPassword) {
      throw new BadRequestException('Email, verification code, and new password are required.');
    }

    const email = dto.email.toLowerCase().trim();
    const otpRecord = await this.otpModel.findOne({
      email,
      purpose: 'PASSWORD_RESET',
    });

    if (!otpRecord || otpRecord.otp !== dto.otp.trim()) {
      throw new BadRequestException('Invalid or expired password reset code.');
    }

    if (new Date() > otpRecord.expiresAt) {
      await this.otpModel.deleteOne({ _id: otpRecord._id });
      throw new BadRequestException('Password reset code has expired.');
    }

    await this.userModel.updateOne(
      { email },
      { $set: { passwordHash: dto.newPassword } },
    );

    await this.otpModel.deleteOne({ _id: otpRecord._id });

    return {
      success: true,
      message: 'Password updated successfully. You can now sign in with your new password.',
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
