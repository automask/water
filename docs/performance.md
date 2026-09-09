# Performance measurement

Use `?shot=adrift&still&profile=auto` for an automatic comparison, or `&profile`
to start it with a button. Add `&gfx=webgl2` or `&gfx=webgpu` to compare backends.
GPU timestamp collection is **off by default** because it can perturb frame rate.
Add `&profile-gpu` only for a separate diagnostic run; compare its baseline against
a run without GPU timing before trusting those numbers.
The URL otherwise uses the same backend selection as the normal demo.

The camera is held still; waves and floaters keep moving except in the explicit
FFT-frozen comparison. Each case restores the original configuration first.
The first case warms up for 10 seconds, subsequent cases for 4 seconds, followed
by 8 seconds of measurement. Hidden-tab samples are discarded. A baseline repeat
flags a difference greater than 20%; cold shaders, temperature, power mode,
background GPU work and browser scheduling can all invalidate comparisons.
Keep other rendering applications idle. Compare several runs on the same device,
orientation and browser. Do not extrapolate desktop FPS to a phone.

The seven ablations are diagnostic interventions, not recommended visual settings:

- Pixel ratio 1 changes render resolution while preserving CSS dimensions.
- MSAA 1 removes multisampling while retaining HDR and effects.
- Post effects off retains HDR/tone mapping and water's colour/depth grabs.
- FFT frozen retains the wave textures but skips simulation updates. Buoy probes
  still run. This uses a private implementation hook confined to the profiler.
- Low water quality changes FFT resolution, tessellation and reflection steps
  together; it cannot isolate the cost of any one of those three.
- Scene geometry off hides opaque render components, retaining water and sky.
  It also removes their shadows and changes the inputs to screen-space reflections.
- Shadows off retains the scene geometry and material shading.

CPU timing spans application update and render submission; it is not GPU time.
GPU timer availability depends on the browser/device. On WebGL, the engine's
`GpuFrame` timer starts at render, so it **excludes FFT commands issued during
update**. WebGPU exposes pass timings, which can lag and overlap. Do not add CPU
and GPU times or assume all GPU timings describe the same displayed frame.
Graphics memory is the engine's allocation estimate, not physical device memory
usage; some driver/renderbuffer costs are not included. Results remain on-device
until the user downloads and shares the report.

## Initial desktop investigation, 9 September 2026

The first WebGL2 Adrift run on the desktop in-app browser was **not stable**:
initial baseline 3.8 fps, final baseline 12.6 fps. Those results are unsuitable for
claiming a speedup or diagnosing the reported 23 fps on a phone. They motivated the
longer warm-up and baseline-drift warning. Main-thread samples were around 1–3 ms,
and the engine estimated about 552 MiB of graphics allocations at 2560×1440.
These are desktop observations, not measurements of the user's phone.

The code currently requests up to pixel ratio 2 and 4× MSAA for the web gallery.
The Editor Adrift camera uses 1× MSAA, so gallery MSAA conclusions must not be
applied to that scene. Medium water uses four 256² FFT cascades. The WebGL path
submits 72 simulation passes per frame (four × [evolution + 16 FFT stages +
assembly]); low quality reduces this to 64 smaller passes. The sky's expensive
atmosphere/environment rebuild is conditional on changed settings, not continuous
in a static study.

Before changing defaults, capture a stable report on the affected phone. Resolution,
MSAA, post effects, simulation and scene rendering must be measured independently.
Download compression alone does not reduce decoded GPU texture allocations.

References: [PlayCanvas device pixel ratio](https://developer.playcanvas.com/user-manual/optimization/runtime-devicepixelratio/),
[PlayCanvas optimization guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/).

## Warmed WebGPU repeat with GPU timestamps enabled

[Raw report](profiles/2026-09-09-adrift-desktop-webgpu.json), Adrift, desktop in-app
Chromium 152, 1280×720 CSS viewport / 2560×1440 canvas. Host: Apple M2 Pro; browser
adapter identity unavailable. Initial and final baselines differ by **1.9%**.
**These figures include GPU timer overhead and do not represent the normal demo.**
A subsequent production-page check was much faster. Use them only as exploratory
results; the phone profiler defaults to GPU timing off.
This was a development build with source textures, not a remote mobile capture.

| Intervention | Average fps | Median main-thread ms |
| --- | ---: | ---: |
| Baseline | 16.0 | 2.5 |
| Pixel ratio 1 | 37.7 | 2.9 |
| MSAA 1 | 19.3 | 2.7 |
| Post effects off | 19.3 | 2.5 |
| FFT frozen | 17.4 | 2.1 |
| Low water quality | 16.8 | 2.6 |
| Scene geometry off | 31.5 | 1.3 |
| Shadows off | 18.2 | 1.8 |
| Baseline repeat | 16.3 | 2.4 |

The strongest measured levers here are resolution and the opaque scene workload.
The latter includes material shading, shadows and changes to reflection inputs;
it does not prove triangle count alone is responsible. FFT reduction has a much
smaller effect in this WebGPU run. Do not transfer that conclusion to fragment FFT
on a phone without measuring it. MSAA and post effects each have a measurable cost.
Per-pass GPU numbers in this environment are inconsistent with displayed frame
intervals and are retained as raw diagnostics, not treated as additive millisecond
budgets. The conclusions above use observed frame intervals and ablations.

The allocation estimate is about 558 MiB at baseline. Pixel ratio 1 lowers it to
460 MiB; disabling post effects lowers it to 507 MiB. Texture compression that
remains compressed on the GPU is a separate candidate from download-only JPEG
compression ([PlayCanvas guidance](https://developer.playcanvas.com/user-manual/optimization/texture-compression/)).
No visual defaults have been changed based on this desktop result.

## Production repeat without GPU timestamps

[Raw report](profiles/2026-09-09-adrift-production-webgpu.json), same viewport and
shot, compressed production assets, browser renderer `apple metal-3`, GPU timing
explicitly disabled. Baselines were 16.0 and 13.9 fps (13.1% drift), so comparisons
are approximate rather than precise speedup estimates.

| Intervention | Average fps |
| --- | ---: |
| Baseline | 16.0 |
| Pixel ratio 1 | 46.1 |
| MSAA 1 | 21.0 |
| Post effects off | 21.3 |
| FFT frozen | 19.6 |
| Low water quality | 17.2 |
| Scene geometry off | 31.6 |
| Shadows off | 19.2 |
| Baseline repeat | 13.9 |

The baseline stayed slow even without GPU timestamps. The earlier quick production
HUD reading was not a controlled comparison and does not establish timestamp
collection as the cause. Keeping GPU timing optional nevertheless separates that
potential measurement overhead from frame-interval comparisons.

The large resolution and scene-workload effects persist. CPU update/submission
medians remain 0.9–2.7 ms. This is evidence for GPU/rendering work as the main desktop
limit, not a mobile diagnosis. Small differences, particularly low water quality,
should not be overinterpreted given baseline drift.

The engine estimates **559 MiB** of allocations. The 4096×2048 HDR sky map alone is
64 MiB; seven uncompressed 2K terrain textures are about 149 MiB combined. Scene
colour, refraction colour and full-resolution DOF blur are another ~94 MiB.
Reducing resolution, scene/material cost and GPU-resident texture memory are the
highest-priority follow-up experiments on the phone. Do not globally degrade the
wave model on the basis of these desktop timings.
