import { Controller, Post, Get, Patch, Delete, Param, Body, Headers, Ip, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  AuthService,
  LoginDto,
  SignupDto,
  WorkshopPinDto,
  SendRegistrationOtpDto,
  VerifyRegistrationOtpDto,
  ForgotPasswordDto,
  VerifyResetOtpDto,
  ResetPasswordDto,
  GenericAuthResponseDto,
  LoginResponseDto,
  UserProfileDto,
  CreateUserDto,
  UpdateUserDto,
  CreateRegistrationQrDto,
  QrTokenDto,
  RedeemQrDto,
} from './auth.service';

@ApiTags('Authentication & Role Access')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('registration-qr')
  async listRegistrationQrs(@Headers('authorization') authorization?: string) {
    await this.authService.assertAdmin(authorization);
    return this.authService.listRegistrationQrs();
  }

  @Post('registration-qr')
  async createRegistrationQr(@Body() dto: CreateRegistrationQrDto, @Headers('authorization') authorization?: string) {
    await this.authService.assertAdmin(authorization);
    return this.authService.createRegistrationQr(dto);
  }

  @Delete('registration-qr/:id')
  async revokeRegistrationQr(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    await this.authService.assertAdmin(authorization);
    return this.authService.revokeRegistrationQr(id);
  }

  @Post('registration-qr/:id/replace')
  async replaceRegistrationQr(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    await this.authService.assertAdmin(authorization);
    return this.authService.replaceRegistrationQr(id);
  }

  @Post('registration-qr/inspect')
  inspectRegistrationQr(@Body() dto: QrTokenDto) {
    return this.authService.inspectRegistrationQr(dto.token);
  }

  @Post('registration-qr/redeem')
  redeemRegistrationQr(@Body() dto: RedeemQrDto) {
    return this.authService.redeemRegistrationQr(dto);
  }

  @Post('users/:id/reset-qr')
  async createPasswordResetQr(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    await this.authService.assertAdmin(authorization);
    return this.authService.createPasswordResetQr(id);
  }

  @Post('reset-qr/redeem')
  redeemPasswordResetQr(@Body() dto: RedeemQrDto) {
    return this.authService.redeemPasswordResetQr(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Sign in to Booran Warranty Portal / Tech App' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  private readonly pinAttempts = new Map<string, number>();
  private pinWindowEndsAt = 0;

  private async limitPinAttempts<T>(ip: string, action: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (now >= this.pinWindowEndsAt) {
      this.pinAttempts.clear();
      this.pinWindowEndsAt = now + 2 * 60 * 1000;
    }
    const attempts = this.pinAttempts.get(ip) ?? 0;
    if (attempts >= 5) {
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many PIN attempts. Please try again shortly.',
        retryAfterSeconds: Math.ceil((this.pinWindowEndsAt - now) / 1000),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
    this.pinAttempts.set(ip, attempts + 1);
    return action();
  }

  @Post('verify-workshop-pin')
  async verifyWorkshopPin(@Body() dto: WorkshopPinDto, @Ip() ip: string) {
    await this.limitPinAttempts(ip, () => this.authService.verifyWorkshopPin(dto.workshopPin));
    return { verified: true };
  }

  @Post('signup')
  @ApiOperation({ summary: 'Register a Technician account with the workshop PIN' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async signup(@Body() dto: SignupDto, @Ip() ip: string): Promise<LoginResponseDto> {
    return this.limitPinAttempts(ip, () => this.authService.signup(dto));
  }

  @Post('register')
  @ApiOperation({ summary: 'Register alias for technician app' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async register(@Body() dto: SignupDto, @Ip() ip: string): Promise<LoginResponseDto> {
    return this.limitPinAttempts(ip, () => this.authService.signup(dto));
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

  @Post('verify-reset-otp')
  @ApiOperation({ summary: 'Verify 6-digit password reset OTP before allowing new password' })
  @ApiResponse({ status: 200, type: GenericAuthResponseDto })
  async verifyResetOtp(@Body() dto: VerifyResetOtpDto): Promise<GenericAuthResponseDto> {
    return this.authService.verifyResetOtp(dto);
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
  async getMe(
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<UserProfileDto> {
    return this.authService.resolveUserFromAuthorization(authorization, userId);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all portal users and assigned roles (Group Admin)' })
  @ApiResponse({ status: 200, type: [UserProfileDto] })
  async findAllUsers(
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<UserProfileDto[]> {
    await this.authService.assertAdmin(authorization, userId);
    return this.authService.findAllUsers();
  }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user account (Group Admin)' })
  @ApiResponse({ status: 201, type: UserProfileDto })
  async createUser(
    @Body() dto: CreateUserDto,
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<UserProfileDto> {
    await this.authService.assertAdmin(authorization, userId);
    return this.authService.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user account (Group Admin)' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<UserProfileDto> {
    await this.authService.assertAdmin(authorization, userId);
    return this.authService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user account (Group Admin)' })
  async deleteUser(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('x-user-id') userId?: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.assertAdmin(authorization, userId);
    return this.authService.deleteUser(id);
  }
}
