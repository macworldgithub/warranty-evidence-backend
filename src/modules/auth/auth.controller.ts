import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService, LoginDto, LoginResponseDto, UserProfileDto } from './auth.service';

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
  @ApiOperation({ summary: 'Register a new Admin or Technician account' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async signup(@Body() dto: any): Promise<LoginResponseDto> {
    return this.authService.signup(dto);
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
}
