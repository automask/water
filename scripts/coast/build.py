"""Build the compact gallery coast with bpy. Run through npm run build:coast.
Coordinates in the authoring mesh are (world X, -world Z, height); glTF exports Y-up.
The resulting bathymetry is raycast from the exported, triangulated geometry.
"""
import bpy, bmesh, json, math, time
from pathlib import Path
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'art'
OUT = ROOT / 'demo/assets/coast'
OUT.mkdir(parents=True, exist_ok=True)
seed = json.loads((ART/'coast-seed.json').read_text())
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
heights = np.fromfile(ART/'coast-seed.f32',dtype='<f4').reshape(seed['nz'],seed['nx']).copy()
xx, zz = np.meshgrid(np.arange(seed['nx'])*2-520, np.arange(seed['nz'])*2-600)
# Soft, interrupted bedrock shelves, strongest on the western headland. Fine grain stays in maps.
def smooth(a,b,v):
    t=np.clip((v-a)/(b-a),0,1)
    return t*t*(3-2*t)
rockland=(1-smooth(-90,20,xx))*smooth(0,6,heights)
warp=np.sin(xx*.027+np.sin(zz*.019)*2.1)+np.cos(zz*.033-xx*.011)
terrace=np.sin(heights*.82+warp*.7)*.7
channel=(np.abs(np.sin(xx*.031+zz*.013+warp*.65))**8)*1.8
heights += rockland*(terrace-channel)
# A few broad coastal erosional hollows break the continuous rounded shoulder.
for cx,cz,r,d in [(-165,-185,27,5),(-92,-220,19,4),(-48,-270,24,5),(-220,-235,32,4)]:
    heights -= np.exp(-((xx-cx)**2+(zz-cz)**2)/(r*r))*d*rockland

def bed(x,z):
    fx=np.clip((x+520)/2,0,seed['nx']-1.00001); fz=np.clip((z+600)/2,0,seed['nz']-1.00001)
    ix,iz=int(fx),int(fz); u,v=fx-ix,fz-iz
    return float((heights[iz,ix]*(1-u)+heights[iz,ix+1]*u)*(1-v)+(heights[iz+1,ix]*(1-u)+heights[iz+1,ix+1]*u)*v)

# Import each scan once, then place trimmed copies. No new texture sets.
sources={}; source_triangles={}
for name in sorted({p['m'] for p in seed['placements']}):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'demo/assets/models/{name}.glb'))
    imported=set(bpy.data.objects)-before
    meshes=[o for o in imported if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    if len(meshes)>1: bpy.ops.object.join()
    obj=bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    source_triangles[name]=sum(len(p.vertices)-2 for p in obj.data.polygons)
    sources[name]=obj
    obj.hide_render=True; obj.hide_set(True)
    for o in imported:
        if o!=obj and o.name in bpy.data.objects: bpy.data.objects.remove(o,do_unlink=True)

rocks=[]
bedrock=np.zeros_like(heights)
for i,p in enumerate(seed['placements']):
    src=sources[p['m']]
    obj=src.copy(); obj.data=src.data.copy(); bpy.context.collection.objects.link(obj)
    obj.name=f"Coast rock {i+1:02d}"; obj.hide_render=False; obj.hide_set(False)
    coords=np.array([v.co[:] for v in obj.data.vertices]); lo=coords.min(axis=0); hi=coords.max(axis=0)
    scale=p['radius']/max((hi[0]-lo[0])/2,(hi[1]-lo[1])/2)
    height_scale=1.25 if bed(p['x'],p['z']) < 0 else 1.0
    h=(hi[2]-lo[2])*scale*height_scale
    base=bed(p['x'],p['z'])-.18*h
    yaw=math.radians(p.get('yaw',i*137.5))
    c,s=math.cos(yaw),math.sin(yaw)
    # glTF/Blender handedness: rotate around Blender Z with the negative PlayCanvas yaw.
    for v in obj.data.vertices:
        x,y,z=v.co*scale
        v.co=(c*x+s*y+p['x'],-s*x+c*y-p['z'],(z-lo[2]*scale)*height_scale+base)
    cut=base+.20*h
    bm=bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.0001,
                          plane_co=(0,0,cut),plane_no=(0,0,1),clear_inner=True,clear_outer=False)
    boundary=[e for e in bm.edges if e.is_boundary]
    cutpoints=[(v.co.x,-v.co.y) for e in boundary for v in e.verts if abs(v.co.z-cut)<.01]
    # Seal undersides before export. The cap is buried inside the continuous seabed.
    edges=[e for e in boundary if all(abs(v.co.z-cut)<.01 for v in e.verts)]
    if edges: bmesh.ops.holes_fill(bm,edges=edges,sides=0)
    bm.to_mesh(obj.data); bm.free()
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    triangles=sum(len(f.vertices)-2 for f in obj.data.polygons)
    modifier=obj.modifiers.new('Delivery budget','DECIMATE')
    modifier.ratio=min(1,14000/max(triangles,1)); modifier.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for face in obj.data.polygons: face.use_smooth=True
    rocks.append(obj)
    # Convex cut footprint: a buried collar follows the actual scan, instead of a circular cone.
    points=sorted(set(cutpoints))
    def cross(a,b,c): return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    hull=[]
    for point in points:
        while len(hull)>=2 and cross(hull[-2],hull[-1],point)<=0: hull.pop()
        hull.append(point)
    lower=len(hull)
    for point in reversed(points[:-1]):
        while len(hull)>lower and cross(hull[-2],hull[-1],point)<=0: hull.pop()
        hull.append(point)
    hull=hull[:-1]
    if len(hull)>=3:
        distance=np.full_like(heights,-1e6)
        for a,b in zip(hull,hull[1:]+hull[:1]):
            dx,dz=b[0]-a[0],b[1]-a[1]
            distance=np.maximum(distance,((xx-a[0])*dz-(zz-a[1])*dx)/max(math.hypot(dx,dz),.001))
        # An irregular apron of bedrock, with an eroded toe rather than a level sand platform.
        variation=np.sin(xx*.23+np.sin(zz*.17))*0.8+np.sin(zz*.31-xx*.09)*0.5
        blend=1-smooth(-.6, max(7,p['radius']*1.15),distance+variation)
        bedrock=np.maximum(bedrock,1-smooth(0,max(12,p['radius']*2.2),distance+variation))
        # Keep the cut at least 35 cm under the terrain; enough for mesh simplification.
        target=cut+.35
        heights=np.maximum(heights,heights+(target-heights)*blend)

