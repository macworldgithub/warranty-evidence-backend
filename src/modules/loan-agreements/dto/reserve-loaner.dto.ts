import { IsInt, IsISO8601, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
export class ReserveLoanerDto {
  @IsString() @IsNotEmpty() siteId: string;
  @IsInt() @Min(1) @Max(6) loanerNumber: number;
  @IsString() @IsNotEmpty() @MaxLength(120) customerName: string;
  @IsString() @IsNotEmpty() @MaxLength(40) customerMobile: string;
  @IsISO8601() startAt: string;
  @IsISO8601() endAt: string;
}
