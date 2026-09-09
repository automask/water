"""Export the edited .blend and bake matching bathymetry without regenerating geometry.
blender --background art/coast.blend --python scripts/coast/export.py
"""
import bpy, json
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
ART=ROOT/'art'
OUT=ROOT/'demo/assets/coast'

def export_coast():
    OUT.mkdir(parents=True,exist_ok=True)
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.hide_render]
    terrain=next(o for o in objects if o.name=='Coast terrain')
    # Hide internal unused source materials/images from the authoring outliner.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=terrain
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(ART/'coast.blend'),compress=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/'coast.glb'),export_format='GLB',use_selection=True,export_apply=True,
                             export_yup=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',
                             export_vertex_color='NAME',export_vertex_color_name='CoastZones',export_all_vertex_colors=False,
                             export_cameras=False,export_lights=False)
    allverts=[]; allfaces=[]
    depsgraph=bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        evaluated=obj.evaluated_get(depsgraph)
        mesh=evaluated.to_mesh()
        mesh.calc_loop_triangles()
        offset=len(allverts); allverts.extend([tuple(obj.matrix_world@v.co) for v in mesh.vertices])
        allfaces.extend([tuple(offset+i for i in tri.vertices) for tri in mesh.loop_triangles])
        evaluated.to_mesh_clear()
    bvh=BVHTree.FromPolygons(allverts,allfaces,all_triangles=True)
    # 2.5 m grid matches the shore-map scale; 16 bit heights have 2.5 mm precision.
    n=1041; minimum=-1300; step=2.5
    baked=np.empty((n,n),dtype='<u2')
    checks=[]
    for j in range(n):
        z=minimum+j*step
        for i in range(n):
            x=minimum+i*step
            hit=bvh.ray_cast(Vector((x,-z,180)),Vector((0,0,-1)),400)[0]
            y=hit.z if hit else -50
            baked[j,i]=round(float(np.clip((y+80)/160,0,1))*65535)
    for x,z in [(-30,34),(-58,-18),(104,34),(108,30),(101,20),(-90,-230),(80,96)]:
        hit=bvh.ray_cast(Vector((x,-z,180)),Vector((0,0,-1)),400)[0]
        checks.append({'x':x,'z':z,'height':hit.z if hit else -50})
    baked.tofile(OUT/'bathymetry.u16')
    metadata={'origin':[minimum,minimum],'step':step,'resolution':n,'heightMin':-80,'heightRange':160,'checks':checks}
    (OUT/'bathymetry.json').write_text(json.dumps(metadata,indent=2))
    triangles={}
    for obj in objects:
        evaluated=obj.evaluated_get(depsgraph); mesh=evaluated.to_mesh(); mesh.calc_loop_triangles()
        triangles[obj.name]=len(mesh.loop_triangles); evaluated.to_mesh_clear()
    report={'triangles':triangles,'totalTriangles':sum(triangles.values()),
            'previousTerrainTriangles':561600+28184,
            'previousRockTriangles':int(bpy.context.scene['coast_previous_rock_triangles']),
            'glbBytes':(OUT/'coast.glb').stat().st_size,'bathymetryBytes':baked.nbytes,
            'sourceTriangles':json.loads(bpy.context.scene['coast_source_triangles']),'blender':bpy.app.version_string}
    (OUT/'budget.json').write_text(json.dumps(report,indent=2))
    print('COAST BUILD',json.dumps(report),flush=True)

if __name__=='__main__': export_coast()
