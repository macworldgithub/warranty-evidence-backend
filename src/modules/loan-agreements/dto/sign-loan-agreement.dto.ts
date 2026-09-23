import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class SignLoanAgreementDto {
  @ApiProperty({ description: 'Base64 data URL or PNG image of customer signature' })
  @IsString()
  @IsNotEmpty()
  borrowerSignatureDataUrl: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  readAndAgreed: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  electronicConsent: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  privacyNoticeAcknowledged: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  staffSignatureDataUrl?: string;

  @ApiPropertyOptional({ example: 'Jake Smith' })
  @IsOptional()
  @IsString()
  staffName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceUserAgent?: string;
}
