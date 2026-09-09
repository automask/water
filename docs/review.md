# Rendering and API review

This review separates reusable rendering behaviour from the gallery's art direction. The target is
convincing, varied real-time water imagery with settings that remain understandable outside this
particular coastal scene. Visual polish is evaluated from real browser renders, not inferred from
a successful build.

## What was causing drift

The package root exported gallery presets that accepted a Water, a Sky and a PlayCanvas camera
frame. That made a camera grade and this demo's choice of weather appear to be part of the water
library. Public mutable configuration also let control-panel edits bypass resource invalidation.

The old preset applicator reset a hand-maintained selection of fields before applying a partial
look. Fields outside that list could carry over from the previous example: crest-scattering
colour was one concrete case. Some presets were never used by the sequence; others repeated
similar framing. An underwater shot began in the deeper basin, where little nearby geometry
helped explain scale or transmission.

Several artistic corrections had accumulated inside the renderers: atmospheric gains, an
extra aerosol multiplier, an ocean-specific lower sky hemisphere, reflection-direction
restrictions and highlight-energy compensation. These were implementation decisions affecting
every consumer, rather than explicit choices made by an example.

## Boundary after the changes

| Owner | Responsibility | Excluded responsibilities |
| --- | --- | --- |
| `water` / `src/index.js` | Water, immutable water defaults, shore-map baking | Named looks, camera frames, scene assets, the sky implementation |
| `water/sky` / `src/sky/index.js` | Four-control Earth atmosphere and a named lighting descriptor | Water, camera paths, post processing, artistic molecular overrides |
| `water/scripts` / `src/scripts/index.js` | Optional entity components, camera/light references and lifecycle | Gallery looks, assets and presentation |
| `demo/presets.js` | Complete water, sky and grade combinations | Quality policy, geometry, camera paths |
| `demo/director.js` | Stable study ids, framing, motion, depth of field and visual intent | Simulation and optical implementation |
| `demo/scene.js`, `demo/triplanar.js`, `demo/props.js` | Demo bathymetry, geometry, scanned materials, buoyancy display and terrain effects | Reusable library policy |
| `demo/main.js`, `demo/gui.js` | Scene wiring, application lighting, UI and capture | Hidden mutation of simulation state |

`Water.set()` patches validated configuration; `Water.reset()` starts from the complete defaults.
The gallery resets the full look while retaining its named quality tier. Attached shore maps and
environment textures retain their resource identity. Sky has the corresponding `setParams()` and
`resetParams()` methods.

The second API pass reduces Water to 17 configuration leaves and Sky to four. Wind, swell, wave
shape, roughness, volume colour/visibility, foam and optional caustics describe water; quality is
one of three matched budgets. Spectrum shape constants, FFT cascade layout, shore response,
reflection tracing and refraction coefficients are private implementation choices. Caustics start
disabled. There is no advanced configuration object. The gallery Studio has eight controls—Wind,
Swell, Clarity, Sun, Haze, Caustics, Cinematic and Quality—plus Reset, rather than a generated tree
of every renderer parameter.

`water.setEnvironment(sky.environment)` exchanges a named descriptor with an atlas, optional
linear directional radiance, sun direction/irradiance, exposure and haze density. Other atmosphere
implementations can supply the same descriptor. Optional `WaterScript` and `SkyScript` components
adapt the classes to PlayCanvas entities and own readiness and enable/disable cleanup. Editor
setup and the standalone script bundle are documented in [PlayCanvas integration](playcanvas.md).

The water renderer now validates changes before committing them, schedules only the resource
work those changes require, and rejects a sea-level change that would invalidate an attached
shore map. The map and environment remain caller-owned. Internal simulation, mesh, probe and
foam-texture utilities are no longer package exports.

The sky is independently runnable at `demo/sky.html`. Its four controls are sun elevation, sun
azimuth, haze and exposure. Shared solar lighting replaces hidden per-consumer gains; Earth
molecular scattering, ozone, aerosol phase asymmetry and neutral ground albedo remain fixed.
Its medium uses the corrected aerosol absorption and multiple-scattering phase normalization.
The lower hemisphere represents atmospheric ground, not a baked ocean look. The water changes also address refraction coordinates, optical distance, bounded surface
slopes, near-origin reflection tracing and solar-highlight energy. Caustics redistribute the
transmitted scene lighting instead of adding bright solar radiance regardless of the receiving
material. These are general rendering corrections; gallery-specific colour and exposure choices remain in the demo.

## Atmospheric depth and horizon continuity

