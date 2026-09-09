import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHeightSampler } from '../demo/bathymetry.js';
const asset = name => readFileSync(new URL(`../demo/assets/coast/${name}`, import.meta.url));
const metadata = JSON.parse(asset('bathymetry.json'));
const bytes = asset('bathymetry.u16');
const sample = createHeightSampler(metadata, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

test('authored coast stays below the previous geometry budget', () => {
    const buffer = asset('coast.glb');
    const json = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString());
    const triangles = json.meshes.flatMap(m => m.primitives).reduce((sum, p) => sum + json.accessors[p.indices].count / 3, 0);
    const budget = JSON.parse(asset('budget.json'));
    assert.equal(triangles, budget.totalTriangles);
    assert.ok(triangles < (budget.previousTerrainTriangles + budget.previousRockTriangles) * 0.4);
    assert.ok(buffer.length < 36 * 1024 * 1024);
    assert.ok(json.materials.some(m => m.name === 'CoastTerrain'));
    const node = json.nodes.find(n => n.name === 'Coast terrain');
    assert.ok(node);
    const primitive = json.meshes[node.mesh].primitives[0];
    assert.ok(primitive.attributes.COLOR_0 !== undefined, 'authored bedrock mask');
    const colors = json.accessors[primitive.attributes.COLOR_0];
    const colorView = json.bufferViews[colors.bufferView];
    const colorOffset = 28 + buffer.readUInt32LE(12) + (colorView.byteOffset || 0) + (colors.byteOffset || 0);
    const colorBytes = colors.componentType === 5121 ? 1 : colors.componentType === 5123 ? 2 : 4;
    const readColor = offset => colors.componentType === 5121 ? buffer[offset] / 255 :
        colors.componentType === 5123 ? buffer.readUInt16LE(offset) / 65535 : buffer.readFloatLE(offset);
    let sediment = 0, rock = 0;
    for (let i = 0; i < colors.count; i++) {
        const value = readColor(colorOffset + i * (colorView.byteStride || colorBytes * 4));
        if (value < .12) sediment++;
        if (value > .86) rock++;
    }
    assert.ok(sediment > colors.count * .2 && rock > 100, 'export the actual mask, not a white fallback COLOR_0');
    const accessor = json.accessors[primitive.attributes.NORMAL];
    const view = json.bufferViews[accessor.bufferView];
    const offset = 28 + buffer.readUInt32LE(12) + (view.byteOffset || 0) + (accessor.byteOffset || 0);
    let up = 0;
    for (let i = 0; i < accessor.count; i++) up += buffer.readFloatLE(offset + i * (view.byteStride || 12) + 4);
    assert.ok(up / accessor.count > .5, 'terrain faces point upward in glTF Y-up space');
});

test('baked seabed agrees with Blender mesh raycasts along the underwater studies', () => {
    for (const point of metadata.checks.filter(p => p.height < 0)) {
        assert.ok(Math.abs(sample(point.x, point.z) - point.height) < .35,
            `mesh clearance at ${point.x},${point.z}`);
    }
    assert.equal(sample(5000, 5000), -50);
    assert.throws(() => createHeightSampler(metadata, new ArrayBuffer(2)), /Invalid/);
});
