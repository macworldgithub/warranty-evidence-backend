import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, copyFile, rename, stat, writeFile, realpath, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function digest(file) {
  const hash = createHash('sha256');
  const handle = await open(file, 'r');
  try {
    const buffer = Buffer.alloc(1024 * 1024);
    let bytesRead;
    while (({ bytesRead } = await handle.read(buffer)).bytesRead) hash.update(buffer.subarray(0, bytesRead));
  } finally { await handle.close(); }
  return hash.digest('hex');
}
async function filesIn(root, relative = '') {
  const result = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Symbolic links are not supported in archive exports.');
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(root, name));
    else if (entry.isFile()) result.push(name);
  }
  return result;
}
const json = async file => JSON.parse(await readFile(file, 'utf8'));

export async function importArchive(source, destination) {
  source = await realpath(source);
  destination = path.resolve(destination);
  if (destination === source || destination.startsWith(source + path.sep)) throw new Error('Destination must be outside the original archive.');
  await mkdir(path.join(destination, 'objects'), { recursive: true });
  const summary = await json(path.join(source, 'archive-summary.json'));
  const records = [];
  const seen = new Set();
  const store = async (root, relative) => {
    const file = path.join(root, relative);
    const hash = await digest(file);
    const target = path.join(destination, 'objects', hash);
    // Verify existing objects too: a retry repairs an interrupted or corrupt copy.
    let valid = false;
    try { valid = await digest(target) === hash; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!valid) {
      const temporary = target + '.' + process.pid + '.tmp';
      await copyFile(file, temporary);
      if (await digest(temporary) !== hash) throw new Error('File changed during import: ' + relative);
      await rename(temporary, target);
    }
    return { id: createHash('sha256').update(relative.replaceAll('\\', '/')).digest('hex'), name: path.basename(relative), originalPath: relative.replaceAll('\\', '/'), hash, bytes: (await stat(file)).size };
  };
  for (const job of summary.jobs) {
    if (!/^job \d+$/.test(job.folder)) throw new Error('Invalid job folder');
    const url = new URL(job.url);
    const match = url.pathname.match(/^\/([a-f\d]{24})\/jobs\/([a-f\d]{24})$/i);
    if (url.origin !== 'https://app.workphotos.com' || !match) throw new Error('Invalid source job URL');
    const id = match[1] + '-' + match[2];
    if (seen.has(id)) throw new Error('Duplicate source job: ' + id);
    seen.add(id);
    const folder = path.join(source, job.folder);
    let report;
    try { report = await json(path.join(folder, 'pdf/report-text.json')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (report && report.jobUrl !== job.url) throw new Error('Report belongs to a different job: ' + job.folder);
    const files = [];
    for (const relative of await filesIn(folder)) files.push(await store(folder, relative));
    const issues = job.exports.filter(item => item.status !== 'downloaded').map(item => `${item.format}: ${item.status}`);
    if (!report) issues.push('Report text missing');
    if (report?.text?.includes('No content found')) issues.push('Source report contains no content');
    for (const item of job.exports.filter(item => item.status === 'downloaded')) {
      if (!files.some(file => file.originalPath === `${item.format}/${item.filename}`)) issues.push(`${item.format}: expected file missing`);
    }
    const reportTitle = report?.title?.replace(/^Workphotos\s*-\s*.*?\s+-\s+/i, '').trim();
    records.push({ id, organisation: 'Booran Motors', title: reportTitle || `WorkPhotos job ${match[2]}`, sourceUrl: job.url, sourceFolder: job.folder, capturedAt: report?.capturedAt || null, reportText: report?.text || '', issues, files });
  }
  if (summary.discoveredJobs !== records.length) throw new Error('Job count does not match export summary');
  // Retain export manifests as private provenance, without putting their local paths in the API.
  const provenance = [];
  for (const entry of await readdir(source, { withFileTypes: true })) if (entry.isFile()) provenance.push(await store(source, entry.name));
  const indexFile = path.join(destination, 'index.json');
  let previous;
  try { previous = await json(indexFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const merged = new Map((previous?.records || []).map(record => [record.id, record]));
  for (const record of records) merged.set(record.id, record);
  const index = { version: 1, organisation: 'Booran Motors', importedAt: new Date().toISOString(), provenance, records: [...merged.values()] };
  const pending = indexFile + '.' + process.pid + '.tmp';
  await writeFile(pending, JSON.stringify(index));
  await rename(pending, indexFile);
  return { imported: records.length, total: index.records.length, needingReview: records.filter(record => record.issues.length).length, attachments: records.reduce((sum, record) => sum + record.files.length, 0) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, destination] = process.argv.slice(2);
  if (!source || !destination) throw new Error('Usage: node tools/import-workphotos.mjs <source archive> <private destination>');
  console.log(JSON.stringify(await importArchive(source, destination)));
}
