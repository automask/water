import test from 'node:test';
import assert from 'node:assert/strict';
import { Vec3, Color, NullGraphicsDevice } from 'playcanvas';
import { Water, WATER_DEFAULTS } from '../src/index.js';
import { resolveWaterConfig } from '../src/water/config.js';
import { bakeShoreMap, validateShoreMap } from '../src/water/shoreMap.js';
import { WaveProbe } from '../src/water/WaveProbe.js';

// GPU allocation/rendering is exercised by the browser demo. These tests isolate public state
// transitions so rebuild decisions and validation can be checked without a graphics device.
function waterHarness(config = {}) {
    const water = Object.create(Water.prototype);
    water._config = resolveWaterConfig(config);
    water._destroyed = false;
    water._shoreMap = null;
    water._rebuildSim = false;
    water._rebuildMesh = false;
    water._sunDirection = new Vec3(0, 1, 0);
    water._sunColor = new Color(1, 1, 1);
    water._hazeDensity = 0;
    water._environmentExposure = 1;
    water._cascadeData = new Float32Array(16);
    const calls = { spectrum: 0, probe: 0, rebuild: 0, uniforms: new Map() };
    water._simulation = {
        params: water._simParams(), time: 0,
        displacementTextures: [{}, {}, {}, {}], derivativeTextures: [{}, {}, {}, {}], lengthScales: [1024, 256, 48, 8],
        update(dt) { this.time += Math.min(dt, 1 / 15) * this.params.timeScale; },
        invalidateSpectrum() { calls.spectrum++; },
        rebuild(params) { this.params = params; calls.rebuild++; }
    };
    water._builtMeshParams = water._meshParams();
    water._meshInstance = { mesh: {} };
    water._probe = { rebuild() { calls.probe++; }, update() {} };
    water._entity = { setPosition() {} };
    water._material = { setParameter(key, value) { calls.uniforms.set(key, value); } };
    water._deepWaterMap = {};
    return { water, calls };
}

