# Water + Sky

Two independent PlayCanvas renderers: an FFT water surface and an Earth atmosphere. The gallery combines them into nine studies; its scenes, camera direction and presentation stay outside the libraries.

```sh
npm install
npm run dev
npm test
npm run build
```

Open `/` for water or `/demo/sky.html` for the standalone sky. Both pages and the lightweight gallery assets are included in the production build. The original Saltreach reference model is excluded.

The gallery's Studio has eight controls: **Wind, Swell, Clarity, Sun, Haze, Caustics, Cinematic and Quality**. There is no advanced parameter panel. Arrow keys select a study, Space switches to free flight, H opens Studio, and P pauses the camera. WASD/QE and drag control free flight. The sea keeps moving when the camera is paused.

| Study | What to look for |
| --- | --- |
| Stillwater | Quiet surface and long reflected silhouettes |
| Open water | Wind waves and long swell against an open horizon |
| Glitter path | Low atmospheric sun and a broken reflection path |
| The turquoise shelf | Depth-dependent transmission, sand and surf |
| Beneath the surface | Snell's window, internal reflection and absorption |
| Focused light | Moving caustic ribbons on nearby sand; toggle Caustics to compare |
| Heavy weather | Large offshore crests and localized whitecaps |
| Adrift | Metre-scale buoyancy and coloured scene reflections |
| Afterglow | Atmospheric illumination after sunset |

## Use the renderers

```js
import { Water, bakeShoreMap } from 'water';
import { Sky } from 'water/sky';
// In this checkout: './src/index.js' and './src/sky/index.js'.

const sky = new Sky(app, { sunElevation: 12, haze: 0.8 });
const water = new Water(app, {
    wind: { speed: 12, direction: 40 },
    volume: { visibility: 20 },
    quality: 'medium'
});

cameraEntity.camera.requestSceneColorMap(true);
cameraEntity.camera.requestSceneDepthMap(true);

// Subscribe before the first app frame; GPU environment creation is deferred.
sky.onUpdate = () => {
    water.setEnvironment(sky.environment);
    // Also update your directional light from sky.getSunDirection()/getSunColor().
};
const updateWater = dt => water.update(dt, cameraEntity);
app.on('update', updateWater);
```

The camera needs scene colour and depth for transmission and screen-space reflection. With PlayCanvas CameraFrame, enable `frame.rendering.sceneColorMap` and `sceneDepthMap`. Render to HDR and tone map once in the camera. Scene geometry, directional lights and post processing belong to the application.

### Water configuration

The public configuration has **17 leaves**, counting the RGB colour as one value:

```js
const settings = {
    seaLevel: 0,
    quality: 'medium',
    wind: { speed: 9, direction: 35 },
    swell: { strength: 0.6, direction: -20 },
    waves: { amplitude: 1, choppiness: 1.4 },
    roughness: 0.06,
    volume: { color: [0.003, 0.075, 0.11], visibility: 10 },
    foam: 1,
    caustics: { enabled: false, strength: 1, scale: 0.2 },
    seed: 1337,
    timeScale: 1
};
```

Distances are metres, wind speed is metres per second, headings are degrees, and colour is linear RGB. `volume.visibility` is the approximate green-channel 1/e attenuation distance. Caustics are **off by default** and explicitly opt in with `caustics.enabled`. `timeScale: 0` pauses the simulation.

Caustics follow the two finest live FFT wave bands. Inverse refraction and the ray-map area change produce moving light concentrations, filtered for the solar disc and pixel footprint. There is no separate ripple clock. This is a bounded approximation, not a multi-path photon trace. `caustics.scale` controls the inverse filtering footprint rather than an independent pattern frequency.

Opaque scene materials can opt into the same caustics and underwater volume:

```js
const detach = water.addReceiver(seabedMaterial); // opaque PlayCanvas StandardMaterial
water.set({ volume: { visibility: 14 }, caustics: { enabled: true } });
// Before disposing the material:
detach();
```

Receivers use RGB attenuation over the sunlight and viewing paths, and distance-dependent in-scattering. The existing `volume.visibility` / Studio **Clarity** control governs underwater haze too. The adapter reserves the material's `fogPS` chunks and three texture samplers while attached, preserving its PBR maps and shadows. A material can belong to one Water instance; repeated attachment to the same instance is idempotent. Detach restores the previous fog chunks; Water destruction also detaches receivers. Above-water caustics remain in the water surface's transmitted-image shading.

