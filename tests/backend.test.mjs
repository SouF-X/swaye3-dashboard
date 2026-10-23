import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAppServer } from '../server.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'teachable-backend-'));
  const distDir = path.join(root, 'dist');
  await mkdir(distDir);
  await writeFile(path.join(distDir, 'index.html'), '<main>replica</main>');
  let server = await createAppServer({ dbPath: path.join(root, '.data', 'test.sqlite'), distDir });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    if (server) await close(server);
    await rm(root, { recursive: true, force: true });
  });
  return { origin, root, distDir, restart: async () => {
    await close(server);
    server = await createAppServer({ dbPath: path.join(root, '.data', 'test.sqlite'), distDir });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  } };
}

function close(server) {
  return new Promise((resolve, reject) => server.close(error => {
    try { server.closeDatabase(); } catch {}
    if (error) reject(error); else resolve();
  }));
}

test('health and SPA static serving', async t => {
  const { origin } = await fixture(t);
  assert.deepEqual(await (await fetch(`${origin}/api/health`)).json(), { status: 'ok' });
  assert.equal(await (await fetch(origin)).text(), '<main>replica</main>');
  assert.equal((await fetch(`${origin}/nested/route`)).status, 200);
});

test('writes, lists, deletes, and retains state after server restart', async t => {
  const f = await fixture(t);
  const put = await fetch(`${f.origin}/api/state/teachable-course-v1`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: '{"courses":[]}' }) });
  assert.equal(put.status, 200);
  assert.deepEqual(await (await fetch(`${f.origin}/api/state`)).json(), { 'teachable-course-v1': '{"courses":[]}' });
  f.origin = await f.restart();
  assert.deepEqual(await (await fetch(`${f.origin}/api/state`)).json(), { 'teachable-course-v1': '{"courses":[]}' });
  assert.equal((await fetch(`${f.origin}/api/state/teachable-course-v1`, { method: 'DELETE' })).status, 204);
  assert.deepEqual(await (await fetch(`${f.origin}/api/state`)).json(), {});
});

test('rejects malformed payloads, invalid keys, oversized body, and unsupported methods', async t => {
  const { origin } = await fixture(t);
  const endpoint = `${origin}/api/state/teachable-test`;
  assert.equal((await fetch(endpoint, { method: 'PUT', body: '{' })).status, 400);
  assert.equal((await fetch(endpoint, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 400);
  assert.equal((await fetch(`${origin}/api/state/other-key`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 'x' }) })).status, 400);
  assert.equal((await fetch(endpoint, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 'x'.repeat(8 * 1024 * 1024 + 1) }) })).status, 413);
  assert.equal((await fetch(`${origin}/api/state`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${origin}/api/state`, { method: 'POST' })).headers.get('access-control-allow-origin'), null);
  assert.equal((await fetch(endpoint, { method: 'PUT', headers: { origin: 'http://evil.example', 'content-type': 'application/json' }, body: JSON.stringify({ value: 'x' }) })).status, 403);
  assert.equal((await fetch(endpoint, { method: 'PUT', headers: { origin: 'http://127.0.0.1:5173', 'content-type': 'application/json' }, body: JSON.stringify({ value: 'x' }) })).status, 200);
  assert.equal((await fetch(`${origin}/api/state/teachable-test`, { method: 'DELETE', headers: { origin: 'http://evil.example' } })).status, 403);
});

test('guards static path traversal', async t => {
  const { origin } = await fixture(t);
  assert.equal((await fetch(`${origin}/%2e%2e%2fsecret`)).status, 403);
});
