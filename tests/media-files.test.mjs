import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAppServer } from '../server.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'teachable-media-'));
  const distDir = path.join(root, 'dist');
  await mkdir(distDir);
  await writeFile(path.join(distDir, 'index.html'), '<main>replica</main>');
  const server = await createAppServer({ dbPath: path.join(root, '.data', 'test.sqlite'), distDir });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(error => {
      try { server.closeDatabase(); } catch {}
      if (error) reject(error); else resolve();
    }));
    await rm(root, { recursive: true, force: true });
  });
  return { origin };
}

function signature(type) {
  if (type === 'video/mp4' || type === 'audio/mp4') return Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  if (type === 'video/webm') return Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3]);
  if (type === 'audio/mpeg') return Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00');
  if (type === 'audio/ogg') return Buffer.from('OggS\x00\x02');
  if (type === 'audio/wav') return Buffer.from('RIFF\x00\x00\x00\x00WAVEfmt ');
  if (type === 'application/pdf') return Buffer.from('%PDF-1.7\n');
  if (type === 'application/zip') return Buffer.from('PK\x03\x04\x14\x00');
  return Buffer.from('sample local resource\n');
}

test('stores approved media/resource types separately and serves the trusted MIME type', async t => {
  const { origin } = await fixture(t);
  const types = ['video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'application/pdf', 'application/zip', 'text/plain', 'text/csv'];
  for (const type of types) {
    const bytes = signature(type);
    const uploaded = await fetch(`${origin}/api/files`, { method: 'POST', headers: { 'content-type': type }, body: bytes });
    assert.equal(uploaded.status, 201, `${type} upload should succeed`);
    const result = await uploaded.json();
    assert.deepEqual(result, { url: result.url, bytes: bytes.length, type });
    assert.match(result.url, /^\/uploads\/[a-f0-9]{64}\.[a-z0-9]+$/);
    const served = await fetch(`${origin}${result.url}`);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type')?.split(';')[0], type);
    assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), bytes);
    const shouldDownload = ['application/zip', 'text/plain', 'text/csv'].includes(type);
    assert.equal(served.headers.get('content-disposition')?.startsWith('attachment;') ?? false, shouldDownload);
    assert.equal((await fetch(`${origin}${result.url}`, { method: 'HEAD' })).status, 200);
  }
});

test('rejects unsupported, empty, mismatched, and cross-origin uploads', async t => {
  const { origin } = await fixture(t);
  assert.equal((await fetch(`${origin}/api/files`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: 'x' })).status, 415);
  assert.equal((await fetch(`${origin}/api/files`, { method: 'POST', headers: { 'content-type': 'application/pdf' }, body: 'not a pdf' })).status, 415);
  assert.equal((await fetch(`${origin}/api/files`, { method: 'POST', headers: { 'content-type': 'text/plain' } })).status, 400);
  assert.equal((await fetch(`${origin}/api/files`, { method: 'POST', headers: { 'content-type': 'text/plain', origin: 'http://evil.example' }, body: 'denied' })).status, 403);
  assert.equal((await fetch(`${origin}/api/files`, { method: 'GET' })).status, 405);
});

test('rejects uploads whose declared size exceeds 50 MiB', async t => {
  const { origin } = await fixture(t);
  const target = new URL('/api/files', origin);
  const response = await new Promise((resolve, reject) => {
    const req = http.request({ hostname: target.hostname, port: target.port, path: target.pathname, method: 'POST', headers: { 'content-type': 'text/plain', 'content-length': String(50 * 1024 * 1024 + 1) } }, resolve);
    req.on('error', reject);
    req.end();
  });
  assert.equal(response.statusCode, 413);
});