```js
water.set({ wind: { speed: 18 } });       // patch the sea state
water.set({ volume: { visibility: 25 } });
water.set({ caustics: { enabled: true } });
water.reset({ wind: { speed: 3 }, quality: water.config.quality });
```

`water.config` and `WATER_DEFAULTS` are deeply frozen. Setters reject unknown or invalid fields atomically. `reset()` uses defaults for every omitted field; assigned environment and shore textures remain attached. A no-op patch does no work.

Quality is one matched simulation, mesh and reflection budget: `low` uses a 128 FFT, `medium` a 256 FFT, and `high` a 512 FFT. Changes rebuild affected resources on the next update. Spectrum parameters, cascade layout, shore-response constants, reflection tracing and refraction tuning are implementation details, not an additional configuration API. Field bounds and units are in [`src/water/config.js`](../src/water/config.js).

### Environment and ownership

`setEnvironment()` accepts one named descriptor; Water has no dependency on Sky:

```js
water.setEnvironment({
    atlas,                 // PlayCanvas prefiltered RGBP environment
    sunDirection,          // Vec3, towards the sun
    sunColor,              // Color, linear irradiance including exposure
    radiance,              // optional linear equirectangular sky without the solar disc
    exposure: 1,           // scale for atlas and radiance
    hazeDensity: 0.00002    // atmospheric extinction in inverse metres; omitted means clear air
});
```

`sky.environment` supplies these values together. Water samples directional sky radiance for aerial perspective; the filtered atlas remains its reflection source. Resource-edge coverage and atmospheric extinction are separate concerns. The application owns all supplied textures and must release Water's use of them before destroying their owner.

### Coast and buoyancy

```js
const shore = bakeShoreMap(app.graphicsDevice, {
    origin: [-700, -700], size: [1600, 1600],
    heightAt: (x, z) => seabedHeight(x, z),
    seaLevel: water.seaLevel, maxDepth: 36, resolution: 512
});
water.setShoreMap(shore);
const { position, normal } = water.getSurfaceAt(x, z);
boat.setPosition(x, position.y - draft, z);
```

Use the same height function for geometry and bathymetry. `setShoreMap(null)` returns to open ocean. Detach and rebake the map before changing sea level. Shore response is derived from the map without a separate family of public surf controls.

Surface queries use asynchronous GPU readback at most once every three frames. New queries initially return sea level; returned vectors are borrowed and change in place. They include FFT displacement but omit visual shoaling and mesh-distance filtering. They support approximate buoyancy, not exact collision. At most 256 query positions are retained.

```js
app.off('update', updateWater);
water.destroy();
shore.destroy();
sky.destroy();
```

## Independent atmosphere

Sky has **four parameters**:

| Parameter | Default | Meaning |
| --- | --- | --- |
| `sunElevation` | `25` | Degrees above the horizon; negative values produce twilight |
| `sunAzimuth` | `165` | Heading in degrees; 0 is +Z, 90 is +X |
| `haze` | `1` | Aerosol density relative to the Earth reference atmosphere |
| `exposure` | `0.55` | Common scale for sky radiance and direct sunlight |

```js
const sky = new Sky(app, { sunElevation: 3.2, haze: 1.4 });
sky.setParams({ sunElevation: -2, exposure: 3.2 });
sky.resetParams({ sunElevation: 35 });
const copy = sky.getParams(); // sky.params is immutable
```

Rayleigh scattering, ozone, aerosol phase asymmetry, solar irradiance and neutral ground reflectance are fixed parts of the Earth model. There are no independent sky tint or sun-disc intensity controls. Values are linear scene units rather than calibrated lux.

The atmosphere uses transmittance and approximate multiple-scattering LUTs. Extra samples near the ground and near twilight angles resolve the rapid changes there. The visible sky includes the solar disc; environment radiance excludes it so direct lighting can supply the sun once. `sky.aerialDensity` derives near-surface extinction from the same atmosphere.

`sky.ready` becomes true after the first GPU build. `onUpdate(sky)` fires then and after changes. Sun edits reuse the medium LUTs; exposure-only edits reuse all textures. Pass `{ attachToScene: false }` as the third constructor argument to manage scene assignment yourself. Sky creates no camera, water, geometry, directional light or grade. See [`demo/sky-main.js`](../demo/sky-main.js) for standalone wiring.

