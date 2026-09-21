import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  AuthService,
  LoginDto,
  SignupDto,
  SendRegistrationOtpDto,
  VerifyRegistrationOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  GenericAuthResponseDto,
  LoginResponseDto,
  UserProfileDto,
  CreateUserDto,
} from './auth.service';

@ApiTags('Authentication & Role Access')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Sign in to Booran Warranty Portal / Tech App' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Register a new Admin or Technician account directly' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async signup(@Body() dto: SignupDto): Promise<LoginResponseDto> {
    return this.authService.signup(dto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register alias for technician app' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async register(@Body() dto: SignupDto): Promise<LoginResponseDto> {
    return this.authService.signup(dto);
  }

  @Post('register/send-otp')
  @ApiOperation({ summary: 'Send OTP verification code for technician / admin registration' })
  @ApiResponse({ status: 200, type: GenericAuthResponseDto })
  async sendRegistrationOtp(@Body() dto: SendRegistrationOtpDto): Promise<GenericAuthResponseDto> {
    return this.authService.sendRegistrationOtp(dto);
  }

  @Post('send-registration-otp')
  @ApiOperation({ summary: 'Alias for sending registration OTP' })
  @ApiResponse({ status: 200, type: GenericAuthResponseDto })
  async sendRegistrationOtpAlias(@Body() dto: SendRegistrationOtpDto): Promise<GenericAuthResponseDto> {
    return this.authService.sendRegistrationOtp(dto);
  }

  @Post('register/verify-otp')
  @ApiOperation({ summary: 'Verify OTP code and create new technician or admin user account' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto): Promise<LoginResponseDto> {
    return this.authService.verifyRegistrationOtp(dto);
  }

  @Post('verify-registration-otp')
  @ApiOperation({ summary: 'Alias for verifying registration OTP and creating user' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async verifyRegistrationOtpAlias(@Body() dto: VerifyRegistrationOtpDto): Promise<LoginResponseDto> {
    return this.authService.verifyRegistrationOtp(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Send OTP for password reset' })
  @ApiResponse({ status: 200, type: GenericAuthResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<GenericAuthResponseDto> {
    return this.authService.sendForgotPasswordOtp(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Verify OTP and reset account password' })
  @ApiResponse({ status: 200, type: GenericAuthResponseDto })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<GenericAuthResponseDto> {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and site permissions' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async getMe(): Promise<UserProfileDto> {
    return this.authService.getMe('usr_admin_1');
  }

  @Get('users')
  @ApiOperation({ summary: 'List all portal users and assigned roles (Group Admin)' })
  @ApiResponse({ status: 200, type: [UserProfileDto] })
  async findAllUsers(): Promise<UserProfileDto[]> {
    return this.authService.findAllUsers();
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user account (Group Admin)' })
  @ApiResponse({ status: 201, type: UserProfileDto })
  async createUser(@Body() dto: CreateUserDto): Promise<UserProfileDto> {
    return this.authService.createUser(dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user account (Group Admin)' })
  async deleteUser(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
    return this.authService.deleteUser(id);
  }
}
