# Compact gallery coast

`coast.blend` is the editable bpy-authored scene. Coordinates in Blender are `(world X, -world Z, height)`; glTF exports PlayCanvas Y-up. Sea level is zero. Source scans remain CC0 Poly Haven assets; provenance is in `demo/assets/README.md`.

## Build from the reproducible authoring recipe

```
npm run build:coast
```

Requires Blender with bpy, NumPy and the bundled glTF importer/exporter (built with Blender 5.2.1). The command finds the macOS app or `blender` on PATH. Set `BLENDER_BIN` to override it. It regenerates `art/coast.blend`, so preserve any manual edits before regenerating.

- `scripts/coast/layout.mjs`: the original scene layout, coastal seed and rock placements.
- `scripts/coast/seed.mjs`: writes the temporary authoring height grid and placement JSON.
- `scripts/coast/build.py`: interrupts the coastal relief with shelves and erosional hollows, trims and caps scan bases with bmesh, fits buried terrain collars to their footprints, paints a bedrock/sediment vertex mask, and decimates delivery meshes.
- `scripts/coast/export.py`: exports the geometry, raycasts bathymetry, and records delivery budgets.

The original layout is an authoring scaffold only. No terrain generation or scan placement runs in the gallery.

## Export after editing the Blender scene

Save your edits in `art/coast.blend`, then run:

```
blender --background art/coast.blend --python scripts/coast/export.py
```

Use the full Blender executable path if it is not on PATH. Keep the `Coast terrain` object and `CoastTerrain` material names; they identify the terrain's runtime material. `CoastZones` is a point color attribute: red selects bedrock, zero selects the ordinary sediment/vegetation blend. Other channels are reserved. All visible mesh objects are exported, including evaluated modifiers. Keep reference objects hidden from rendering.

Delivery outputs live in `demo/assets/coast/`:

- `coast.glb`: adaptive terrain, matching outer basin, trimmed scanned rocks and their existing texture maps.
- `bathymetry.u16` / `bathymetry.json`: 1041² samples at 2.5 m spacing, raycast from the evaluated geometry. Heights span −80 to +80 m, with about 2.4 mm quantization.
- `budget.json`: actual triangle totals, source comparison and file sizes.

The bake records the highest surface along a vertical ray. It describes shoreline/depth, not caves or overhang volumes. Rock/terrain meshes overlap below the visible contact; they are not a single watertight collision mesh. Inspect every changed contact above and below water after editing. Do not raise geometry outside the bake's height range without updating the exporter.

## Review

```
http://localhost:5173/?shot=stillwater&still&coast-view=stack
http://localhost:5173/?shot=stillwater&still&coast-view=coast
http://localhost:5173/?shot=caustics&still
```

The first two camera fixtures are development-only. Add `&gfx=webgl2` for the fallback renderer. `npm test` checks delivery budgets, upward terrain normals, the authored material mask, underwater camera clearance, and sampled mesh/bathymetry agreement. `npm run build` ships the authored coast and excludes the original scan models and Saltreach reference.
