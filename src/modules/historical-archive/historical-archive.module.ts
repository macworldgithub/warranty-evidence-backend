import { Controller, Get, Headers, Param, Query, Res, Module, Injectable, ForbiddenException, NotFoundException, ServiceUnavailableException, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile, realpath } from 'fs/promises';
import * as path from 'path';
import type { Response } from 'express';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';

const ARCHIVE_CLERKS = new Set(['clerk@dandenong.com', 'clerk@morang.com', 'clerk@skoda.com']);
export function canReadArchive(user: { role: string; email: string }): boolean {
  return user.role === 'ADMIN' || (user.role === 'CLERK' && ARCHIVE_CLERKS.has(user.email.trim().toLowerCase()));
}
interface ArchiveFile { id: string; name: string; originalPath: string; hash: string; bytes: number }
interface ArchiveRecord { id: string; organisation: string; title: string; sourceUrl: string; sourceFolder: string; capturedAt: string | null; reportText: string; issues: string[]; files: ArchiveFile[] }
interface ArchiveIndex { version: number; importedAt: string; records: ArchiveRecord[] }

@Injectable()
export class HistoricalArchiveService {
  constructor(private readonly config: ConfigService) {}
  private root() { return path.resolve(this.config.get<string>('WORKPHOTOS_ARCHIVE_DIR') || './private/workphotos'); }
  private async index(): Promise<ArchiveIndex> {
    try {
      const index = JSON.parse(await readFile(path.join(this.root(), 'index.json'), 'utf8')) as ArchiveIndex;
      if (index.version !== 1 || !Array.isArray(index.records)) throw new Error('Invalid archive');
      return index;
    } catch { throw new ServiceUnavailableException('The historical archive has not been imported or is unavailable.'); }
  }
  async list(search = '', page = '1') {
    const index = await this.index();
    const term = search.trim().slice(0, 200).toLowerCase();
    const matches = index.records.filter(record => !term || `${record.title}\n${record.reportText}`.toLowerCase().includes(term));
    const pages = Math.max(1, Math.ceil(matches.length / 25));
    const current = Math.min(pages, Math.max(1, Number.parseInt(page, 10) || 1));
    return { organisation: 'Booran Motors', importedAt: index.importedAt, total: matches.length, archiveTotal: index.records.length, page: current, pages, items: matches.slice((current - 1) * 25, current * 25).map(({ reportText, files, ...record }) => ({ ...record, fileCount: files.length })) };
  }
  private async record(id: string) {
    const record = (await this.index()).records.find(item => item.id === id);
    if (!record) throw new NotFoundException('Archived job not found.');
    return record;
  }
  async detail(id: string) {
    const record = await this.record(id);
    return { ...record, files: record.files.map(({ hash, ...file }) => file) };
  }
  async file(id: string, fileId: string) {
    const file = (await this.record(id)).files.find(item => item.id === fileId);
    if (!file || !/^[a-f0-9]{64}$/.test(file.hash)) throw new NotFoundException('Archived file not found.');
    try {
      const objects = await realpath(path.join(this.root(), 'objects'));
      const filename = await realpath(path.join(objects, file.hash));
      if (path.dirname(filename) !== objects) throw new Error('Outside private storage');
      return { filename, name: file.name };
    } catch { throw new NotFoundException('Archived file is unavailable.'); }
  }
}

@Controller('historical-archive')
export class HistoricalArchiveController {
  constructor(private readonly auth: AuthService, private readonly archive: HistoricalArchiveService) {}
  private async authorize(authorization?: string) {
    const user = await this.auth.resolveUserFromAuthorization(authorization);
    if (!canReadArchive(user)) throw new ForbiddenException('You do not have access to the Booran Motors historical archive.');
  }
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Headers('authorization') authorization?: string, @Query('search') search?: string, @Query('page') page?: string) {
    await this.authorize(authorization);
    return this.archive.list(search, page);
  }
  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    await this.authorize(authorization);
    return this.archive.detail(id);
  }
  @Get(':id/files/:fileId')
  async download(@Param('id') id: string, @Param('fileId') fileId: string, @Headers('authorization') authorization: string | undefined, @Res() response: Response) {
    await this.authorize(authorization);
    const file = await this.archive.file(id, fileId);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.download(file.filename, file.name);
  }
}

@Module({ imports: [AuthModule], controllers: [HistoricalArchiveController], providers: [HistoricalArchiveService] })
export class HistoricalArchiveModule {}
