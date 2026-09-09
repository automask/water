import test from 'node:test';
import assert from 'node:assert/strict';
import { Sky, DEFAULT_SKY_PARAMS } from '../src/sky/index.js';
import { resolveSkyParams } from '../src/sky/params.js';
import { sunTransmittanceCPU } from '../src/sky/atmosphere.js';

const EARTH = { rayleigh: 1, mie: 1, ozone: 1 };

const direction = elevation => {
    const r = elevation * Math.PI / 180;
    return [Math.cos(r), Math.sin(r), 0];
};

test('vertical sunlight matches the analytic Earth optical depth', () => {
    const actual = sunTransmittanceCPU([0, 1, 0], EARTH);
    const rayleigh = [5.802e-3, 13.558e-3, 33.1e-3];
    const ozone = [0.650e-3, 1.881e-3, 0.085e-3];
    const column = scaleHeight => scaleHeight * (Math.exp(-0.01 / scaleHeight) - Math.exp(-100 / scaleHeight));
    // Mie extinction is 0.004440/km in the reference Earth atmosphere; it includes scattering.
    const expected = rayleigh.map((s, i) => Math.exp(-s * column(8) - 0.004440 * column(1.2) - ozone[i] * 15));
    actual.forEach((value, i) => assert.ok(Math.abs(value / expected[i] - 1) < 0.0002));
});

test('a clear vacuum transmits all sunlight above the planet, none behind it', () => {
    const vacuum = { rayleigh: 0, mie: 0, ozone: 0 };
    assert.deepEqual(sunTransmittanceCPU(direction(30), vacuum), [1, 1, 1]);
    assert.deepEqual(sunTransmittanceCPU(direction(-10), vacuum), [0, 0, 0]);
});

test('sunset reddens the sun and thicker aerosols reduce direct transmission', () => {
    const high = sunTransmittanceCPU(direction(45), EARTH);
    const low = sunTransmittanceCPU(direction(2), EARTH);
    const hazy = sunTransmittanceCPU(direction(2), { ...EARTH, mie: 5 });
    assert.ok(low[0] / low[2] > high[0] / high[2]);
    low.forEach((v, i) => assert.ok(v > 0 && v < high[i] && hazy[i] < v));
});

test('solar transmission stays finite across the supported atmosphere range', () => {
    for (const elevation of [-90, -0.2, 0, 1, 25, 90]) {
        for (const medium of [EARTH, { rayleigh: 10, mie: 20, ozone: 10 }]) {
            for (const value of sunTransmittanceCPU(direction(elevation), medium)) {
                assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
            }
        }
    }
});

test('unknown, non-finite and unstable sky parameters fail before entering a shader', () => {
    for (const patch of [{ sunIntensity: 18 }, { groundAlbedo: 1 }, { sunElevation: NaN }, { mieG: .8 }, { rayleigh: 1 }, { ozone: 1 }, { haze: -1 }, { exposure: Infinity }]) {
        assert.throws(() => resolveSkyParams(patch));
    }
    assert.equal(resolveSkyParams({ sunAzimuth: 725 }).sunAzimuth, 5);
    assert.equal(resolveSkyParams({ exposure: 0 }).exposure, 0);
    assert.deepEqual(Object.keys(DEFAULT_SKY_PARAMS), ['sunElevation', 'sunAzimuth', 'haze', 'exposure']);
});

test('config updates are atomic and reset restores omitted defaults', () => {
    // Exercise the public configuration boundary without requiring a graphics device.
    const sky = Object.create(Sky.prototype);
    sky._params = resolveSkyParams({ haze: 5, exposure: 2 });
    sky._updateSun = () => {};
    assert.throws(() => sky.setParams({ haze: 2, typo: 1 }));
    assert.equal(sky.params.haze, 5);
    const snapshot = sky.getParams();
    snapshot.haze = 99;
    assert.equal(sky.params.haze, 5);
    assert.throws(() => { sky.params.haze = 99; });
    sky.resetParams({ sunElevation: 2 });
    assert.equal(sky.params.sunElevation, 2);
    assert.equal(sky.params.haze, DEFAULT_SKY_PARAMS.haze);
    assert.equal(sky.params.exposure, DEFAULT_SKY_PARAMS.exposure);
});

test('exposure and solar angle changes avoid unnecessary atmosphere LUT work', () => {
    const sky = Object.create(Sky.prototype);
    sky._params = resolveSkyParams({});
    sky._updateSun = () => {};
    sky._mediumDirty = sky._skyDirty = sky._dirty = false;
    sky.setParams({ exposure: 0.8 });
    assert.equal(sky._mediumDirty, false);
    assert.equal(sky._skyDirty, false);
    assert.equal(sky._dirty, true);
    sky.setParams({ sunElevation: 2 });
    assert.equal(sky._mediumDirty, false);
    assert.equal(sky._skyDirty, true);
    sky.setParams({ haze: 5 });
    assert.equal(sky._mediumDirty, true);
});


test('aerial extinction comes from the atmosphere and scales monotonically with haze', () => {
    const sky = Object.create(Sky.prototype);
    sky._params = resolveSkyParams({ haze: 0 });
    const molecular = sky.aerialDensity;
    sky._params = resolveSkyParams({ haze: 1 });
    const standard = sky.aerialDensity;
    sky._params = resolveSkyParams({ haze: 2 });
    const hazy = sky.aerialDensity;
    assert.ok(molecular > 0 && standard > molecular && hazy > standard);
    assert.ok(Math.abs((standard - molecular) - (hazy - standard)) < 1e-12);
    assert.ok(standard > 0.00001 && standard < 0.00003); // roughly 50–100 km visibility scale
});
