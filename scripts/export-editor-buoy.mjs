import { AppBase, AppOptions, NullGraphicsDevice, RenderComponentSystem, GltfExporter } from 'playcanvas';
import { createBuoy, material } from '../demo/props.js';
import { mkdir, writeFile } from 'node:fs/promises';
// Bake the existing example prop once, offline. The Editor scene uses this static geometry asset.
const canvas = { width: 1, height: 1, id: 'export', addEventListener() {}, removeEventListener() {} };
const app = new AppBase(canvas), options = new AppOptions();
options.graphicsDevice = new NullGraphicsDevice(canvas);
options.componentSystems = [RenderComponentSystem];
app.init(options);
const mats = {
    hull: material([.6, .1, .05], .42), rust: material([.34, .16, .09], .28),
    steel: material([.4, .42, .44], .55, .6), lamp: material([.85, .88, .9], .8)
};
// Stable, unique names preserve material assignments in the Editor GLB importer.
for (const [name, mat] of Object.entries(mats)) mat.name = `Buoy ${name}`;
const buoy = createBuoy(app.graphicsDevice, 1, mats);
app.root.addChild(buoy);
await mkdir('dist-editor', { recursive: true });
await writeFile('dist-editor/adrift-buoy.glb', Buffer.from(await new GltfExporter().build(buoy)));
console.log('Editor buoy: dist-editor/adrift-buoy.glb');
