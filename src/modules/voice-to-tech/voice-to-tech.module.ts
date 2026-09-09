import { Module } from '@nestjs/common';
import { VoiceToTechController } from './voice-to-tech.controller';
import { VoiceToTechService } from './voice-to-tech.service';

@Module({
  controllers: [VoiceToTechController],
  providers: [VoiceToTechService],
  exports: [VoiceToTechService],
})
export class VoiceToTechModule {}
