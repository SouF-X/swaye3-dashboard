import http from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Images are stored as separate files; this cap bounds a state snapshot.
const MAX_BODY = 8 * 1024 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Request body is too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (!size) throw Object.assign(new Error('Request body is required'), { status: 400 });
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('Request body must be valid JSON'), { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('Request body must be a JSON object'), { status: 400 });
  return body;
}

function isSafeKey(key) { return typeof key === 'string' && /^teachable-[a-zA-Z0-9_-]{1,120}$/.test(key); }

function isAllowedMutationOrigin(origin, req, server) {
  if (!origin) return true;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.protocol !== 'http:' || parsed.origin !== origin) return false;
  const allow = new Set([
    'http://127.0.0.1:4174', 'http://localhost:4174',
    'http://127.0.0.1:5173', 'http://localhost:5173',
    'http://127.0.0.1:5175', 'http://localhost:5175',
    ...(process.env.TEACHABLE_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
  ]);
  const address = server.address();
  if (address && typeof address === 'object') {
    allow.add(`http://127.0.0.1:${address.port}`);
    allow.add(`http://localhost:${address.port}`);
  }
  // The request's Host header must itself be a known loopback host.
  const host = req.headers.host;
  if (!host || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return false;
  return allow.has(origin);
}

export async function createAppServer({ dbPath = path.join(HERE, '.data', 'teachable.sqlite'), distDir = path.join(HERE, 'dist') } = {}) {
  await mkdir(path.dirname(dbPath), { recursive: true });
  const uploadDir = path.join(path.dirname(dbPath), 'uploads');
  await mkdir(uploadDir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const readAll = db.prepare('SELECT key, value FROM app_state');
  const putValue = db.prepare('INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP');
  const deleteValue = db.prepare('DELETE FROM app_state WHERE key = ?');

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      if (url.pathname === '/api/uploads') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
        if (!isAllowedMutationOrigin(req.headers.origin, req, server)) return sendJson(res, 403, { error: 'Cross-origin uploads are not allowed' });
        const type = (req.headers['content-type'] || '').split(';')[0];
        const extensions = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif' };
        if (!extensions[type]) return sendJson(res, 415, { error: 'Choose a JPEG, PNG, WebP or GIF image' });
        const parts = []; let size = 0;
        for await (const part of req) {
          size += part.length;
          if (size > 3 * 1024 * 1024) return sendJson(res, 413, { error: 'Choose an image smaller than 3 MB' });
          parts.push(part);
        }
        const image = Buffer.concat(parts);
        const magicMatches = type === 'image/jpeg' ? image[0] === 255 && image[1] === 216 && image[2] === 255
          : type === 'image/png' ? image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
          : type === 'image/gif' ? ['GIF87a','GIF89a'].includes(image.subarray(0,6).toString())
          : image.subarray(0,4).toString() === 'RIFF' && image.subarray(8,12).toString() === 'WEBP';
        if (!magicMatches) return sendJson(res, 415, { error: 'The file does not match the selected image type' });
        const filename = `${createHash('sha256').update(image).digest('hex')}.${extensions[type]}`;
        await writeFile(path.join(uploadDir, filename), image);
        return sendJson(res, 201, { url: `/uploads/${filename}`, bytes: image.length });
      }
      if (url.pathname === '/api/files') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
        if (!isAllowedMutationOrigin(req.headers.origin, req, server)) return sendJson(res, 403, { error: 'Cross-origin file uploads are not allowed' });
        const type = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        const extensions = {
          'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a',
          'audio/ogg': 'ogg', 'audio/wav': 'wav', 'application/pdf': 'pdf', 'application/zip': 'zip',
          'text/plain': 'txt', 'text/csv': 'csv',
        };
        if (!extensions[type]) return sendJson(res, 415, { error: 'Unsupported file type' });
        const maxFileBytes = 50 * 1024 * 1024;
        const declaredLength = Number(req.headers['content-length']);
        if (Number.isFinite(declaredLength) && declaredLength > maxFileBytes) return sendJson(res, 413, { error: 'Choose a file no larger than 50 MB' });
        const parts = [];
        let size = 0;
        for await (const part of req) {
          size += part.length;
          if (size > maxFileBytes) {
            req.resume();
            return sendJson(res, 413, { error: 'Choose a file no larger than 50 MB' });
          }
          parts.push(part);
        }
        if (!size) return sendJson(res, 400, { error: 'File body is required' });
        const file = Buffer.concat(parts);
        const startsWith = signature => file.subarray(0, signature.length).equals(Buffer.from(signature));
        const signatureMatches = type === 'video/mp4' || type === 'audio/mp4' ? file.subarray(4, 8).toString('ascii') === 'ftyp'
          : type === 'video/webm' ? startsWith([0x1a, 0x45, 0xdf, 0xa3])
          : type === 'audio/mpeg' ? startsWith('ID3') || (file.length >= 2 && file[0] === 0xff && (file[1] & 0xe0) === 0xe0 && (file[1] & 0x06) !== 0)
          : type === 'audio/ogg' ? startsWith('OggS')
          : type === 'audio/wav' ? startsWith('RIFF') && file.subarray(8, 12).toString('ascii') === 'WAVE'
          : type === 'application/pdf' ? startsWith('%PDF-')
          : type === 'application/zip' ? startsWith('PK\x03\x04') || startsWith('PK\x05\x06') || startsWith('PK\x07\x08')
          : true;
        if (!signatureMatches) return sendJson(res, 415, { error: 'The file does not match the selected type' });
        const extension = extensions[type];
        const digest = createHash('sha256').update(file).digest('hex');
        const filename = `${digest}.${extension}`;
        await writeFile(path.join(uploadDir, filename), file);
        return sendJson(res, 201, { url: `/uploads/${filename}`, bytes: file.length, type });
      }
      if (url.pathname.startsWith('/uploads/')) {
        if (!['GET','HEAD'].includes(req.method)) return sendJson(res, 405, { error: 'Method not allowed' });
        const name = url.pathname.slice('/uploads/'.length);
        if (!/^[a-f0-9]{64}\.(jpg|png|webp|gif|mp4|webm|mp3|m4a|ogg|wav|pdf|zip|txt|csv)$/.test(name)) return sendJson(res, 404, { error: 'File not found' });
        let file;
        try { file = await readFile(path.join(uploadDir, name)); } catch { return sendJson(res, 404, { error: 'File not found' }); }
        const extension = path.extname(name);
        const type = {
          '.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif',
          '.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.m4a':'audio/mp4',
          '.ogg':'audio/ogg','.wav':'audio/wav','.pdf':'application/pdf','.zip':'application/zip',
          '.txt':'text/plain; charset=utf-8','.csv':'text/csv; charset=utf-8',
        }[extension];
        const headers = { 'content-type':type, 'content-length':file.length, 'cache-control':'public, max-age=31536000, immutable', 'x-content-type-options':'nosniff' };
        if (['.txt','.csv','.zip'].includes(extension)) headers['content-disposition'] = `attachment; filename="${name}"`;
        res.writeHead(200, headers);
        return res.end(req.method === 'HEAD' ? undefined : file);
      }
      if (url.pathname === '/api/health') {
        if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
        return sendJson(res, 200, { status: 'ok' });
      }
      if (url.pathname === '/api/state') {
        if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
        return sendJson(res, 200, Object.fromEntries(readAll.all().map(({ key, value }) => [key, value])));
      }
      const keyMatch = url.pathname.match(/^\/api\/state\/([^/]+)$/);
      if (keyMatch) {
        let key;
        try { key = decodeURIComponent(keyMatch[1]); } catch { return sendJson(res, 400, { error: 'Malformed key' }); }
        if (!isSafeKey(key)) return sendJson(res, 400, { error: 'Invalid state key' });
        if (req.method === 'PUT') {
          if (!isAllowedMutationOrigin(req.headers.origin, req, server)) return sendJson(res, 403, { error: 'Cross-origin state changes are not allowed' });
          const body = await readJson(req);
          if (typeof body.value !== 'string') return sendJson(res, 400, { error: 'value must be a string' });
          putValue.run(key, body.value);
          return sendJson(res, 200, { key, value: body.value });
        }
        if (req.method === 'DELETE') {
          if (!isAllowedMutationOrigin(req.headers.origin, req, server)) return sendJson(res, 403, { error: 'Cross-origin state changes are not allowed' });
          deleteValue.run(key);
          res.writeHead(204, { 'cache-control': 'no-store' });
          return res.end();
        }
        return sendJson(res, 405, { error: 'Method not allowed' });
      }
      if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'API route not found' });
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed' });

      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { return sendJson(res, 400, { error: 'Malformed path' }); }
      if (pathname.includes('\0') || pathname.includes('\\')) return sendJson(res, 400, { error: 'Invalid path' });
      const root = path.resolve(distDir);
      const relative = pathname.replace(/^\/+/, '');
      let file = path.resolve(root, relative || 'index.html');
      if (file !== root && !file.startsWith(root + path.sep)) return sendJson(res, 403, { error: 'Forbidden' });
      try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
      catch { file = path.join(root, 'index.html'); }
      if (!file.startsWith(root + path.sep)) return sendJson(res, 403, { error: 'Forbidden' });
      let data;
      try { data = await readFile(file); }
      catch { return sendJson(res, 404, { error: 'Not found' }); }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'content-length': data.length, 'x-content-type-options': 'nosniff' });
      return res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      const status = error?.status || 500;
      return sendJson(res, status, { error: status === 500 ? 'Internal server error' : error.message });
    }
  });
  server.closeDatabase = () => db.close();
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createAppServer();
  const port = Number(process.env.PORT || 4174);
  server.listen(port, '127.0.0.1', () => console.log(`Teachable replica listening at http://127.0.0.1:${port}`));
  const shutdown = () => server.close(() => { server.closeDatabase(); process.exit(0); });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