A clear-sky model necessarily produces broad gradients, but several sampling choices were also
flattening them. The multiple-scattering lookup previously interpolated sun angles across roughly
3.7 degrees near the horizon and represented near-ground air with altitude intervals over three
kilometres. The revised 64 × 32 lookup concentrates angular samples around sunrise/sunset and
altitude samples in the lowest atmosphere. The first altitude interval is about 100 metres.
Fixed aerosol asymmetry of 0.82 concentrates the forward-scattering aureole while preserving the
Earth model's optical coefficients. The standalone studies use actual sun angle, haze and camera
exposure to reveal daylight, golden light and afterglow; no colour grade manufactures those hues.

The old 512-row lighting equirectangular texture mixed a ground texel into a horizontal ray: its
nearest below-horizontal texel was below the geometric planet horizon. The 1024-row lighting
source resolves that narrow sky band. The visible sky uses a 4096 × 2048 source so the solar disc
survives filtering with a round outline.

Water receives the solar-disc-free directional radiance separately from the filtered reflection
atlas. Aerial perspective can therefore follow the colour in the actual viewing direction without
an artificial upward tilt or a blurred ground/sky mixture. Its extinction is derived from the same
near-surface atmosphere. The finite water mesh's coverage fade is treated separately from optical
extinction: clear air must not become dense fog merely to conceal a resource boundary.

These changes improve the mathematical model and sampling; they do not introduce cloud volumes,
cloud shadows or a general weather simulation. Updated visual acceptance remains a browser task,
separate from the numerical and API regression suite.

## What each example communicates

The gallery has nine studies with separate visual questions. Focused light deliberately looks
towards nearby submerged sand, while Beneath the surface looks towards the light window.

| Study id | Visual question | Evidence to look for |
| --- | --- | --- |
| `stillwater` | Can a near-calm surface retain scale and subtle motion? | Quiet silver-blue water, long reflected rock silhouettes, minimal whitecaps |
| `open-water` | Does the wave field work without scene decoration? | An unobstructed horizon, wind detail over a longer swell, readable distance filtering |
| `golden-hour` | Do atmosphere and surface highlights agree? | Warm low sun, neutral-to-warm troughs, a broken reflection path toward the camera |
| `shallows` | Is depth legible through the water? | A diagonal shore, visible sand, turquoise shallow water and deeper blue farther offshore |
| `beneath` | Is the air/water interface convincing from below? | Nearby sand, absorption, the light window and internal reflection at shallow view angles |
| `caustics` | Does focused sunlight remain convincing on a close receiver? | Thin curved ribbons move across the sand; Studio's Caustics toggle removes them without changing the material or camera |
| `weather` | Can a strong sea show energy without becoming uniformly white? | Distinct offshore crests, localized whitecaps and dark water beneath a hazy horizon; the camera faces away from the coast |
| `adrift` | Are wave motion and scene reflections believable at metre scale? | A continuous buoy structure, draft and tilt, reflected hull colour |
| `blue-hour` | Does atmospheric light remain legible after sunset? | Afterglow from a sun two degrees below the horizon, with violet-blue environment reflections describing the sea; no visible solar disc |

The revised underwater camera path has at least 1.7 metres of clearance above the actual
heightfield before its small camera drift. Its entire path remains below mean sea level. The
hero buoy uses beams connected at measured endpoints, a deck collar and a lantern platform;
previously the tower and lantern visibly floated above their supports. Slender custom torus
geometry supplies metal rings without the inflated appearance of the engine's default torus.

A named study can be selected directly and its camera sought to a repeatable time. Gallery
regressions cover all look-to-look transitions, preservation of quality, stable camera seeking,
valid study ids and the submerged path's clearance. GPU appearance still requires browser
inspection on both supported backends.

## Caustic irradiance approximation

The surface and optional `Water.addReceiver(StandardMaterial)` adapter share the private
GLSL/WGSL chunk in `src/water/shaders/caustics.js`. It samples the two finest **live FFT bands**,
refracts sunlight through their normals, follows a bounded inverse ray map and estimates its
area change. Short-wave curvature dominates shallow caustics; limiting the receiver to two
bands leaves enough texture units for terrain PBR maps and cascaded shadows on WebGL2.

The solar disc and pixel footprint filter the wave field. A regularized determinant bounds
irradiance to 3.5 before strength / lighting weighting, with flat water returning one. There is
no independent cosine pattern, phase or caustic clock. This still approximates multiple paths,
long-wave displacement, refractive occlusion and exact energy conservation.

Opaque receivers preserve their authored material and shadows. Underwater they attenuate both
the incoming sunlight and camera paths with RGB extinction, then integrate a homogeneous
in-scatter term. `volume.visibility` controls the distance response; the demo's existing Clarity
slider adjusts it. Above water, the surface shader handles transmitted-image caustics.

The focused-light study now uses correctly scaled, lower-contrast sand with shallow ripple
normals and oblique framing so distance haze is visible. Whole-frame underwater wobble was not
added: refraction belongs at the rippling boundary, while this homogeneous volume attenuates
and scatters light.

