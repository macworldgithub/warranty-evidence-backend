import { Injectable, Logger } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ example: 'tech_jake_s' })
  @IsString()
  recipientId: string;

  @ApiProperty({ example: '+61499918523' })
  @IsString()
  recipientPhone: string;

  @ApiProperty({ example: 'jake.smith@booran.com.au' })
  @IsString()
  recipientEmail: string;

  @ApiProperty({ example: 'Case CR-98421 Flagged: Please retake Fault Location photo' })
  @IsString()
  message: string;

  @ApiProperty({ example: 'CASE_FLAGGED' })
  @IsString()
  event: 'CASE_FLAGGED' | 'CASE_SUBMITTED' | 'AWAITING_REVIEW';
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  sendCaseFlaggedAlert(caseId: string, roNumber: string, reason: string, techPhone: string, techEmail: string) {
    const text = `[Booran Warranty Alert] Case for RO #${roNumber} was flagged by Warranty Clerk: "${reason}". Please open the Tech App to update evidence.`;
    this.logger.log(`[Twilio SMS] Dispatching to ${techPhone}: ${text}`);
    this.logger.log(`[Nodemailer Email] Dispatching to ${techEmail}: ${text}`);
    return {
      smsStatus: 'SENT_TWILIO',
      emailStatus: 'SENT_NODEMAILER',
      deliveredAt: new Date().toISOString(),
      recipientPhone: techPhone,
      recipientEmail: techEmail,
    };
  }

  sendCaseSubmittedAlert(caseId: string, roNumber: string, claimNumber: string, clerkEmail: string) {
    const text = `[Booran Warranty] RO #${roNumber} has been marked SUBMITTED under OEM Claim #${claimNumber}. Case file locked.`;
    this.logger.log(`[Nodemailer Email] Dispatching to ${clerkEmail}: ${text}`);
    return {
      emailStatus: 'SENT_NODEMAILER',
      deliveredAt: new Date().toISOString(),
      recipientEmail: clerkEmail,
    };
  }
}
