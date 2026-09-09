# MSAA and HDR comparison

This experiment changes only official Camera Frame settings. Normal gallery and
Editor defaults are unchanged. The local review page is
`http://localhost:5174/renders/quality-review.html` (use your Vite port).
It provides side-by-side full-resolution captures, synchronised zoom, a pixel
difference view, allocated sample counts, actual formats and measured frame times.

## Method

Run the dev demo with `?shot=adrift&still&clean&compare&gfx=webgpu`, or use `webgl2`.
Use `shot=blue-hour` for Afterglow. The fixture validates that the requested scene
was selected. It advances the scene by 180 fixed steps and then holds camera,
waves and props constant. FFT passes continue to execute at dt=0. All five
variants use that same scene state; screenshots are captured outside timing windows.

Each case warms for 4 seconds (8 for the first baseline) and measures 6 seconds.
GPU timestamp queries are disabled. Measurements are frame intervals, including
browser/display scheduling, not isolated GPU execution times. Compare the baseline
repeat to identify drift. These desktop, fixed-frame measurements are not a mobile
or temporal anti-aliasing assessment.

Download the JSON with **Download comparison**, place it in `renders/`, then run:

```sh
node scripts/analyze-render-comparison.mjs
node scripts/build-render-review.mjs
```

The review uses lossless canvas PNGs. The analysis computes output pixel differences,
not perceptual quality scores. A pixel-identical baseline repeat confirms the captures
are aligned and deterministic.

## Adrift, 2560 × 1440

| Setting | WebGPU mean frame time | WebGL2 mean frame time |
| --- | ---: | ---: |
| 4× MSAA, RGBA16F | 21.145 ms | 25.424 ms |
| 2× MSAA request, RGBA16F | 21.070 ms — actually 4× | 22.433 ms — actual 2× |
| 4× MSAA, RG11B10F | 20.785 ms | 22.701 ms |
| 2× request, RG11B10F | 20.609 ms — actually 4× | 20.928 ms — actual 2× |
| Baseline repeat | 20.953 ms | 25.244 ms |

Baseline drift is 0.91% on WebGPU and 0.71% on WebGL2.

WebGPU only supports 1 or 4 samples; this PlayCanvas version maps a request greater
than 1 to 4. The 2× WebGPU images are pixel-identical to 4×, as expected. The WebGL2
driver's renderbuffer allocation was queried directly and confirms genuine 2× on
this machine. Other devices must be checked, not assumed.
[WebGPU sample-count specification](https://gpuweb.github.io/gpuweb/#dom-gputexturedescriptor-samplecount).

On WebGL2, 2× reduces frame time by about 12%, packed HDR by about 11%, and both by
about 18%. These do not extrapolate to phone performance. The WebGPU packed-HDR
frame-time reduction is small, around 2%, and should not be sold as a major speedup.
Packed HDR reduces the engine's allocation estimate by **55.08 MiB** on both backends;
that estimate excludes some driver/MSAA storage.

At normal viewing size, Adrift looks very close. Zoom reveals slightly coarser fine
edges with 2× WebGL2 MSAA. Packed HDR preserves geometry and wave detail but makes
a small systematic colour/brightness change, especially in blue. Its mean absolute
channel difference is about 1.03–1.05 levels out of 255. The largest differences in
the 2× MSAA image occur at high-contrast edges; the full-frame average is not a
sufficient measure of edge quality. Every Adrift baseline repeat is pixel-identical.

## Afterglow, WebGPU, 2560 × 1440

The validated scene ID is `blue-hour`. Baseline and packed-HDR means were
15.309 and 14.970 ms, with the final baseline at 15.981 ms (4.39% drift).
The difference is within run variation; no meaningful speedup is established.
Packed HDR saves **37.5 MiB** here because this shot does not use DOF.

The inspected stills show no obvious additional banding at normal viewing size.
Packed HDR's mean absolute output-channel difference is 0.4643 levels out of 255,
and the maximum is 3. Its subtle tonal shift remains visible in a difference view.
The repeated baseline and 2× request are again pixel-identical to the baseline.

## Assessment

- Genuine 2× MSAA is a useful candidate on WebGL2, with a small fine-edge quality
  trade-off. Static images do not establish how those edges will shimmer in motion.
- A 2× request is not an optimisation on WebGPU. Keep the setting honest at 4×.
- Packed HDR is a promising memory/bandwidth saving with a small tonal change in
  these two scenes. It gives a measurable frame-time gain in the WebGL2 Adrift
  comparison, but no strong WebGPU speedup is demonstrated.
- On this WebGL2 machine, both settings together reduce Adrift frame time by about
  18% while preserving the overall look. Confirm on the affected phone and in
  motion before adopting a device policy.

Measurements and pixel-analysis JSON are saved under `docs/profiles/render-quality/`.
Lossless PNGs and the interactive HTML remain in the local `renders/` directory,
so the public demo does not acquire a large comparison-image download.
