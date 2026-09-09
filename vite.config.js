import { defineConfig } from 'vite';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('.', import.meta.url));
const MAX_SHOT_BYTES = 32 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SOURCE_MODELS = join('demo', 'assets', 'models');

/** Runtime URLs inside GLBs and decoder workers cannot be discovered by Vite's import graph. */
function demoAssets() {
    let root = PROJECT_ROOT;
    return {
        name: 'demo-runtime-assets',
        apply: 'build',
        configResolved(config) { root = config.root; },
        async writeBundle(options) {
            const output = resolve(root, options.dir);
            // Keep the unoptimized reference scan in source only, including after incremental builds.
            await rm(join(output, SOURCE_MODELS), { recursive: true, force: true });
            await Promise.all(['assets', 'lib'].map(directory => cp(
                join(root, 'demo', directory), join(output, 'demo', directory), {
                    recursive: true,
                    filter: source => source !== join(root, SOURCE_MODELS)
                }
            )));
        }
    };
}

/**
 * Dev-only: the demo page can POST a PNG/JPEG of its canvas to /__shot?name=… and it lands in
 * renders/. Lets a render be saved from the real WebGPU/WebGL2 browser rather than a headless one.
 */
function shotSaver() {
    let root = PROJECT_ROOT;
    return {
        name: 'shot-saver',
        configResolved(config) { root = config.root; },
        configureServer(server) {
            server.middlewares.use('/__shot', (req, res) => {
                if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
                const url = new URL(req.url, 'http://x');
                const name = (url.searchParams.get('name') || 'shot').replace(/[^a-z0-9_-]/gi, '_').slice(0, 96);
                const ext = (url.searchParams.get('ext') || 'png').toLowerCase();
                if (!['png', 'jpg', 'jpeg'].includes(ext)) {
                    res.statusCode = 415;
                    req.resume();
                    return res.end('Only PNG and JPEG captures are supported.');
                }
                if (Number(req.headers['content-length']) > MAX_SHOT_BYTES) {
                    res.statusCode = 413;
                    req.resume();
                    return res.end('Capture exceeds 32 MiB.');
                }
                const chunks = [];
                let size = 0;
                req.on('data', chunk => {
                    size += chunk.length;
                    if (size > MAX_SHOT_BYTES) {
                        chunks.length = 0;
                        if (!res.writableEnded) { res.statusCode = 413; res.end('Capture exceeds 32 MiB.'); }
                    } else chunks.push(chunk);
                });
                req.on('error', () => { chunks.length = 0; if (!res.writableEnded) { res.statusCode = 400; res.end(); } });
                req.on('end', async () => {
                    if (res.writableEnded) return;
                    const data = Buffer.concat(chunks);
                    const png = data.length >= 8 && data.subarray(0, 8).equals(PNG_SIGNATURE);
                    const jpeg = data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 &&
                        data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9;
                    if (ext === 'png' ? !png : !jpeg) {
                        res.statusCode = 415;
                        return res.end('Capture bytes do not match the requested image format.');
                    }
                    try {
                        const dir = join(root, 'renders');
                        await mkdir(dir, { recursive: true });
                        const file = join(dir, `${name}.${ext}`);
                        await writeFile(file, data);
                        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                        res.end(file);
                    } catch {
                        res.statusCode = 500;
                        res.end('Unable to save capture.');
                    }
                });
            });
        }
    };
}

/** Local recording harness: bounded WebM uploads, never enabled in a production build. */
function reelSaver() {
    return {
        name: 'reel-saver',
        configureServer(server) {
            server.middlewares.use('/__reel', (req, res) => {
                if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
                const name = new URL(req.url, 'http://local').searchParams.get('name');
                if (!/^[0-9]{2}-[a-z-]+$/.test(name || '')) { res.statusCode = 400; req.resume(); return res.end('Invalid clip name'); }
                const chunks = []; let size = 0;
                req.on('data', chunk => {
                    size += chunk.length;
                    if (size <= 64 * 1024 * 1024) chunks.push(chunk);
                    else { chunks.length = 0; if (!res.writableEnded) { res.statusCode = 413; res.end('Clip too large'); } }
                });
                req.on('end', async () => {
                    if (res.writableEnded) return;
                    const data = Buffer.concat(chunks);
                    if (data.length < 4 || data.readUInt32BE(0) !== 0x1a45dfa3) { res.statusCode = 415; return res.end('Expected WebM'); }
                    try {
                        const dir = join(PROJECT_ROOT, 'videos', 'source');
                        await mkdir(dir, { recursive: true });
                        await writeFile(join(dir, `${name}.webm`), data);
                        res.end('Saved');
                    } catch { res.statusCode = 500; res.end('Unable to save recording'); }
                });
                req.on('error', () => { chunks.length = 0; if (!res.writableEnded) { res.statusCode = 400; res.end(); } });
            });
        }
    };
}

export default defineConfig({
    base: process.env.VITE_BASE_PATH || "/",
    plugins: [shotSaver(), reelSaver(), demoAssets()],
    build: {
        rollupOptions: {
            input: { water: join(PROJECT_ROOT, 'index.html'), sky: join(PROJECT_ROOT, 'demo/sky.html'), scripts: join(PROJECT_ROOT, 'demo/script.html') }
        }
    }
});
