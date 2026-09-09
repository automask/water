import { writeFileSync, mkdirSync } from 'node:fs';
import { seabedHeight, placements } from './layout.mjs';
const output = new URL('../../art/', import.meta.url);
mkdirSync(output, { recursive: true });
// Seed at 2 m; Blender sculpts and simplifies it before baking the final mesh.
const min = [-520, -600], max = [560, 440], step = 2;
const nx = (max[0]-min[0])/step+1, nz=(max[1]-min[1])/step+1;
const heights = new Float32Array(nx*nz);
for(let z=0;z<nz;z++) for(let x=0;x<nx;x++) heights[z*nx+x]=seabedHeight(min[0]+x*step,min[1]+z*step);
writeFileSync(new URL('coast-seed.f32',output), Buffer.from(heights.buffer));
writeFileSync(new URL('coast-seed.json',output), JSON.stringify({min,max,step,nx,nz,placements},null,2));
