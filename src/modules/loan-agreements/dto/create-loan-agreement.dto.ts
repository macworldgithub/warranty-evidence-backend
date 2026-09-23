import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, ValidateNested, IsEmail, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomerDetailsDto {
  @ApiProperty({ example: 'David Okonkwo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '1988-06-14' })
  @IsString()
  @IsNotEmpty()
  dob: string;

  @ApiProperty({ example: '+61 412 000 006' })
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @ApiProperty({ example: 'david.okonkwo@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '42 Station St, Cranbourne VIC 3977' })
  @IsString()
  @IsNotEmpty()
  residentialAddress: string;

  @ApiProperty({ example: '98421098' })
  @IsString()
  @IsNotEmpty()
  licenceNumber: string;

  @ApiProperty({ example: 'VIC' })
  @IsString()
  @IsNotEmpty()
  licenceState: string;

  @ApiProperty({ example: '2028-11-20' })
  @IsString()
  @IsNotEmpty()
  licenceExpiry: string;

  @ApiPropertyOptional({ example: 'C' })
  @IsOptional()
  @IsString()
  licenceClass?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licencePhotoUrl?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  licenceSighted: boolean;
}

export class VehicleDetailsDto {
  @ApiProperty({ example: 'LGXCE4C86P0019283' })
  @IsString()
  @IsNotEmpty()
  vin: string;

  @ApiProperty({ example: 'BMG214' })
  @IsString()
  @IsNotEmpty()
  rego: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  make: string;

  @ApiProperty({ example: 'RAV4 Cruiser' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 2024 })
  @IsNumber()
  year: number;

  @ApiPropertyOptional({ example: 'White' })
  @IsOptional()
  @IsString()
  colour?: string;

  @ApiPropertyOptional({ example: 'LN-9842' })
  @IsOptional()
  @IsString()
  stockNumber?: string;
}

export class InspectionPhotosDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  front?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverSide?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passengerSide?: string;
}

export class OutboundConditionDto {
  @ApiProperty({ example: 12485 })
  @IsNumber()
  odometerOut: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  fuelLevelOutPercent: number;

  @ApiPropertyOptional({ example: 'Clean, no visible damage.' })
  @IsOptional()
  @IsString()
  damageNotes?: string;

  @ApiPropertyOptional({ type: InspectionPhotosDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InspectionPhotosDto)
  photos?: InspectionPhotosDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuedByStaffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuedByStaffName?: string;
}

export class CreateLoanAgreementDto {
  @ApiProperty({ example: 'site_cranbourne_byd' })
  @IsString()
  @IsNotEmpty()
  siteId: string;

  @ApiPropertyOptional({ example: 'Booran BYD Cranbourne' })
  @IsOptional()
  @IsString()
  siteName?: string;

  @ApiPropertyOptional({ example: 'RO-48021' })
  @IsOptional()
  @IsString()
  roNumber?: string;

  @ApiProperty({ enum: ['SERVICE_LOANER', 'TEST_DRIVE', 'COURTESY_LOAN', 'DEMO'], default: 'SERVICE_LOANER' })
  @IsString()
  purpose: string;

  @ApiProperty({ type: CustomerDetailsDto })
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customer: CustomerDetailsDto;

  @ApiProperty({ type: VehicleDetailsDto })
  @ValidateNested()
  @Type(() => VehicleDetailsDto)
  vehicle: VehicleDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  loanStartDateTime?: string;

  @ApiProperty({ example: '2026-09-23T17:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  dueBackDateTime: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  dailyKmCap?: number;

  @ApiPropertyOptional({ example: 0.50 })
  @IsOptional()
  @IsNumber()
  excessKmRate?: number;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  basicInsuranceExcess?: number;

  @ApiProperty({ type: OutboundConditionDto })
  @ValidateNested()
  @Type(() => OutboundConditionDto)
  outbound: OutboundConditionDto;
}
