import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceToTechController } from './voice-to-tech.controller';
import { VoiceToTechService } from './voice-to-tech.service';
import { VoiceToTechGateway } from './voice-to-tech.gateway';

@Module({
  imports: [ConfigModule],
  controllers: [VoiceToTechController],
  providers: [VoiceToTechService, VoiceToTechGateway],
  exports: [VoiceToTechService, VoiceToTechGateway],
})
export class VoiceToTechModule {}
