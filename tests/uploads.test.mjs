import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createAppServer} from '../server.mjs';

test('stores images as files, checks types and blocks cross-origin uploads',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'teachable-upload-'));
 const server=await createAppServer({dbPath:path.join(root,'state.sqlite')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 try{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aQWQAAAAASUVORK5CYII=','base64');
  const response=await fetch(origin+'/api/uploads',{method:'POST',headers:{'content-type':'image/png',origin},body:png});
  assert.equal(response.status,201);const saved=await response.json();
  assert.match(saved.url,/^\/uploads\/[a-f0-9]{64}\.png$/);
  const image=await fetch(origin+saved.url);assert.equal(image.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
  assert.equal((await fetch(origin+'/api/uploads',{method:'POST',headers:{'content-type':'image/svg+xml'},body:'<svg/>'})).status,415);
  assert.equal((await fetch(origin+'/api/uploads',{method:'POST',headers:{'content-type':'image/png'},body:'not-an-image'})).status,415);
  assert.equal((await fetch(origin+'/api/uploads',{method:'POST',headers:{'content-type':'image/png',origin:'https://third-party.example'},body:png})).status,403);
  assert.equal((await fetch(origin+'/uploads/no-file.png')).status,404);
 }finally{
  await new Promise(resolve=>server.close(resolve));server.closeDatabase();
  const resolved=path.resolve(root);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('teachable-upload-'));
  await rm(resolved,{recursive:true,force:true});
 }
});