## Cinematic presentation

Studio's **Cinematic** switch controls demo bloom, the restrained grade and vignette. Adrift also
uses foreground/background depth of field focused on the buoy. Wide seascapes remain in focus.
The demo camera's CoC pass uses a flat-water focus approximation only for that calm close-up;
blur grows with reciprocal depth so the sea falls out of focus gradually toward the horizon.
It never modifies the opaque depth texture used by Water's refraction. The approximation does
not describe wave crests or virtual reflection depth. These effects live in the demo, not in
Water, Sky or the Editor wrappers. Use `?cinematic=off` for an unprocessed comparison.

## PlayCanvas Script components

Optional components are exported from `water/scripts`:

```js
import { WaterScript, SkyScript } from 'water/scripts';
```

`WaterScript` connects a camera and lighting to a water surface; `SkyScript` manages the independent atmosphere and an optional directional light. Their lifecycle handles readiness, disable/enable and cleanup. Generate the Editor asset with `npm run build:editor`; the output is `dist-editor/water-scripts.mjs`. Follow [`docs/playcanvas.md`](../docs/playcanvas.md) for registration and Editor setup. The core classes remain usable without these wrappers.

## Reproducible review

- `?shot=golden-hour&still` fixes the camera at 35% of a named path and uses a fixed simulation step. `blue-hour` selects Afterglow.
- `?shot=caustics&still` selects Focused light, a submerged view towards the sand. Toggle Caustics in Studio to compare the same receiver.
- `?gfx=webgl2` or `?gfx=webgpu` requests a backend; the default prefers WebGPU.
- `?size=128|256|512` selects the corresponding quality tier. `?mesh=low` also selects the low tier.
- `?capture=my-render&still` saves a PNG after 90 rendered frames during development. Capture saves the current frame; production downloads it.
- `?caustics=off` disables caustics for a fixed-camera comparison.
- In development, `?shot=adrift&still&dof-mask&capture=dof-mask` captures the actual GPU focus mask. Run `python3 tests/verify-dof-render.py renders/dof-mask.png` (requires Pillow) to check its transition and subject focus; repeat with `&gfx=webgl2` for the fallback.
- `?clean` hides the gallery overlay.
- `?saltreach` inspects the original coast model in development only. It is excluded from production.

The fixed warm-up capture is the repeatable reference. A later manual capture records a different simulation time. Test GPU appearance in a real browser on both backends; a JavaScript build does not compile the shaders. Saved earlier review images and the current verification status are described in [`docs/review.md`](../docs/review.md).

## Source boundaries and migration

```
src/index.js              water public entry
src/water/                compact configuration, surface, FFT, probes and shore maps
src/sky/index.js          independent atmosphere public entry
src/sky/                  Earth atmosphere integration and lifecycle
src/scripts/index.js      optional PlayCanvas Script wrappers
scripts/build-editor.js   standalone Editor asset build
demo/presets.js           complete gallery water + sky + camera looks
demo/director.js          nine camera studies and their visual intent
demo/scene.js             authored coast loading and props
demo/bathymetry.js        samples the Blender-baked depth data
art/coast.blend           editable gallery coast
scripts/coast/           bpy generation, export and depth baking
demo/triplanar.js         demo terrain material effects
demo/main.js, gui.js      application wiring and the eight-control Studio
demo/CinematicFrame.js    optional demo focus correction and camera integration
demo/sky.html             standalone atmosphere example
tests/                    API, ownership, integration and rendering-code regressions
```

Previous nested spectrum/material controls are intentionally unsupported. Use `wind`, `swell`, `waves`, `roughness`, `volume`, `foam` and quality tiers; there is no advanced escape-hatch object. Replace positional environment arguments with `water.setEnvironment(sky.environment)`. Sky's former `mie` maps to `haze`; when migrating old looks, multiply their exposure by `sunIntensity / 18` and remove the old molecular, ozone, phase and ground overrides.

Named looks stay in `demo/presets.js`; the package has no gallery preset or camera-frame dependency. SSR cannot reflect offscreen geometry, surf and wave-driven caustics are approximations, and the sky has no cloud volumes, moon or stars. See the [review and model assessment](../docs/review.md) for the remaining limits.

The gallery coast is authored with bpy and kept separate from the libraries. See [the coast authoring workflow](../art/README.md) to regenerate it or export Blender edits with matching bathymetry.
