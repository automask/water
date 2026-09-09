import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';

await build({
    configFile: false,
    build: {
        lib: { entry: 'demo/editor/Adrift.mjs', formats: ['es'], fileName: () => 'adrift-scripts.mjs' },
        outDir: 'dist-editor', emptyOutDir: false, minify: false, target: 'esnext',
        rollupOptions: { external: ['playcanvas'] }
    }
});
const path = 'dist-editor/adrift-scripts.mjs';
let code = await readFile(path, 'utf8');
// Preserve exported class declarations for Editor attribute parsing.
for (const name of ['AdriftCamera', 'AdriftBuoy', 'AdriftTerrain']) code = code.replace(`class ${name} extends Script`, `export class ${name} extends Script`);
code = code.replace(/export \{[\s\S]*?\};?\s*$/, '');
await writeFile(path, code);
