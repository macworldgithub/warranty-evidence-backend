import { Test } from '@nestjs/testing';
import { UnauthorizedException, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import request = require('supertest');
import { AuthService } from '../auth/auth.service';
import { HistoricalArchiveController, HistoricalArchiveService } from './historical-archive.module';

jest.mock('@nestjs/config', () => ({ ConfigService: class {} }));
jest.mock('../auth/auth.service', () => ({ AuthService: class {} }));
jest.mock('../auth/auth.module', () => ({ AuthModule: class {} }));

describe('private historical archive HTTP access', () => {
  let app: INestApplication;
  let root: string;
  const hash = 'a'.repeat(64);
  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'workphotos-test-'));
    await mkdir(path.join(root, 'objects'));
    await writeFile(path.join(root, 'objects', hash), 'private report');
    await writeFile(path.join(root, 'objects', 'b'.repeat(64)), `version https://git-lfs.github.com/spec/v1\noid sha256:${'b'.repeat(64)}\nsize 3151321\n`);
    await writeFile(path.join(root, 'objects', 'c'.repeat(64)), 'partial');
    await writeFile(path.join(root, 'index.json'), JSON.stringify({ version: 1, importedAt: '2026-10-08', records: [
      { id: 'job-one', title: 'RO 123 ABC456', organisation: 'Booran Motors', reportText: 'Recall completed', issues: [], files: [{ id: 'file-one', name: 'report.txt', originalPath: 'text/report.txt', hash, bytes: 14 }] },
      { id: 'job-two', title: 'Other job', organisation: 'Booran Motors', reportText: '', issues: [], files: [] },
      { id: 'not-hydrated', title: 'Pending server files', organisation: 'Booran Motors', reportText: '', issues: [], files: [
        { id: 'pointer', name: 'images.zip', hash: 'b'.repeat(64), bytes: 3151321 },
        { id: 'truncated', name: 'report.pdf', hash: 'c'.repeat(64), bytes: 755483 },
      ] },
    ] }));
    const module = await Test.createTestingModule({
      controllers: [HistoricalArchiveController], providers: [HistoricalArchiveService,
        { provide: ConfigService, useValue: { get: () => root } },
        { provide: AuthService, useValue: { resolveUserFromAuthorization: async (header?: string) => {
          if (!header || header === 'Bearer expired') throw new UnauthorizedException();
          const [role, email] = header.replace('Bearer ', '').split('|');
          return { role, email };
        } } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); await rm(root, { recursive: true, force: true }); });
  const routes = ['/historical-archive', '/historical-archive/job-one', '/historical-archive/job-one/files/file-one'];
  it.each(['clerk@dandenong.com', 'clerk@morang.com', 'clerk@skoda.com'])('permits all archive routes for %s', async email => {
    for (const route of routes) await request(app.getHttpServer()).get(route).set('Authorization', `Bearer CLERK|${email}`).expect(200).expect('Cache-Control', 'private, no-store');
  });
  it('permits admins', async () => {
    await request(app.getHttpServer()).get(routes[0]).set('Authorization', 'Bearer ADMIN|admin@example.com').expect(200);
  });
  it.each(['CLERK|other@example.com', 'TECHNICIAN|clerk@skoda.com'])('denies all archive routes for %s', async identity => {
    for (const route of routes) await request(app.getHttpServer()).get(route).set('Authorization', `Bearer ${identity}`).expect(403);
  });
  it('requires a valid session even for direct file links', async () => {
    for (const route of routes) {
      await request(app.getHttpServer()).get(route).expect(401);
      await request(app.getHttpServer()).get(route).set('Authorization', 'Bearer expired').expect(401);
    }
  });
  it('searches report content and omits private object keys', async () => {
    const response = await request(app.getHttpServer()).get('/historical-archive?search=recall&page=-3').set('Authorization', 'Bearer CLERK|clerk@skoda.com').expect(200);
    expect(response.body.total).toBe(1);
    expect(response.body.page).toBe(1);
    const detail = await request(app.getHttpServer()).get(routes[1]).set('Authorization', 'Bearer CLERK|clerk@skoda.com').expect(200);
    expect(detail.body.files[0].hash).toBeUndefined();
    expect(JSON.stringify(detail.body)).not.toContain(root);
  });
  it('does not expose arbitrary files or jobs', async () => {
    await request(app.getHttpServer()).get('/historical-archive/job-one/files/index.json').set('Authorization', 'Bearer CLERK|clerk@skoda.com').expect(404);
    await request(app.getHttpServer()).get('/historical-archive/missing').set('Authorization', 'Bearer CLERK|clerk@skoda.com').expect(404);
  });
  it('rejects LFS pointers and truncated files instead of sending broken downloads', async () => {
    const pointer = await request(app.getHttpServer()).get('/historical-archive/not-hydrated/files/pointer').set('Authorization', 'Bearer CLERK|clerk@skoda.com').expect(503);
    expect(pointer.body.message).toContain('has not been downloaded');
    const truncated = await request(app.getHttpServer()).get('/historical-archive/not-hydrated/files/truncated').set('Authorization', 'Bearer CLERK|clerk@skoda.com').expect(503);
    expect(truncated.body.message).toContain('incomplete');
  });
});
