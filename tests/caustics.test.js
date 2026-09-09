import test from 'node:test';
import assert from 'node:assert/strict';
import { StandardMaterial, Vec3, Color } from 'playcanvas';
import { Water } from '../src/water/Water.js';
import { bindCausticWaves } from '../src/water/receiver.js';
import { resolveWaterConfig } from '../src/water/config.js';

test('receiver follows live FFT textures through simulation replacement without a separate clock', () => {
    const parameters = new Map();
    const material = { setParameter: (k, v) => parameters.set(k, v) };
    const config = resolveWaterConfig({ waves: { amplitude: 0.6, choppiness: 0.8 } });
    const simulation = {
        derivativeTextures: [{}, {}, {}, {}], lengthScales: [400, 100, 25, 6.25], params: { size: 256 }
    };
    bindCausticWaves(material, simulation, config);
    assert.equal(parameters.get('uCaustWave0'), simulation.derivativeTextures[2]);
    assert.deepEqual(parameters.get('uCaustWaveSettings'), [0.6, 0.8, 256]);
    const old = parameters.get('uCaustWave0');
    simulation.derivativeTextures = [{}, {}, {}, {}];
    simulation.params.size = 128;
    bindCausticWaves(material, simulation, config);
    assert.notEqual(parameters.get('uCaustWave0'), old);
    assert.equal(parameters.get('uCaustWave0'), simulation.derivativeTextures[2]);
    assert.deepEqual(parameters.get('uCaustWaveSettings'), [0.6, 0.8, 128]);
});

test('receiver attachment is idempotent and restores caller fog chunks on detach', () => {
    const water = Object.assign(Object.create(Water.prototype), {
        _config: resolveWaterConfig(),
        _simulation: { derivativeTextures: [{}, {}, {}, {}], lengthScales: [400, 100, 25, 6.25], params: { size: 256 } },
        _sunDirection: new Vec3(0, 1, 0), _sunColor: new Color(1, 1, 1), _deepWaterMap: {}
    });
    const mat = new StandardMaterial();
    mat.shaderChunks.glsl.set('fogPS', 'original GLSL');
    const detach = Water.prototype.addReceiver.call(water, mat);
    assert.equal(mat.getParameter('uCaustWave0')?.data, water._simulation.derivativeTextures[2], 'new receivers must be drawable before the next Water.update');
    assert.equal(mat.getParameter('uReceiverSky')?.data, water._deepWaterMap);
    assert.equal(Water.prototype.addReceiver.call(water, mat), detach);
    assert.notEqual(mat.shaderChunks.glsl.get('fogPS'), 'original GLSL');
    assert.throws(() => Water.prototype.addReceiver.call({ _assertAlive() {} }, mat), /another water receiver/);
    detach(); detach();
    assert.equal(water._receivers.size, 0);
    assert.equal(mat.shaderChunks.glsl.get('fogPS'), 'original GLSL');
    assert.equal(mat.shaderChunks.wgsl.has('fogPS'), false);
    mat.destroy();
});
