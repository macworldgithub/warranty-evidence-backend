import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class TranscribeAudioDto {
  @ApiPropertyOptional({ example: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ example: 'data:audio/mp3;base64,...' })
  @IsOptional()
  @IsString()
  audioBase64?: string;

  @ApiPropertyOptional({ example: 'Jake Smith' })
  @IsOptional()
  @IsString()
  technicianName?: string;
}

export class TranscriptionResponseDto {
  @ApiProperty({ example: 'Inspected underbody battery casing. Zero physical impact damage. Traced coolant leak to inlet hose barb clamp.' })
  transcript: string;

  @ApiProperty({ example: 97.8 })
  confidence: number;

  @ApiProperty({ example: 15.4 })
  durationSeconds: number;

  @ApiProperty({ example: 'en-AU-Workshop-Automotive' })
  model: string;

  @ApiProperty({ example: 'OmniSuiteAI Voice to Tech (Deepgram/STT Engine)' })
  engine: string;
}

@Injectable()
export class VoiceToTechService {
  transcribe(dto: TranscribeAudioDto): TranscriptionResponseDto {
    return {
      transcript:
        'Completed inspection of the high-voltage battery casing. Zero physical impact marks. Traced coolant seepage to the secondary manifold barb clamp. Replaced O-ring and vacuum bled cooling circuit.',
      confidence: 98.2,
      durationSeconds: 14.8,
      model: 'en-AU-Workshop-Automotive-Acoustic-v2',
      engine: 'OmniSuiteAI Voice to Tech (Speech-to-Text Pipeline)',
    };
  }
}
