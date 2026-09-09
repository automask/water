# Water + Atmosphere

Real-time water and atmospheric scattering for **PlayCanvas**. An FFT ocean, an independent sky renderer, and nine studies of light above and below the surface.

**[Explore the live demo](https://marklundin.github.io/water/)** · **[Try the sky](https://marklundin.github.io/water/demo/sky.html)** · **[PlayCanvas setup](docs/playcanvas.md)** · **[API guide](docs/api.md)**

![Stillwater — quiet waves and reflected coastal rocks](docs/images/stillwater.jpg)

## Run it locally

```sh
git clone https://github.com/marklundin/water.git
cd water
npm ci
npm run dev
```

Open the URL printed by Vite. Use **Studio** to change wind, swell, clarity, sun, haze, caustics, cinematic effects and quality.

- **← / →** — switch studies
- **Space** — explore / return to the guided camera
- **WASD / QE + drag** — move and look in Explore
- **H** — Studio · **P** — pause the camera

The water keeps moving while the camera is paused. WebGPU is preferred; WebGL2 is supported as a fallback.

## Add it to PlayCanvas

The reusable components are **`waterSurface`** and **`atmosphereSky`**. They use your project's camera and light; the example's coast and cinematic treatment are separate.

1. Download [`water-scripts.mjs`](https://github.com/marklundin/water/raw/refs/heads/main/dist-editor/water-scripts.mjs), or run `npm run build:editor`.
2. Upload it to the Editor's Assets panel and parse its script attributes.
3. Add `atmosphereSky` to an entity and assign your directional light.
4. Add `waterSurface` to another entity and assign your camera and sky entity.
5. Enable HDR/tone mapping in your camera setup. The water component requests the scene colour and depth maps it needs.

See the **[complete Editor guide](docs/playcanvas.md)** for component settings, camera configuration, lifecycle and underwater receiver materials. The **[component demo](https://marklundin.github.io/water/demo/script.html)** shows the wrappers in a minimal application.

## Use the libraries directly

From this checkout, with a running PlayCanvas app and camera:

```js
import { Water } from './src/index.js';
import { Sky } from './src/sky/index.js';

const sky = new Sky(app, { sunElevation: 18, haze: 0.8 });
const water = new Water(app, {
    wind: { speed: 9 },
    volume: { visibility: 16 },
    quality: 'medium'
});

camera.camera.requestSceneColorMap(true);
camera.camera.requestSceneDepthMap(true);
sky.onUpdate = () => water.setEnvironment(sky.environment);
app.on('update', dt => water.update(dt, camera));
```

Use the sky's sun direction and colour for your scene's directional light. With Camera Frame, also enable its scene colour/depth settings. Render in HDR and tone map once. The [API guide](docs/api.md) covers lighting, cleanup, bathymetry, buoyancy and configuration.

Caustics are optional. Call `water.addReceiver(material)` to give a scene-owned `StandardMaterial` the water's underwater attenuation and focused lighting.

## The studies

| Above the surface | Below the surface |
| --- | --- |
| ![Open water](docs/images/open-water.jpg) | ![Wave-driven caustics](docs/images/caustics.jpg) |
| Wind and swell against an open horizon. | Refracted light, fine sediment and depth haze. |

Stillwater · Open water · Glitter path · The turquoise shelf · Beneath the surface · Focused light · Heavy weather · Adrift · Afterglow

## Project structure

| Directory | Responsibility |
| --- | --- |
| `src/water/` | Waves, surface shading, underwater optics and probes |
| `src/sky/` | Atmospheric scattering and sunlight |
| `src/scripts/` | Optional PlayCanvas Script components |
| `demo/` | Scene, study presets, cameras, controls and post effects |
| `art/` | Editable Blender coast and authoring workflow |
| `scripts/coast/` | bpy generation, export and matching depth bake |

The authored coast uses **523k triangles** across terrain and rocks, roughly **69% fewer** than the earlier scene. It reuses the existing scan textures. [Edit and export the Blender scene](art/README.md).

## Build and verify

```sh
npm test                # API, lifecycle, scene and export checks
npm run build:editor    # one uploadable ESM component bundle
npm run build           # static gallery in dist/
npm run preview         # inspect the production build
```

GitHub Pages serves the generated `gh-pages` branch. Maintainers can run `npm run deploy` to rebuild and publish it after verifying changes.

## Scope and credits

This is an experimental renderer and visual study. Reflections have screen-space limits; foam and caustics are approximations. The sky models atmospheric scattering, not cloud volumes. See [the review notes](docs/review.md) for detail.

The bundled rock scans and ground textures are **CC0 assets from Poly Haven**; [asset credits](demo/assets/README.md) list the sources. PlayCanvas and the included decoder dependencies retain their upstream licenses. The separate Saltreach reference is not included in this repository or deployment.
