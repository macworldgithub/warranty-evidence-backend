import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsString, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InspectionPhotosDto } from './create-loan-agreement.dto';

export class ReturnLoanAgreementDto {
  @ApiProperty({ example: 12549 })
  @IsNumber()
  @IsNotEmpty()
  odometerIn: number;

  @ApiProperty({ example: 70 })
  @IsNumber()
  @IsNotEmpty()
  fuelLevelInPercent: number;

  @ApiPropertyOptional({ example: 'Minor scuff on rear left wheel arch' })
  @IsOptional()
  @IsString()
  returnDamageNotes?: string;

  @ApiPropertyOptional({ type: InspectionPhotosDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InspectionPhotosDto)
  photos?: InspectionPhotosDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasDamageIncident?: boolean;

  @ApiPropertyOptional({ example: 'Band A ($2,500)' })
  @IsOptional()
  @IsString()
  applicableExcessBand?: string;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  applicableExcessAmount?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  fuelShortagePercent?: number;

  @ApiPropertyOptional({ example: 45.00 })
  @IsOptional()
  @IsNumber()
  fuelChargeAmount?: number;

  @ApiPropertyOptional({ example: 250.00 })
  @IsOptional()
  @IsNumber()
  damageChargeAmount?: number;

  @ApiPropertyOptional({ example: 0.00 })
  @IsOptional()
  @IsNumber()
  cleaningFeeAmount?: number;

  @ApiPropertyOptional({ example: 2795.00 })
  @IsOptional()
  @IsNumber()
  totalChargesDue?: number;

  @ApiPropertyOptional({ example: 500.00 })
  @IsOptional()
  @IsNumber()
  securityDepositHeld?: number;

  @ApiPropertyOptional({ example: 0.00 })
  @IsOptional()
  @IsNumber()
  depositRefundAmount?: number;

  @ApiPropertyOptional({ example: 2295.00 })
  @IsOptional()
  @IsNumber()
  netAmountDue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receivedByStaffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receivedByStaffName?: string;
}
