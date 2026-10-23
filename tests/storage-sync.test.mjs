import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/serverStorage.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

class FakeStorage {
  constructor(seed = new Map()) { this.values = seed; }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
  clear() { this.values.clear(); }
}

function createHarness({ localValues = new Map(), serverValues = {}, failReads = 0, failMutations = 0 } = {}) {
  const TestStorage = class extends FakeStorage {};
  const localStorage = new TestStorage(localValues);
  const sessionStorage = new TestStorage();
  const onlineHandlers = new Set();
  const calls = [];
  const network = { failReads, failMutations };
  const serverState = serverValues;
  const response = (status, value) => ({ ok: status >= 200 && status < 300, status, json: async () => value });
  const fetch = async (url, options = {}) => {
    calls.push({ url, ...options });
    if (url === '/api/state') {
      if (network.failReads > 0) { network.failReads--; throw new Error('offline read'); }
      return response(200, { ...serverState });
    }
    if (network.failMutations > 0) { network.failMutations--; return response(503, {}); }
    const key = decodeURIComponent(url.slice('/api/state/'.length));
    if (options.method === 'PUT') serverState[key] = JSON.parse(options.body).value;
    if (options.method === 'DELETE') delete serverState[key];
    return response(options.method === 'DELETE' ? 204 : 200, {});
  };
  const window = {
    localStorage,
    addEventListener: (type, listener) => { if (type === 'online') onlineHandlers.add(listener); },
    dispatchEvent: () => true,
  };
  const module = { exports: {} };
  const context = {
    module, exports: module.exports, Storage: TestStorage, window, localStorage, sessionStorage,
    fetch, AbortSignal, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    URL, console,
  };
  vm.runInNewContext(compiled, context, { filename: 'serverStorage.js' });
  return {
    api: module.exports, localStorage, sessionStorage, serverState, network, calls,
    reconnect() { for (const listener of onlineHandlers) listener(); },
  };
}

const journal = storage => {
  const raw = storage.getItem('__teachable_server_sync_journal_v1__');
  return raw ? JSON.parse(raw) : {};
};

test('failed write survives reload and takes precedence over stale server state', async () => {
  const values = new Map();
  const serverState = { 'teachable-data-v1': 'old' };
  const first = createHarness({ localValues: values, serverValues: serverState, failMutations: 1 });
  await first.api.initializeServerStorage();
  first.localStorage.setItem('teachable-data-v1', 'new');
  await first.api.flushServerStorage();
  assert.equal(first.localStorage.getItem('teachable-data-v1'), 'new');
  assert.equal(journal(first.localStorage)['teachable-data-v1'].value, 'new');
  assert.equal(serverState['teachable-data-v1'], 'old');

  const afterReload = createHarness({ localValues: values, serverValues: serverState });
  await afterReload.api.initializeServerStorage();
  await afterReload.api.flushServerStorage();
  assert.equal(afterReload.localStorage.getItem('teachable-data-v1'), 'new');
  assert.equal(serverState['teachable-data-v1'], 'new');
  assert.equal(journal(afterReload.localStorage)['teachable-data-v1'], undefined);
});

test('edits made while initial server read is offline are journaled and retry on reconnect', async () => {
  const h = createHarness({ localValues: new Map([['teachable-seed-v1', 'before server startup']]), failReads: 1, failMutations: 2 });
  await h.api.initializeServerStorage();
  assert.equal(journal(h.localStorage)['teachable-seed-v1'].value, 'before server startup');
  h.localStorage.setItem('teachable-offline-v1', 'saved locally');
  await h.api.flushServerStorage();
  assert.equal(h.localStorage.getItem('teachable-offline-v1'), 'saved locally');
  assert.equal(journal(h.localStorage)['teachable-offline-v1'].value, 'saved locally');
  h.reconnect();
  await h.api.flushServerStorage();
  assert.equal(h.serverState['teachable-seed-v1'], 'before server startup');
  assert.equal(h.serverState['teachable-offline-v1'], 'saved locally');
  assert.equal(journal(h.localStorage)['teachable-offline-v1'], undefined);
});

test('failed delete tombstone prevents stale server value from returning after reload', async () => {
  const values = new Map();
  const serverState = { 'teachable-remove-v1': 'stale' };
  const first = createHarness({ localValues: values, serverValues: serverState, failMutations: 1 });
  await first.api.initializeServerStorage();
  assert.equal(first.localStorage.getItem('teachable-remove-v1'), 'stale');
  first.localStorage.removeItem('teachable-remove-v1');
  await first.api.flushServerStorage();
  assert.equal(journal(first.localStorage)['teachable-remove-v1'].operation, 'delete');

  const afterReload = createHarness({ localValues: values, serverValues: serverState });
  await afterReload.api.initializeServerStorage();
  await afterReload.api.flushServerStorage();
  assert.equal(afterReload.localStorage.getItem('teachable-remove-v1'), null);
  assert.equal(serverState['teachable-remove-v1'], undefined);
  assert.equal(journal(afterReload.localStorage)['teachable-remove-v1'], undefined);
});

test('sessionStorage and non-teachable local keys never sync', async () => {
  const h = createHarness();
  await h.api.initializeServerStorage();
  h.sessionStorage.setItem('teachable-session-only', 'private');
  h.sessionStorage.removeItem('teachable-session-only');
  h.localStorage.setItem('ordinary-preference', 'local');
  await h.api.flushServerStorage();
  assert.equal(h.calls.filter(call => call.url !== '/api/state').length, 0);
  assert.deepEqual({ ...h.serverState }, {});
});
