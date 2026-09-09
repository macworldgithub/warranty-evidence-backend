import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VoiceToTechService, TranscribeAudioDto, TranscriptionResponseDto } from './voice-to-tech.service';

@ApiTags('Voice to Tech (Technician Dictation)')
@Controller('voice-to-tech')
export class VoiceToTechController {
  constructor(private readonly voiceService: VoiceToTechService) {}

  @Post('transcribe')
  @ApiOperation({
    summary: 'Transcribe technician workshop audio using Voice to Tech Australian automotive model',
  })
  @ApiResponse({ status: 200, type: TranscriptionResponseDto })
  transcribe(@Body() dto: TranscribeAudioDto): TranscriptionResponseDto {
    return this.voiceService.transcribe(dto);
  }
}
