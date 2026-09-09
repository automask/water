// Authoring seed only. The shipped scene uses Blender geometry and its baked bathymetry.
function hash(n) {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
}

function noise2(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    const at = (a, b) => hash(a * 157.31 + b * 311.7);
    const a = at(ix, iz), b = at(ix + 1, iz), c = at(ix, iz + 1), d = at(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm2(x, z, octaves) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < octaves; i++) { v += a * noise2(x * f, z * f); f *= 2.03; a *= 0.5; }
    return v;
}

/** Ridged noise: sharp crests and rounded valleys, the profile of eroded rock. */
function ridged2(x, z, octaves) {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < octaves; i++) {
        const n = 1 - Math.abs(noise2(x * f, z * f) * 2 - 1);
        v += a * n * n; f *= 2.1; a *= 0.5;
    }
    return v;
}

const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** [x, z, radius, top] of the shoals under the offshore rocks. */
const REEFS = [
    [-30, 34, 16, -1.2], [-58, -18, 12, -1.0], [-96, 60, 10, -1.0],
    [151, -12, 8, -0.8], [86, 124, 8, -0.8], [198, -34, 7, -0.8], [95, 166, 9, -0.8], [132, 6, 6, -0.6],
    [-82, -252, 8, -0.8], [-58, -290, 5, -0.6], [-118, -206, 9, -0.8], [-40, -270, 4, -0.5], [-150, -180, 10, -0.8]
];

/**
 * Sea-bed / land height at a world XZ, in metres (sea level is 0).
 *
 * The broad shape is a handful of Gaussian bumps on a 50 m deep basin. Above the waterline that is
 * far too smooth to stand next to, so land detail is added that fades in with height: a dune field
 * and a berm on the sandy island, and ridged, cliffed relief on the headland.
 */
export function seabedHeight(x, z) {
    const bump = (cx, cz, r, h) => h * Math.exp(-(((x - cx) ** 2 + (z - cz) ** 2) / (r * r)));
    let y = -50;
    const headland = bump(-210, -340, 205, 66) + bump(-40, -430, 120, 32);   // rises ~28 m above sea level
    const island = bump(250, 120, 260, 70);                                  // broad shelf shoaling into a beach
    y += headland + island + bump(-330, 210, 150, 44);
    y += 3.0 * (fbm2(x * 0.035 + 18.2, z * 0.035 - 7.4, 3) - 0.5);

    // reefs: the shoals the offshore rocks stand on, so a stack rises out of the bed rather than
    // hanging in the water, and the swell breaks over the shallows around it
    for (const [rx, rz, rr, top] of REEFS) {
        // A broad submerged ledge supports the scan footprint, then merges into the bed.
        // A Gaussian peak only supported the centre, leaving the cut perimeter suspended.
        const r = Math.hypot(x - rx, z - rz) / rr;
        const irregularity = (noise2(x * 0.09, z * 0.09) - 0.5) * 0.2;
        const w = 1 - smoothstep(0.35, 2.4, r + irregularity * 2.5);
        if (w > 1e-3) y += (top - 2.0 - y) * w;
    }

    // how much of the local relief is the headland's, so the rocky treatment stays on it
    const rocky = headland / Math.max(headland + island, 1e-3);
    const land = smoothstep(-4, 4, y);
    // sand waves on the bed, for the caustics to play over; they fade out above the swash
    y += 0.5 * (fbm2(x * 0.11 + 9.1, z * 0.13 + 2.3, 2) - 0.5) * (1 - land);
    if (land > 0) {
        // the sandy island: a berm just above the swash, then a low dune field
        const dunes = (fbm2(x * 0.018 + 3.1, z * 0.024 + 7.7, 4) - 0.5) * 6.0;
        const berm = 0.8 * smoothstep(0.5, 3.0, y) * (1 - smoothstep(3.0, 6.0, y));
        // the headland: ridged massif, with a cliffed shoulder on its seaward side
        const ridge = (ridged2(x * 0.012 + 1.3, z * 0.012 + 5.1, 4) - 0.42) * 9.0;   // 4 octaves: the finest is ~9 m, safely above the 2 m mesh
        const cliff = 2.5 * smoothstep(7, 10, y) * (0.6 + 0.4 * fbm2(x * 0.03, z * 0.03, 3));
        const detail = (1 - rocky) * (dunes * smoothstep(1.5, 6, y) + berm) + rocky * (ridge + cliff);
        y += land * detail;
    }
    return y;
}


export const placements = [
        // stacks offshore
        { m: 'coast_rocks_05', x: -30, z: 34, radius: 13, yaw: 200 },
        { m: 'coast_rocks_03', x: -58, z: -18, radius: 9, yaw: 40 },
        { m: 'coast_rocks_01', x: -96, z: 60, radius: 7, yaw: 300 },
        // skerries in the surf on the shelf
        { m: 'coast_rocks_01', x: 151, z: -12, radius: 6.0, yaw: 20 },
        { m: 'coast_rocks_05', x: 86, z: 124, radius: 6.0, yaw: 130 },
        { m: 'coast_rocks_03', x: 198, z: -34, radius: 5.5, yaw: 250 },
        { m: 'coast_rocks_01', x: 95, z: 166, radius: 7.0, yaw: 80 },
        { m: 'coast_rocks_05', x: 132, z: 6, radius: 4.0 },
        // on the beach
        { m: 'sand_rocks_small_01', x: 165, z: 12, radius: 2.8 },
        { m: 'rock_09', x: 150, z: 30, radius: 1.3 },
        { m: 'boulder_01', x: 206, z: 62, radius: 2.2 },
        { m: 'rock_09', x: 176, z: -8, radius: 0.9 },
        { m: 'sand_rocks_small_01', x: 232, z: 20, radius: 3.0 },
        // the foot of the headland, in the surf below the cliffs
        { m: 'coast_rocks_03', x: -82, z: -252, radius: 6 },
        { m: 'boulder_01', x: -58, z: -290, radius: 3.6 },
        { m: 'coast_rocks_01', x: -118, z: -206, radius: 7 },
        { m: 'boulder_01', x: -40, z: -270, radius: 2.4 },
        { m: 'coast_rocks_05', x: -150, z: -180, radius: 7.5 }
    ];
    // Reuse the compact coast scans at the headland's exposed contour. The heightfield supplies
    // the continuous mass behind them; scanned outcrops supply ledges and a broken silhouette.
    for (const [i, x] of [-100, -75, -50, -25].entries()) {
        let z = -120;
        while (z > -400 && seabedHeight(x, z) < 1) z -= 2;
        placements.push({ m: i % 2 ? 'coast_rocks_03' : 'coast_rocks_05', x, z,
            radius: [25, 30, 26, 20][i], yaw: 27 + i * 73 });
    }
