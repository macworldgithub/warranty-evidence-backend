import { IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';
export class AssignHoistDto {
  @IsOptional() @IsString() @MaxLength(80) jobNumber?: string;
  @IsOptional() @IsString() @MaxLength(20) vehicleRego?: string;
}
export class ReleaseHoistDto {
  @IsString() @IsNotEmpty() assignmentId: string;
}
