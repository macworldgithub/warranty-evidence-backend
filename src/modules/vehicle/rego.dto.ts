import { Transform } from 'class-transformer';
import { IsIn, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const REGISTRATION_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;
export type RegistrationState = typeof REGISTRATION_STATES[number];

export class DecodeRegoDto {
  @ApiProperty({ example: 'ABC123', description: 'Australian registration plate' })
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/[ -]/g, '').toUpperCase() : value)
  @IsString()
  @Matches(/^[A-Z0-9]{1,9}$/, { message: 'Enter a registration plate of up to 9 letters or numbers.' })
  rego: string;

  @ApiProperty({ enum: REGISTRATION_STATES, example: 'VIC' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsIn(REGISTRATION_STATES)
  state: RegistrationState;
}
