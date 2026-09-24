import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCustomerDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  residentialAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenceState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenceExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenceClass?: string;
}

export class UpdateVehicleDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rego?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  make?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stockNumber?: string;
}

export class UpdateLoanAgreementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCustomerDetailsDto)
  customer?: UpdateCustomerDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateVehicleDetailsDto)
  vehicle?: UpdateVehicleDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  loanStartDateTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueBackDateTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  dailyKmCap?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  excessKmRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  basicInsuranceExcess?: number;

  @ApiPropertyOptional()
  @IsOptional()
  outbound?: any;
}