test('package root exposes only supported water primitives', async () => {
    assert.deepEqual(Object.keys(await import('water')).sort(), ['WATER_DEFAULTS', 'Water', 'bakeShoreMap']);
    await assert.rejects(import('water/src/water/WaveSimulation.js'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
});

test('partial configuration resolves defaults without retaining mutable input', () => {
    const patch = { volume: { color: [0.4, 0.2, 0.1] }, wind: { speed: 12 } };
    const config = resolveWaterConfig(patch);
    patch.volume.color[0] = 8;
    assert.deepEqual(config.volume.color, [0.4, 0.2, 0.1]);
    assert.equal(config.wind.direction, WATER_DEFAULTS.wind.direction);
    assert.equal(config.wind.speed, 12);
    assert.throws(() => { config.wind.speed = 2; }, TypeError);
    assert.throws(() => { WATER_DEFAULTS.volume.color.push(2); }, TypeError);
});

test('public defaults contain only 17 meaningful controls, with no advanced escape hatch', () => {
    const leaves = value => Object.values(value).reduce((n, v) => n + (typeof v === 'object' && !Array.isArray(v) ? leaves(v) : 1), 0);
    assert.equal(leaves(WATER_DEFAULTS), 17);
    assert.throws(() => resolveWaterConfig({ advanced: {} }), /unknown configuration/);
    assert.throws(() => resolveWaterConfig({ reflections: {} }), /unknown configuration/);
});

test('invalid patches fail atomically before any state or GPU transitions', () => {
    const { water, calls } = waterHarness();
    const original = water.config;
    for (const patch of [
        { waves: null }, { wind: { velocity: 10 } },
        { quality: { resolution: 300 } }, { quality: 'ultra' },
        { volume: { color: [1, 2] } }, { volume: { color: ['1', 0.2, 0.3] } },
        { volume: { color: Array(3) } }, { volume: { visibility: 0 } },
        { waves: { amplitude: NaN } }, { wind: { speed: -1 } },
        { wind: { direction: Infinity } }, { waves: { choppiness: 3 } },
        { caustics: { enabled: 1 } }, { caustics: { scale: 0 } }, { seed: 0.5 },
        { foam: { strength: 1 } },
        JSON.parse('{"__proto__":{"polluted":true}}')
    ]) {
        assert.throws(() => water.set(patch));
        assert.equal(water.config, original);
    }
    assert.equal(calls.spectrum, 0);
    assert.equal(calls.probe, 0);
    assert.equal({}.polluted, undefined);
});

test('identical patches and resets preserve config identity and avoid work', () => {
    const { water, calls } = waterHarness();
    const original = water.config;
    assert.equal(water.set({ wind: { speed: 9, direction: 395 } }), water);
    assert.equal(water.reset(), water);
    assert.equal(water.config, original);
    assert.equal(calls.spectrum, 0);
    assert.equal(calls.probe, 0);
});

test('render and evolution controls do not regenerate the initial spectrum', () => {
    const { water, calls } = waterHarness();
    water.set({ waves: { amplitude: 0.7, choppiness: 1.8 }, timeScale: 0, volume: { visibility: 20 } });
    assert.equal(calls.spectrum, 0);
    assert.equal(water._simulation.params.choppiness, 1.8);
    assert.equal(water._simulation.params.timeScale, 0);
    water.set({ wind: { direction: 75 } });
    assert.equal(calls.spectrum, 1);
    assert.equal(water._simulation.params.wind.windDirection, 75);
});

test('reset removes previous style settings and permits explicit quality preservation', () => {
    const { water } = waterHarness({ quality: 'low' });
    water.set({ volume: { color: [0.5, 0.2, 0.3] }, foam: 0.5, caustics: { enabled: true } });
    water.reset({ quality: water.config.quality, wind: { speed: 5 } });
    assert.equal(water.config.quality, 'low');
    assert.deepEqual(water.config.volume.color, WATER_DEFAULTS.volume.color);
    assert.equal(water.config.foam, WATER_DEFAULTS.foam);
    assert.equal(water.config.caustics.enabled, false);
});

test('resource rebuilds are deferred, coalesce and cancel when topology is restored', () => {
    const { water, calls } = waterHarness();
    water.set({ quality: 'high' });
    assert.equal(calls.rebuild, 0);
    assert.equal(water._simulation.params.size, 256);
    assert.equal(water._rebuildSim, true);
    assert.equal(water._rebuildMesh, true);
    water.set({ quality: 'medium' });
    assert.equal(water._rebuildSim, false);
    assert.equal(water._rebuildMesh, false);
    water.set({ quality: 'low', wind: { speed: 15 } });
    water._device = new NullGraphicsDevice({ width: 1, height: 1 });
    let oldMeshDestroyed = false;
    water._mesh = { destroy() { oldMeshDestroyed = true; } };
    water._applyPendingRebuilds();
    assert.equal(calls.rebuild, 1);
    assert.equal(water._simulation.params.wind.windSpeed, 15);
    assert.equal(water._rebuildSim, false);
    assert.equal(water._rebuildMesh, false);
    assert.equal(oldMeshDestroyed, true);
    water._mesh.destroy();
    water._device.destroy();
});

test('caustics disable is effective while optical distance remains physical', () => {
    const { water, calls } = waterHarness({ caustics: { enabled: false, strength: 3 }, volume: { visibility: 20 }, timeScale: 0 });
    const camera = { getPosition: () => new Vec3(0, 3, 0) };
    water.update(0.1, camera);
    assert.equal(calls.uniforms.get('uCausticsParams')[0], 0);
    assert.deepEqual(calls.uniforms.get('uExtinction'), [0.16, 0.05, 0.03]);
    assert.equal(water.time, 0);
    water.set({ caustics: { enabled: true } });
    water.update(0, camera);
    assert.equal(calls.uniforms.get('uCausticsParams')[0], 3);
    water.set({ wind: { speed: 0 }, swell: { strength: 0 } });
    assert.equal(water._simulation.params.wind.scale, 0);
    assert.equal(water._simulation.params.swell.scale, 0);
});

test('shore maps retain caller ownership and cannot silently drift from sea level', () => {
    const { water } = waterHarness();
    const map = { texture: {}, origin: [-10, -10], size: [20, 20], maxDepth: 40, seaLevel: 0 };
    const original = water.config;
    water.setShoreMap(map);
    assert.equal(water.config, original);
    assert.throws(() => water.set({ seaLevel: 1 }), /detach the shore map/);
    assert.equal(water.seaLevel, 0);
    assert.throws(() => water.setShoreMap({ ...map, seaLevel: 10 }), /seaLevel/);
    assert.equal(water._shoreMap, map);
    water.setShoreMap(null).set({ seaLevel: 1 });
    assert.equal(water.seaLevel, 1);
    assert.throws(() => validateShoreMap({ ...map, destroyed: true }, 0), /live shore map/);
    assert.throws(() => bakeShoreMap({}, { origin: [0, 0], size: [1, 0], heightAt: () => 0 }), /size/);
    assert.throws(() => bakeShoreMap({}, { origin: [0, 0], size: [1, 1], resolution: 2, heightAt: () => NaN }), /heightAt/);
});

test('environment assignment validates before mutation and copies the light', () => {
    const { water } = waterHarness();
    const atlas = {}, direction = new Vec3(0, 2, 0), color = new Color(4, 2, 1);
    water.setEnvironment({ atlas, sunDirection: direction, sunColor: color, hazeDensity: 0.00002, exposure: 0.5 });
    direction.set(1, 0, 0);
    color.set(0, 0, 0);
    assert.deepEqual(water.sunDirection, new Vec3(0, 1, 0));
    assert.deepEqual(water.sunColor, new Color(4, 2, 1));
    assert.throws(() => water.setEnvironment({ atlas, sunDirection: new Vec3(), sunColor: new Color() }), /non-zero/);
    assert.throws(() => water.setEnvironment({ atlas, sunDirection: new Vec3(0, 1, 0), sunColor: new Color(), hazeDensity: -1 }), /non-negative/);
    assert.equal(water._envAtlas, atlas);
    assert.equal(water._hazeDensity, 0.00002);
    assert.equal(water._environmentExposure, 0.5);
});

test('probe preserves requested XZ and never publishes a recycled slot', () => {
    const probe = Object.create(WaveProbe.prototype);
    const entry = { slot: 0, lastUsed: 0, result: { position: new Vec3(0, 3, 0), normal: new Vec3(0, 1, 0) } };
    probe.entries = new Map([['0:0', entry]]);
    probe.queryData = new Float32Array(4);
    probe.resultData = new Float32Array([6, 0, 0, 0]);
    probe.frame = 1;
    probe._generation = 0;
    probe.water = { seaLevel: 2 };
    assert.equal(probe.sample(0.1, 0.05).position.x, 0.1);
    assert.equal(entry.result.position.z, 0.05);
    probe.rebuild();
    assert.equal(entry.result.position.y, 2);
    assert.equal(probe._generation, 1);
    probe.resultData[0] = 6;
    const stale = { ...entry, result: { position: new Vec3(), normal: new Vec3() } };
    probe._publish([['0:0', stale]]);
    assert.equal(stale.result.position.y, 0);
    probe._publish([['0:0', entry]]);
    assert.equal(entry.result.position.y, 6);
});

test('destroy is idempotent and leaves external resources alive', () => {
    const { water } = waterHarness();
    let destroyed = 0;
    for (const key of ['_probe', '_entity', '_foamTexture', '_deepWaterMap', '_simulation', '_mesh', '_material']) {
        water[key] = { destroy() { destroyed++; } };
    }
    water._shoreMap = water._envAtlas = { destroy() { throw new Error('external resource destroyed'); } };
    water.destroy();
    water.destroy();
    assert.equal(destroyed, 7);
    assert.throws(() => water.set({}), /destroyed/);
    assert.throws(() => water.getHeightAt(0, 0), /destroyed/);
});
