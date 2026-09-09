import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { EventEmitter } from 'node:events';
import viteConfig from '../vite.config.js';

test('production copies runtime assets while preserving the source-only reference scan', async t => {
    const root = await mkdtemp(join(tmpdir(), 'water-assets-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const paths = ['assets/coast/coast.glb', 'assets/coast/bathymetry.u16', 'assets/textures/sand/image.jpg', 'lib/draco/draco.wasm.wasm'];
    const reference = 'assets/models/saltreach_src.glb';
    const sourceScan = 'assets/models/coast_rocks_01.glb';
    for (const path of [...paths, reference, sourceScan]) {
        const file = join(root, 'demo', path);
        await mkdir(join(file, '..'), { recursive: true });
        await writeFile(file, path);
    }
    const plugin = viteConfig.plugins.find(p => p.name === 'demo-runtime-assets');
    plugin.configResolved({ root });
    await mkdir(join(root, 'custom-build/demo/assets/models'), { recursive: true });
    await writeFile(join(root, 'custom-build/demo', reference), 'stale artifact from an earlier build');
    await plugin.writeBundle({ dir: 'custom-build' });
    for (const path of paths) assert.equal(await readFile(join(root, 'custom-build/demo', path), 'utf8'), path);
    await assert.rejects(readFile(join(root, 'custom-build/demo', reference)), { code: 'ENOENT' });
    assert.equal(await readFile(join(root, 'demo', reference), 'utf8'), reference);
    await assert.rejects(readFile(join(root, 'custom-build/demo', sourceScan)), { code: 'ENOENT' });
    assert.equal(await readFile(join(root, 'demo', sourceScan), 'utf8'), sourceScan);
});

test('capture endpoint saves images and rejects mismatched formats and excessive size', async t => {
    const root = await mkdtemp(join(tmpdir(), 'water-capture-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const plugin = viteConfig.plugins.find(p => p.name === 'shot-saver');
    plugin.configResolved({ root });
    let handler;
    plugin.configureServer({ middlewares: { use(path, fn) { assert.equal(path, '/__shot'); handler = fn; } } });
    const server = createServer(handler);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}/__shot`;
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHioAAAAASUVORK5CYII=', 'base64');
    const saved = await fetch(`${base}?name=valid&ext=png`, { method: 'POST', body: png });
    assert.equal(saved.status, 200);
    assert.deepEqual(await readFile(join(root, 'renders/valid.png')), png);
    assert.equal((await fetch(`${base}?ext=js`, { method: 'POST', body: png })).status, 415);
    assert.equal((await fetch(`${base}?ext=jpg`, { method: 'POST', body: png })).status, 415);
    assert.equal((await fetch(base, { method: 'POST', body: 'not an image' })).status, 415);
    assert.equal((await fetch(base)).status, 405);
    assert.deepEqual(await readdir(join(root, 'renders')), ['valid.png']);
    const request = Object.assign(new EventEmitter(), {
        method: 'POST', url: '/', headers: { 'content-length': 32 * 1024 * 1024 + 1 }, resume() {}
    });
    const response = { statusCode: 0, end() {} };
    handler(request, response);
    assert.equal(response.statusCode, 413);
});
