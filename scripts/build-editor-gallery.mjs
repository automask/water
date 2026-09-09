import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';

await build({
    configFile: false,
    base: 'https://marklundin.github.io/water/',
    build: {
        lib: { entry: 'demo/editor/WaterGallery.mjs', formats: ['es'], fileName: () => 'water-gallery.mjs' },
        outDir: 'dist-editor', emptyOutDir: false, minify: false, target: 'esnext',
        rollupOptions: { external: ['playcanvas'] }
    }
});
const path = 'dist-editor/water-gallery.mjs';
let code = await readFile(path, 'utf8');
// The Editor parses attributes from exported class declarations.
code = code.replace('class WaterGallery extends Script', 'export class WaterGallery extends Script');
code = code.replace(/export \{\s*WaterGallery\s*\};?\s*$/, '');
await writeFile(path, code);
