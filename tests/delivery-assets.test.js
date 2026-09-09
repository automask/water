import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import draco3d from 'draco3d';
import sharp from 'sharp';
import { compressCoast, compressJpeg } from '../scripts/optimize-assets.mjs';

test('delivery compression preserves coast geometry, material boundaries and bedrock mask', async () => {
    const source = await readFile(new URL('../demo/assets/coast/coast.glb', import.meta.url));
    const encoded = await compressCoast(source);
    assert.ok(encoded.length < source.length * .4, 'coast download budget');
    const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule()
    });
    const original = await io.readBinary(source), decoded = await io.readBinary(encoded);
    const src = original.getRoot(), dst = decoded.getRoot();
    assert.deepEqual(dst.listNodes().map(n => [n.getName(), n.getTranslation(), n.getScale(), n.getRotation()]),
        src.listNodes().map(n => [n.getName(), n.getTranslation(), n.getScale(), n.getRotation()]));
    assert.deepEqual(dst.listMaterials().map(m => m.getName()), src.listMaterials().map(m => m.getName()));
    for (let m = 0; m < src.listMeshes().length; m++) {
        const a = src.listMeshes()[m].listPrimitives(), b = dst.listMeshes()[m].listPrimitives();
        assert.equal(a.length, b.length);
        for (let p = 0; p < a.length; p++) {
            assert.equal(a[p].getIndices().getCount(), b[p].getIndices().getCount(), 'no triangle reduction');
            assert.deepEqual(a[p].listSemantics().sort(), b[p].listSemantics().sort());
            assert.equal(a[p].getMaterial().getName(), b[p].getMaterial().getName());
            for (const edge of ['getMin', 'getMax']) {
                const bounds = a[p].getAttribute('POSITION')[edge]([]), result = b[p].getAttribute('POSITION')[edge]([]);
                result.forEach((v, i) => assert.ok(Math.abs(v - bounds[i]) < .025, 'bounds preserved within 2.5 cm'));
            }
        }
    }
    const terrain = dst.listNodes().find(n => n.getName() === 'Coast terrain').getMesh().listPrimitives()[0];
    const mask = terrain.getAttribute('COLOR_0');
    let sediment = 0, rock = 0;
    for (let i = 0; i < mask.getCount(); i++) {
        const value = mask.getElement(i, [])[0];
        if (value < .12) sediment++;
        if (value > .86) rock++;
    }
    assert.ok(sediment > mask.getCount() * .2 && rock > 100);
    for (let i = 0; i < src.listTextures().length; i++) {
        const a = await sharp(src.listTextures()[i].getImage()).metadata();
        const b = await sharp(dst.listTextures()[i].getImage()).metadata();
        assert.deepEqual([b.width, b.height], [a.width, a.height], 'texture resolution preserved');
    }
});

test('terrain JPEG delivery preserves resolution without chroma subsampling of normals', async () => {
    const bytes = await readFile(new URL('../demo/assets/textures/coast_sand_01/coast_sand_01_nor_gl_2k.jpg', import.meta.url));
    const result = await compressJpeg(bytes, true);
    assert.ok(result.length < bytes.length * .5);
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.width, 2048);
    assert.equal(metadata.height, 2048);
    assert.equal(metadata.chromaSubsampling, '4:4:4');
});
