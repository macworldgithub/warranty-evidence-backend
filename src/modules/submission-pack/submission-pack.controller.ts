import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubmissionPackService, SubmissionPackResponseDto } from './submission-pack.service';

@ApiTags('Submission Pack & OEM Export')
@Controller('submission-pack')
export class SubmissionPackController {
  constructor(private readonly submissionPackService: SubmissionPackService) {}

  @Get(':caseId')
  @ApiOperation({
    summary: 'Generate OEM-named submission ZIP pack and One-Page Case Summary PDF for DMS attachment',
  })
  @ApiResponse({ status: 200, type: SubmissionPackResponseDto })
  async generateSubmissionPack(@Param('caseId') caseId: string): Promise<SubmissionPackResponseDto> {
    return this.submissionPackService.generateSubmissionPack(caseId);
  }
}