for obj in sources.values(): bpy.data.objects.remove(obj,do_unlink=True)
terrain_material=bpy.data.materials.new('CoastTerrain')
terrain_material.diffuse_color=(.35,.29,.19,1)

def mesh_object(name,verts,faces):
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(terrain_material)
    for f in mesh.polygons: f.use_smooth=True
    return obj
verts=list(zip(xx.ravel(),-zz.ravel(),heights.ravel()))
nx,nz=seed['nx'],seed['nz']
faces=[(j*nx+i,(j+1)*nx+i,(j+1)*nx+i+1,j*nx+i+1) for j in range(nz-1) for i in range(nx-1)]
terrain=mesh_object('Coast terrain',verts,faces)
colors=terrain.data.color_attributes.new(name='CoastZones',type='FLOAT_COLOR',domain='POINT')
for color,value in zip(colors.data,bedrock.ravel()): color.color=(float(value),1,1,1)
bpy.context.view_layer.objects.active=terrain
bpy.ops.object.select_all(action='DESELECT'); terrain.select_set(True)
mod=terrain.modifiers.new('Adaptive terrain budget','DECIMATE'); mod.ratio=.36; mod.use_collapse_triangulate=True
bpy.ops.object.modifier_apply(modifier=mod.name)
# A matching outer ring, sharing every inner boundary vertex; no coarse/fine T-junctions.
# Read the simplified boundary so the ring shares the actual delivery edge.
bm=bmesh.new(); bm.from_mesh(terrain.data)
boundary=[e for e in bm.edges if e.is_boundary]
adjacency={}
for e in boundary:
    a,b=e.verts
    adjacency.setdefault(a,[]).append(b); adjacency.setdefault(b,[]).append(a)
start=boundary[0].verts[0]; previous=None; current=start; edge=[]
while True:
    edge.append(tuple(current.co))
    nxt=next(v for v in adjacency[current] if v!=previous)
    previous,current=current,nxt
    if current==start: break
bm.free()
area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(edge,edge[1:]+edge[:1]))
if area>0: edge.reverse()
outer=[(x*2.7,y*2.7,-50) for x,y,z in edge]
count=len(edge)
basin=mesh_object('Deep basin',edge+outer,[(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)])
basin_colors=basin.data.color_attributes.new(name='CoastZones',type='FLOAT_COLOR',domain='POINT')
for color in basin_colors.data: color.color=(0,1,1,1)
objects=[terrain,basin]+rocks
# Explicit triangulation means the bathymetry raycast uses exactly the delivery surface.
for obj in objects:
    bpy.context.view_layer.objects.active=obj
    tri=obj.modifiers.new('Delivery triangles','TRIANGULATE'); bpy.ops.object.modifier_apply(modifier=tri.name)
    obj.data.update()
# Keep budget provenance with the editable source, including when exporting after hand edits.
bpy.context.scene['coast_source_triangles']=json.dumps(source_triangles)
bpy.context.scene['coast_previous_rock_triangles']=sum(source_triangles[p['m']] for p in seed['placements'])
import sys
sys.path.insert(0,str(Path(__file__).parent))
from export import export_coast
export_coast()
