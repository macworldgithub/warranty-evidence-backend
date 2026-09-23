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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receivedByStaffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receivedByStaffName?: string;
}
