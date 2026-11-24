import { IsInt, IsISO8601, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';
export class ReserveLoanerDto {
  @IsString() @IsNotEmpty() siteId: string;
  @IsInt() @Min(1) @Max(6) loanerNumber: number;
  @IsString() @IsNotEmpty() @MaxLength(120) customerName: string;
  @IsString() @IsNotEmpty() @MaxLength(40) customerMobile: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString() @IsNotEmpty() @MaxLength(20) rego: string;
  @IsISO8601() startAt: string;
  @IsISO8601() endAt: string;
}
