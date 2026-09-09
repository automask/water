import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { draco } from '@gltf-transform/functions';
import draco3d from 'draco3d';
import sharp from 'sharp';

// Encode delivery files only. No resizing, mesh simplification, material merging or UV changes.
export async function compressJpeg(bytes, normal = false) {
    const result = await sharp(bytes).jpeg({ quality: normal ? 90 : 88, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer();
    return result.length < bytes.length ? result : bytes;
}

export async function compressCoast(bytes) {
    const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({
        'draco3d.encoder': await draco3d.createEncoderModule()
    });
    const document = await io.readBinary(bytes);
    const normals = new Set(document.getRoot().listMaterials().map(m => m.getNormalTexture()));
    for (const texture of document.getRoot().listTextures()) {
        const image = texture.getImage();
        const metadata = await sharp(image).metadata();
        const preserveAlpha = metadata.hasAlpha && !(await sharp(image).stats()).isOpaque;
        // Retain alpha-bearing PNGs losslessly. Preserve every channel of packed PBR maps.
        const encoded = preserveAlpha
            ? await sharp(image).png({ compressionLevel: 9 }).toBuffer()
            : await compressJpeg(image, normals.has(texture));
        if (encoded.length < image.length) {
            texture.setImage(encoded);
            texture.setMimeType(preserveAlpha ? 'image/png' : 'image/jpeg');
        }
    }
    await document.transform(draco({
        quantizePosition: 18, quantizeNormal: 12, quantizeTexcoord: 16, quantizeColor: 10,
        encodeSpeed: 5, decodeSpeed: 8
    }));
    return io.writeBinary(document);
}

export async function optimizeAssets(directory) {
    let before = 0, after = 0;
    async function visit(folder) {
        for (const entry of await readdir(folder, { withFileTypes: true })) {
            const file = join(folder, entry.name);
            if (entry.isDirectory()) { await visit(file); continue; }
            const bytes = await readFile(file);
            const encoded = entry.name === 'coast.glb' ? await compressCoast(bytes)
                : /\.jpg$/i.test(entry.name) ? await compressJpeg(bytes, /nor_gl/.test(entry.name)) : bytes;
            before += bytes.length; after += encoded.length;
            if (encoded !== bytes) await writeFile(file, encoded);
        }
    }
    await visit(directory);
    console.log(`Delivery assets: ${(before / 1e6).toFixed(2)} → ${(after / 1e6).toFixed(2)} MB (${(100 * (1 - after / before)).toFixed(1)}% smaller)`);
    return { before, after };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await optimizeAssets(resolve('dist/demo/assets'));
}
