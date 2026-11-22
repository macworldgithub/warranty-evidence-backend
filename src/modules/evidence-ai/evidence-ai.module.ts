import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EvidenceAiService } from './evidence-ai.service';
import { EvidenceAiController } from './evidence-ai.controller';

@Module({ imports: [AuthModule], providers: [EvidenceAiService], controllers: [EvidenceAiController], exports: [EvidenceAiService] })
export class EvidenceAiModule {}
