import test from 'node:test';
import assert from 'node:assert/strict';
import { Vec3, Color } from 'playcanvas';
import { DEMO_PRESETS, applyPreset } from '../demo/presets.js';
import { SHOTS, Director } from '../demo/director.js';
import { readFileSync } from 'node:fs';
import { seabedHeight, installBathymetry } from '../demo/bathymetry.js';
const coastMetadata = JSON.parse(readFileSync(new URL('../demo/assets/coast/bathymetry.json', import.meta.url)));
const coastBytes = readFileSync(new URL('../demo/assets/coast/bathymetry.u16', import.meta.url));
installBathymetry(coastMetadata, coastBytes.buffer.slice(coastBytes.byteOffset, coastBytes.byteOffset + coastBytes.byteLength));
import { resolveWaterConfig } from '../src/water/config.js';
import { resolveSkyParams } from '../src/sky/params.js';

function presetHarness() {
    return {
        water: {
            config: resolveWaterConfig({ quality: 'low' }),
            reset(config) { this.config = resolveWaterConfig(config); }
        },
        sky: { params: resolveSkyParams({}), resetParams(params) { this.params = resolveSkyParams(params); } },
        frame: { grading: { tint: new Color() }, bloom: {}, dof: {} }
    };
}
const snapshot = ({ water, sky, frame }) => JSON.stringify({ water: water.config, sky: sky.params, frame });

test('every gallery look is valid and independent of the previously selected look', () => {
    const source = JSON.stringify(DEMO_PRESETS);
    const names = Object.keys(DEMO_PRESETS);
    for (const name of names) {
        const expected = presetHarness();
        applyPreset(expected.water, expected.sky, name, expected.frame);
        for (const previous of names) {
            const actual = presetHarness();
            applyPreset(actual.water, actual.sky, previous, actual.frame);
            applyPreset(actual.water, actual.sky, name, actual.frame);
            assert.equal(snapshot(actual), snapshot(expected), `${previous} → ${name}`);
            assert.equal(actual.water.config.quality, 'low');
        }
    }
    assert.equal(JSON.stringify(DEMO_PRESETS), source);
});

test('gallery shots have unique ids, a valid look and explicit visual intent', () => {
    assert.equal(new Set(SHOTS.map(shot => shot.id)).size, SHOTS.length);
    for (const shot of SHOTS) {
        assert.ok(DEMO_PRESETS[shot.preset], shot.id);
        assert.ok(shot.intent.length > 30, shot.id);
    }
});

test('jump and seek immediately set a repeatable camera pose, and pausing stops camera time', () => {
    const harness = presetHarness();
    const camera = {
        camera: {}, position: new Vec3(), target: new Vec3(),
        setPosition(p) { this.position.copy(p); }, lookAt(p) { this.target.copy(p); }
    };
    const director = new Director({ ...harness, camera, cameraFrame: harness.frame, applyPreset });
    director.go('beneath');
    assert.ok(camera.position.y < 0);
    director.seek(7);
    const pos = camera.position.clone(), target = camera.target.clone();
    director.update(10);
    assert.equal(director.t, 7);
    assert.deepEqual(camera.position, pos);
    assert.deepEqual(camera.target, target);
    director.go('weather');
    director.go('beneath');
    director.seek(7);
    assert.deepEqual(camera.position, pos);
    assert.deepEqual(camera.target, target);
    assert.throws(() => director.go('missing'), RangeError);
    assert.throws(() => director.seek(NaN), TypeError);
});

test('the underwater camera stays submerged and above the actual demo seabed for its whole move', () => {
    const shot = SHOTS.find(s => s.id === 'beneath');
    for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const p = shot.from.map((v, k) => v + (shot.to[k] - v) * t);
        assert.ok(p[1] < -1, `submerged at ${t}`);
        assert.ok(p[1] - seabedHeight(p[0], p[2]) > 1, `bed clearance at ${t}`);
    }
});