## Saltreach model assessment

The supplied `demo/assets/models/saltreach_src.glb` is a useful authored-coast candidate, but its
source budget is much larger than a portable water example needs:

| Measured source property | Value |
| --- | --- |
| File size | 197.65 MiB |
| Meshes / material groups | 12 / 8 |
| Unique vertices / base triangles | 1,091,337 / 1,444,138 |
| Triangles with all GPU instances before culling | 6,485,417 |
| KTX2 images | 23: four 8192², twelve 4096², seven 2048² |
| Terrain footprint | About 305 × 285 metres |
| Terrain / rock vertical bounds | About −16.3 to +11.9 metres, excluding taller vegetation |
| Source compression | Draco, Basis, GPU instancing |
| Authored LOD chain | None recorded |

The texture set's RGBA8 fallback with complete mip chains would be approximately 2.48 GiB,
excluding meshes and renderer targets. This is a conservative decoded-size estimate, not a
measured GPU allocation; compressed formats can use substantially less memory.

The model contains foliage, wood, soil and rock. Applying a rock-specific shader override to
every material was inappropriate; the optional loader now preserves its authored materials.
The original GLB is preserved as a reference and can be inspected with `?saltreach` in
development only. It is excluded from the production build, and the production page does not
load it through the query flag. The normal gallery uses the compact bpy-authored coast and
trimmed scanned rocks. This keeps the reference asset available without imposing its budget on the
real-time examples or their deployment.

The existing shore map is baked from the authored coast, not Saltreach. Its placement alone does
not validate wave shoaling or shoreline foam against the new model. Promoting it to a complete
example requires terrain-derived bathymetry in the same world coordinates and sea level,
underwater inspection of the match, and a delivery version with camera-appropriate geometry
and texture budgets. Preserve the supplied source separately.

The listed Poly Haven assets have recorded CC0 provenance. Saltreach's provenance is not
recorded in its GLB metadata or this repository; the old blanket CC0 statement has been narrowed
to the documented scanned assets. See [the asset inventory](../demo/assets/README.md).

## Remaining physical and visual limits

- **Wave breaking is approximate.** The FFT is a spectral surface model. Jacobian foam and
  bathymetry-driven surf do not simulate overturning breakers, spray, entrained bubbles or
  shallow-water fluid transport. Strong sea states need scrutiny for folded geometry and foam
  coverage rather than stronger highlights to conceal them.
- **Reflections have screen-space limits.** Geometry outside the camera image cannot appear in
  SSR. A reflected buoy is a useful local test, but it does not establish general offscreen
  reflection accuracy.
- **Caustics are opt-in and approximate.** Live wave normals drive a bounded inverse ray map,
  not a complete multi-path photon simulation. Receiver materials opt in explicitly and retain
  their maps, shadows and lifecycle ownership.
- **The underwater volume is homogeneous.** RGB extinction and a single in-scatter term do not
  model suspended particle volumes, multiple scattering or refractive shadow transport.
  Surface probes support approximate buoyancy rather than exact collision.
- **The sky is an atmosphere, not a weather system.** There are no cloud volumes, cloud shadows,
  moon, stars or lunar ephemeris. Afterglow uses the actual below-horizon sun to study twilight
  scattering, with increased exposure and a nearly neutral grade. It is not a lunar-sky model.
  Heavy weather demonstrates strong wind and atmospheric haze, without claiming storm clouds.
  Solar values are linear scene units rather than calibrated lux.
- **Scene quality sets an upper bound.** The bpy-authored coast now supplies trimmed rock bases, adaptive terrain and a matching depth bake. Materials, terrain silhouette and connected props still need the same
  scrutiny as the water. Loading a multi-million-triangle model cannot replace that review.

## Current browser verification

The follow-up was reviewed in the real browser after API simplification. Studio now has eight
controls with no nested folders. Wind/swell/clarity, sky edits, quality changes and Reset route
through the supported setters. Cinematic and Caustics can be switched off independently.

- WebGPU: Stillwater, Open water, Glitter path, the turquoise shelf, Beneath the surface,
  Focused light, Heavy weather, Adrift and Afterglow.
- WebGL2: the Script wrapper, standalone golden atmosphere, the Adrift focus pass and the
  submerged caustic receiver. Final checks reported no shader errors or warnings.
- Script lifecycle: initial readiness, sky disable/re-enable, and water disable/re-enable.
  Water waits for sky lighting and releases its dependent resources before sky disposal.
- Caustics: the close sand study visibly shows curved moving light bands; the off capture
  removes them. Near-field sand modulation is bounded and submerged sand no longer has an
  exaggerated glossy air/water coating.
