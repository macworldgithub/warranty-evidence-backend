import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsEmail } from 'class-validator';
import { NotificationsService } from './notifications.service';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Firebase FCM device registration token',
    example: 'dK1...fcm_token_string_from_mobile_device',
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: 'Device operating system platform',
    enum: ['android', 'ios', 'web'],
    default: 'android',
    example: 'android',
  })
  @IsOptional()
  @IsEnum(['android', 'ios', 'web'])
  platform?: 'android' | 'ios' | 'web';

  @ApiPropertyOptional({
    description: 'Optional User ID if not authenticated via headers',
    example: 'usr_tech_1',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class UnregisterDeviceDto {
  @ApiProperty({
    description: 'FCM token to unregister',
    example: 'dK1...fcm_token_string_from_mobile_device',
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: 'Optional User ID if not authenticated via headers',
    example: 'usr_tech_1',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class TestPushDto {
  @ApiPropertyOptional({
    description: 'Direct FCM Device token to send to. If empty, sends to topic.',
    example: 'fcm_device_token_from_device',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    description: 'FCM topic to send to (e.g. warranty-admins or test-alerts)',
    example: 'warranty-admins',
    default: 'warranty-admins',
  })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({
    description: 'Notification banner title',
    example: '⚠️ Action Required: Evidence Flagged on RO #CR-43052',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification body message',
    example: 'Fault location photo was rejected by Warranty Reviewer (WRONG_ANGLE). Tap to retake.',
  })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    description: 'Warranty Case ID for deep linking in mobile app',
    example: 'CASE-CR43052-1090',
  })
  @IsOptional()
  @IsString()
  caseId?: string;

  @ApiPropertyOptional({
    description: 'If true, validates message schema and Google FCM credentials without delivering to real devices (Dry Run)',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

export class TestEmailDto {
  @ApiProperty({
    description: 'Target email address to send test email to',
    example: 'adteam@omnisuiteai.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Custom email subject line',
    example: '🧪 Booran Warranty SMTP Verification',
  })
  @IsOptional()
  @IsString()
  subject?: string;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Check notification services status (SMTP Email & Firebase FCM Push)',
  })
  getStatus() {
    return this.notificationsService.getStatus();
  }

  @Post('devices/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register mobile device FCM token for push notifications',
    description: 'Mobile apps call this endpoint after receiving an FCM token from Google Play Services or APNs.',
  })
  @ApiResponse({ status: 200, description: 'Device token registered successfully' })
  async registerDevice(
    @Body() dto: RegisterDeviceDto,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const targetUserId = dto.userId || headerUserId || 'usr_tech_1';
    return this.notificationsService.registerDeviceToken(
      targetUserId,
      dto.token,
      dto.platform || 'android',
    );
  }

  @Post('devices/unregister')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unregister mobile device FCM token (e.g. on logout)',
  })
  async unregisterDevice(
    @Body() dto: UnregisterDeviceDto,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const targetUserId = dto.userId || headerUserId;
    return this.notificationsService.unregisterDeviceToken(dto.token, targetUserId);
  }

  @Post('test-push')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a test FCM Push Notification to verify setup (Supports Dry-Run without a mobile device)',
    description: 'Sends a push notification via Firebase Cloud Messaging. Set dryRun: true to validate against Google FCM servers without needing a physical device.',
  })
  async testPush(@Body() dto: TestPushDto) {
    return this.notificationsService.sendTestPushNotification(dto);
  }

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a test email to verify SMTP configuration',
    description: 'Dispatches an email notification via Nodemailer SMTP to verify outbound mail delivery.',
  })
  async testEmail(@Body() dto: TestEmailDto) {
    return this.notificationsService.sendTestEmail(dto.email, dto.subject);
  }
}
