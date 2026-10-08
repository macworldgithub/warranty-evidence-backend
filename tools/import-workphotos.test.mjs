import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { importArchive } from './import-workphotos.mjs';

test('preserves source, detects incomplete exports, retries without duplicates and repairs corrupt objects', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archive-import-'));
  try {
    const source = path.join(root, 'source');
    const destination = path.join(root, 'private');
    await mkdir(path.join(source, 'job 1', 'pdf'), { recursive: true });
    const url = `https://app.workphotos.com/${'a'.repeat(24)}/jobs/${'b'.repeat(24)}`;
    const summary = { discoveredJobs: 1, jobs: [{ url, folder: 'job 1', exports: [{ format: 'pdf', status: 'downloaded', filename: 'report.pdf' }, { format: 'images', status: 'unavailable' }] }] };
    await writeFile(path.join(source, 'archive-summary.json'), JSON.stringify(summary));
    const original = JSON.stringify({ jobUrl: url, title: 'Workphotos - user@example.com - RO 42', text: 'Report content' });
    const report = path.join(source, 'job 1', 'pdf', 'report-text.json');
    await writeFile(report, original);
    const first = await importArchive(source, destination);
    assert.equal(first.total, 1);
    assert.equal(first.needingReview, 1);
    const index = JSON.parse(await readFile(path.join(destination, 'index.json'), 'utf8'));
    assert.equal(index.records[0].title, 'RO 42');
    assert.ok(index.records[0].issues.includes('pdf: expected file missing'));
    const stored = path.join(destination, 'objects', index.records[0].files[0].hash);
    await writeFile(stored, 'broken copy');
    assert.equal((await importArchive(source, destination)).total, 1);
    assert.equal(await readFile(stored, 'utf8'), original);
    assert.equal(await readFile(report, 'utf8'), original);
    summary.jobs.push(summary.jobs[0]); summary.discoveredJobs = 2;
    await writeFile(path.join(source, 'archive-summary.json'), JSON.stringify(summary));
    await assert.rejects(importArchive(source, destination), /Duplicate source job/);
    assert.equal(JSON.parse(await readFile(path.join(destination, 'index.json'), 'utf8')).records.length, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