- Focus: Adrift keeps the buoy and nearby sea sharp, with defocused foreground and coast.
  Turning Cinematic off restores the sharp scene. This uses a **planar focus proxy**, not exact
  displaced-wave or virtual-reflection depth. The refraction depth buffer remains untouched.

The first Adrift DOF pass exposed a horizontal blur band: its linear seven-metre ramp reached
full blur across only 3.4% of the rendered image height. The CoC shader now uses reciprocal
depth with the same focus tolerance and blur radius, spreading the measured 10–90% transition
across 12.4–12.5%. This was checked from actual GPU mask captures on WebGPU and WebGL2,
including tall framing, using `tests/verify-dof-render.py`. The old capture fails that check;
the corrected captures pass. Composition and the water-depth intersection were continuous.

The cinematic pass was applied after the core API, wrappers and shader checks. It consists of
restrained bloom, grade and vignette, plus focus blur only in the calm buoy close-up. It follows
PlayCanvas's documented [CameraFrame extension points](https://developer.playcanvas.com/user-manual/graphics/posteffects/cameraframe/extending-class/)
and stays entirely in the example application.

The automated suite has **40 passing tests**. The three-page production build and generated
Editor bundle succeed. Package inspection excludes demo assets and includes the uploadable
`dist-editor/water-scripts.mjs`; actual target-Editor upload and attribute parsing are not claimed.
Saltreach remains source-only. Multiple live browser tabs were used during review, so HUD frame
rates are observations rather than a comparable performance benchmark.

Current images are `renders/refined-*.png`, `renders/cinematic-golden.png` and the corrected
`renders/dof-adrift-webgpu.png` / `renders/dof-adrift-webgl2.png`. The review page
`renders/review.html` uses the current captures. Older `review-*.png` files are historical.
Fixed-camera captures reproduce the warm-up pose; the moving wave field can differ by backend.

## Atmosphere reference

The scattering corrections were checked against Hillaire's reference implementation:
[ray-marched sky and multiple scattering](https://github.com/sebh/UnrealEngineSkyAtmosphere/blob/master/Resources/RenderSkyRayMarching.hlsl)
and [Earth atmosphere coefficients](https://github.com/sebh/UnrealEngineSkyAtmosphere/blob/master/Application/SkyAtmosphereCommon.cpp).
The model implemented here is a compact approximation inspired by that work, not a feature-equivalent copy of a full production atmosphere system.

## Gallery quality follow-up

- Stillwater: lower, less exaggerated heightfield relief, muted rock shading, and four compact
  scanned outcrops along the visible eastern headland contour. No new asset download or large
  environment model; the scans reuse loaded meshes and materials.
- Birds: orientation follows the actual 3D flight tangent, distant-only during guided shots,
  and hidden in Explore mode and underwater.
- Layout: title-to-navigation spacing is 20 px; study labels have intrinsic minimum widths and
  horizontal scrolling rather than overlapping on narrower windows.
- Switching: a brief cover holds until the requested sky's asynchronous radiance readbacks and
  three complete rendered frames agree. Stale lighting readbacks cannot overwrite a newer look.
- Heavy Weather: stronger wind/swell, broken whitecaps and low grey light distinguish it
  from blue, sunlit Open Water. Displacement and choppiness are bounded to avoid solid-looking
  folded ridges at the camera.
- Regression tests cover receiver texture replacement/lifecycle, tangent orientation, visibility,
  and rapid transition readiness. GPU inspection covers the wave-driven caustic on/off comparison.

The volume/refraction choices were checked against [Epic's Single Layer Water model](https://dev.epicgames.com/documentation/en-us/unreal-engine/single-layer-water-shading-model-in-unreal-engine)
and [NVIDIA's wave-ray caustic methods](https://developer.nvidia.com/blog/generating-ray-traced-caustic-effects-in-unreal-engine-4-part-2/).
This implementation is a smaller raster approximation, not equivalent to their ray-traced solutions.

## bpy coast delivery

The gallery loads an offline-authored coast, replacing the runtime heightfield and scan placement.
The reproducible bpy recipe trims and caps scan ground skirts, fits terrain collars to their cut
footprints, authors a bedrock/sediment mask, shapes coastal shelves and hollows, and decimates the
result. It reuses the existing scan textures. Smooth terrain coordinate variation and blended
scales reduce visible tiling without introducing more texture samplers.

Bathymetry is raycast from the final evaluated scene. The editable `.blend`, generation command
and separate export-after-editing path are documented in `art/README.md`. These remain demo
assets: neither water nor sky gained scene-specific settings. The baked map is a top-down
height representation and cannot represent caves; rock/terrain contacts overlap below the
visible surface rather than forming one collision solid.

See `demo/assets/coast/budget.json` for measured budgets and the `authored-*` browser captures
for the latest scene. Earlier captures on this page are historical comparisons.
