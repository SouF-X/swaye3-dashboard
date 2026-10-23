/**
 * Optional durable local backend. Await initializeServerStorage() before
 * createRoot(...). A separate journal preserves unsynced writes and delete
 * tombstones in browser storage until the matching server mutation succeeds.
 * clear() is outside this bridge and is not synchronized.
 */
export type ServerStorageStatus = { online: boolean; message: string };

type JournalEntry = { operation: 'put'; value: string; revision: number } | { operation: 'delete'; revision: number };
type Journal = Record<string, JournalEntry>;
const JOURNAL_KEY = '__teachable_server_sync_journal_v1__';
const REQUEST_TIMEOUT_MS = 5000;

let status: ServerStorageStatus = { online: true, message: 'Storage connected' };
const listeners = new Set<(value: ServerStorageStatus) => void>();
let initialized = false;
let readyForSync = false;
let pending: Promise<void> = Promise.resolve();
let nextRevision = Date.now();
let originalSet: Storage['setItem'] | undefined;
let originalRemove: Storage['removeItem'] | undefined;

function setStatus(next: ServerStorageStatus) {
  status = next;
  for (const listener of listeners) listener(status);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('server-storage-status', { detail: status }));
}

export function getServerStorageStatus(): ServerStorageStatus { return status; }
/** Wait for all queued localStorage writes/deletes to finish. */
export function flushServerStorage(): Promise<void> { return pending; }
export function subscribeServerStorageStatus(listener: (value: ServerStorageStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

const isTeachableKey = (key: string) => key.startsWith('teachable-');

function readJournal(): Journal {
  try {
    const parsed: unknown = localStorage.getItem(JOURNAL_KEY) ? JSON.parse(localStorage.getItem(JOURNAL_KEY)!) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const valid: Journal = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (!isTeachableKey(key) || !entry || typeof entry !== 'object') continue;
      const candidate = entry as Partial<JournalEntry>;
      if (!Number.isSafeInteger(candidate.revision)) continue;
      if (candidate.operation === 'put' && typeof candidate.value === 'string') valid[key] = candidate as JournalEntry;
      if (candidate.operation === 'delete') valid[key] = candidate as JournalEntry;
    }
    return valid;
  } catch { return {}; }
}

function writeJournal(journal: Journal): void {
  if (!originalSet) return;
  Reflect.apply(originalSet, localStorage, [JOURNAL_KEY, JSON.stringify(journal)]);
}

function recordMutation(key: string, operation: 'put' | 'delete', value?: string): JournalEntry {
  const journal = readJournal();
  for (const existing of Object.values(journal)) nextRevision = Math.max(nextRevision, existing.revision);
  const revision = ++nextRevision;
  const entry: JournalEntry = operation === 'put' ? { operation, value: value ?? '', revision } : { operation, revision };
  journal[key] = entry;
  writeJournal(journal);
  return entry;
}

function applyJournalEntry(key: string, entry: JournalEntry): void {
  if (!originalSet || !originalRemove) return;
  if (entry.operation === 'put') Reflect.apply(originalSet, localStorage, [key, entry.value]);
  else Reflect.apply(originalRemove, localStorage, [key]);
}

function enqueueMutation(key: string, entry: JournalEntry): void {
  if (!readyForSync) return;
  pending = pending.then(async () => {
    const response = await fetch(`/api/state/${encodeURIComponent(key)}`, {
      method: entry.operation === 'put' ? 'PUT' : 'DELETE',
      headers: entry.operation === 'put' ? { 'content-type': 'application/json' } : undefined,
      body: entry.operation === 'put' ? JSON.stringify({ value: entry.value }) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Storage save failed (${response.status})`);
    const journal = readJournal();
    if (journal[key]?.revision === entry.revision) {
      delete journal[key];
      writeJournal(journal);
    }
    setStatus({ online: true, message: 'Storage connected' });
  }).catch(() => setStatus({ online: false, message: 'Changes are saved in this browser but could not reach the local server.' }));
}

function syncJournal(): void {
  if (!readyForSync) return;
  for (const [key, entry] of Object.entries(readJournal())) enqueueMutation(key, entry);
}

function installStorageBridge(): void {
  if (!originalSet || !originalRemove) {
    originalSet = Storage.prototype.setItem;
    originalRemove = Storage.prototype.removeItem;
  }
  const nativeSet = originalSet;
  const nativeRemove = originalRemove;
  Object.defineProperty(Storage.prototype, 'setItem', {
    configurable: true,
    writable: true,
    value: function (this: Storage, key: string, value: string) {
      const normalizedKey = String(key);
      const normalizedValue = String(value);
      if (this === window.localStorage && isTeachableKey(normalizedKey)) {
        let entry: JournalEntry | undefined;
        try { entry = recordMutation(normalizedKey, 'put', normalizedValue); } catch { setStatus({ online: false, message: 'This browser could not journal a local change; storage space may be full.' }); }
        Reflect.apply(nativeSet, this, [normalizedKey, normalizedValue]);
        if (entry) enqueueMutation(normalizedKey, entry);
        return;
      }
      Reflect.apply(nativeSet, this, [key, value]);
    },
  });
  Object.defineProperty(Storage.prototype, 'removeItem', {
    configurable: true,
    writable: true,
    value: function (this: Storage, key: string) {
      const normalizedKey = String(key);
      if (this === window.localStorage && isTeachableKey(normalizedKey)) {
        let entry: JournalEntry | undefined;
        try { entry = recordMutation(normalizedKey, 'delete'); } catch { setStatus({ online: false, message: 'This browser could not journal a local deletion; storage space may be full.' }); }
        Reflect.apply(nativeRemove, this, [normalizedKey]);
        if (entry) enqueueMutation(normalizedKey, entry);
        return;
      }
      Reflect.apply(nativeRemove, this, [key]);
    },
  });
}

export async function initializeServerStorage(): Promise<void> {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  installStorageBridge();
  try {
    const response = await fetch('/api/state', { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`Storage server returned ${response.status}`);
    const serverState: unknown = await response.json();
    if (!serverState || typeof serverState !== 'object' || Array.isArray(serverState)) throw new Error('Storage server returned invalid state');
    const remote = serverState as Record<string, unknown>;
    const journal = readJournal();
    const localState: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isTeachableKey(key)) {
        const value = localStorage.getItem(key);
        if (value !== null) localState[key] = value;
      }
    }

    // Journal entries are local writes newer than every server snapshot. Restore
    // their local form before considering remote values, then retry them.
    for (const [key, entry] of Object.entries(journal)) applyJournalEntry(key, entry);
    for (const [key, value] of Object.entries(remote)) {
      if (!isTeachableKey(key) || typeof value !== 'string' || journal[key]) continue;
      Reflect.apply(originalSet!, localStorage, [key, value]); // Existing clean browser values defer to server state.
    }
    for (const [key, value] of Object.entries(localState)) {
      if (typeof remote[key] !== 'string' && !journal[key]) {
        const entry = recordMutation(key, 'put', value);
        enqueueMutation(key, entry);
      }
    }
    readyForSync = true;
    syncJournal();
    setStatus({ online: true, message: 'Storage connected' });
  } catch {
    readyForSync = true;
    // With no server snapshot to arbitrate, preserve every current browser value
    // as dirty local data so a later reconnect cannot replace it with stale state.
    try {
      const journal = readJournal();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !isTeachableKey(key) || journal[key]) continue;
        const value = localStorage.getItem(key);
        if (value !== null) recordMutation(key, 'put', value);
      }
    } catch { /* Keep browser use available even if the journal cannot be written. */ }
    syncJournal();
    setStatus({ online: false, message: 'Local server storage is unavailable. Browser changes are journaled and will retry when the connection returns.' });
  }
  window.addEventListener('online', syncJournal);
}
