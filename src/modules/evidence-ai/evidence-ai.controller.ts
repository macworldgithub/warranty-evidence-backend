import { Controller, Post, Body, Param, Headers, UploadedFile, UseInterceptors, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthService } from '../auth/auth.service';
import { EvidenceAiService, AiValues } from './evidence-ai.service';

@Controller('evidence-ai')
export class EvidenceAiController {
  private readonly busy = new Set<string>();
  private readonly lastRequest = new Map<string, number>();
  constructor(private readonly auth: AuthService, private readonly ai: EvidenceAiService) {}

  @Post('analyze')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }))
  async analyze(@UploadedFile() file: Express.Multer.File, @Body('ruleKey') ruleKey: string, @Headers('authorization') authorization?: string) {
    const user = await this.auth.resolveUserFromAuthorization(authorization);
    const now = Date.now();
    for (const [id, time] of this.lastRequest) if (now - time > 60000) this.lastRequest.delete(id);
    if (this.busy.has(user.id) || now - (this.lastRequest.get(user.id) || 0) < 3000) throw new HttpException('Please wait before requesting another analysis.', HttpStatus.TOO_MANY_REQUESTS);
    this.busy.add(user.id);
    this.lastRequest.set(user.id, now);
    try { return await this.ai.analyze(file, ruleKey, user.id); }
    finally { this.busy.delete(user.id); }
  }

  @Post(':id/review')
  async review(@Param('id') id: string, @Body() values: AiValues, @Headers('authorization') authorization?: string) {
    const user = await this.auth.resolveUserFromAuthorization(authorization);
    return this.ai.review(id, values, user.id);
  }
}
