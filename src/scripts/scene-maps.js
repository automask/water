// CameraFrame uses booleans while CameraComponent uses reference-counted requests.
// Share one lease per CameraFrame settings object so multiple surfaces cannot undo each other.
const frameLeases = new WeakMap();

export function acquireSceneMaps(cameraEntity) {
    const camera = cameraEntity?.camera;
    if (!camera) throw new Error('WaterScript: assign cameraEntity to an entity with a Camera component.');
    camera.requestSceneColorMap(true);
    try { camera.requestSceneDepthMap(true); }
    catch (error) { camera.requestSceneColorMap(false); throw error; }
    const rendering = cameraEntity.script?.get('cameraFrame')?.rendering;
    if (rendering) {
        let lease = frameLeases.get(rendering);
        if (!lease) {
            lease = { count: 0, color: rendering.sceneColorMap, depth: rendering.sceneDepthMap };
            frameLeases.set(rendering, lease);
        }
        lease.count++;
        rendering.sceneColorMap = rendering.sceneDepthMap = true;
    }
    let released = false;
    return () => {
        if (released) return;
        released = true;
        // A removed Camera component has already disposed its render passes.
        if (cameraEntity.camera === camera) {
            camera.requestSceneColorMap(false);
            camera.requestSceneDepthMap(false);
        }
        if (rendering) {
            const lease = frameLeases.get(rendering);
            if (--lease.count === 0) {
                if (rendering.sceneColorMap === true) rendering.sceneColorMap = lease.color;
                if (rendering.sceneDepthMap === true) rendering.sceneDepthMap = lease.depth;
                frameLeases.delete(rendering);
            }
        }
    };
}
