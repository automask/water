import { Script, Entity, Asset, Vec3, Quat, StandardMaterial, ADDRESS_REPEAT } from 'playcanvas';
import { CinematicFrame } from '../CinematicFrame.js';
import { applyTerrain, applyRockWaterline } from '../triplanar.js';

/** Presentation only: never moves the camera or creates scene geometry. */
export class AdriftCamera extends Script {
    static scriptName = 'adriftCamera';
    /**
     * @attribute
     * @type {Entity}
     */
    focusEntity = null;

    initialize() {
        this.frame = this.entity.script.create(CinematicFrame);
        const f = this.frame;
        f.rendering.renderFormat = 'rgba16';
        f.rendering.toneMapping = 'aces2';
        f.rendering.sceneColorMap = true;
        f.rendering.sceneDepthMap = true;
        f.rendering.samples = 1;
        f.bloom.enabled = true;
        f.bloom.intensity = .02;
        f.bloom.blurLevel = 6;
        f.dof.enabled = Boolean(this.focusEntity);
        f.dof.nearBlur = true;
        f.dof.highQuality = true;
        f.dof.focusRange = 7;
        f.dof.blurRadius = 4;
        f.waterFocus = true;
        f.seaLevel = 0;
        this.on('destroy', () => this.entity.script?.destroy(CinematicFrame));
    }
    update() {
        if (this.focusEntity) this.frame.dof.focusDistance = this.entity.getPosition().distance(this.focusEntity.getPosition());
    }
}

/** Float an existing, Editor-placed model around its authored waterline. */
export class AdriftBuoy extends Script {
    static scriptName = 'adriftBuoy';
    /**
     * @attribute
     * @type {Entity}
     */
    waterEntity = null;
    initialize() {
        this.anchor = this.entity.getPosition().clone();
        this.rotation = this.entity.getRotation().clone();
        this.up = new Vec3(0, 1, 0);
        this.axis = new Vec3();
        this.normal = new Vec3();
        this.tilt = new Quat();
        this.target = new Quat();
        this.smoothed = this.rotation.clone();
    }
    update(dt) {
        const water = this.waterEntity?.script?.waterSurface?.water;
        if (!water) return;
        const { x, z } = this.anchor;
        const y = water.getSurfaceAt(x, z).position.y;
        const dx = water.getSurfaceAt(x + 1.1, z).position.y - y;
        const dz = water.getSurfaceAt(x, z + 1.1).position.y - y;
        this.normal.set(-dx / 1.1, 1, -dz / 1.1).normalize().lerp(this.up, this.normal, .55).normalize();
        const axis = this.axis.cross(this.up, this.normal);
        this.tilt.copy(Quat.IDENTITY);
        if (axis.length() > 1e-5) this.tilt.setFromAxisAngle(axis.normalize(), Math.acos(Math.min(1, this.up.dot(this.normal))) * 180 / Math.PI);
        this.target.mul2(this.tilt, this.rotation);
        const k = Math.min(1, dt * 6), p = this.entity.getPosition();
        this.entity.setPosition(x, p.y + (y + this.anchor.y - p.y) * k, z);
        this.smoothed.slerp(this.smoothed, this.target, k);
        this.entity.setRotation(this.smoothed);
    }
}

/** Apply the demo coast's shading to existing geometry, using Editor texture assets. */
export class AdriftTerrain extends Script {
    static scriptName = 'adriftTerrain';
    /** @attribute
     * @type {Entity}
     */
    waterEntity = null;
    /** @attribute
     * @type {Asset}
     * @resource texture
     */
    sandAlbedo = null;
    /** @attribute
     * @type {Asset}
     * @resource texture
     */
    sandNormal = null;
    /** @attribute
     * @type {Asset}
     * @resource texture
     */
    landAlbedo = null;
    /** @attribute
     * @type {Asset}
     * @resource texture
     */
    landNormal = null;
    /** @attribute
     * @type {Asset}
     * @resource texture
     */
    rockAlbedo = null;
    /** @attribute
     * @type {Asset}
     * @resource texture
     */
    rockNormal = null;
    /** @attribute
     * @type {Asset}
     * @resource texture
     */
    rockArm = null;

    initialize() {
        const fields = ['sandAlbedo', 'sandNormal', 'landAlbedo', 'landNormal', 'rockAlbedo', 'rockNormal', 'rockArm'];
        if (fields.some(field => !this[field]?.resource)) throw new Error('Assign and preload all Adrift terrain texture attributes.');
        for (const field of fields) {
            const texture = this[field].resource;
            texture.srgb = field.endsWith('Albedo');
            texture.addressU = texture.addressV = ADDRESS_REPEAT;
        }
        const seaLevel = this.waterEntity?.getPosition().y ?? 0;
        const material = new StandardMaterial();
        material.name = 'Adrift coast surface';
        material.useMetalness = true;
        material.metalness = 0;
        applyTerrain(material, {
            sand: { albedo: this.sandAlbedo.resource, normal: this.sandNormal.resource },
            grass: { albedo: this.landAlbedo.resource, normal: this.landNormal.resource },
            rock: { albedo: this.rockAlbedo.resource, normal: this.rockNormal.resource, arm: this.rockArm.resource },
            tileMetres: [3, 20, 2.7], seaLevel
        });
        const materials = new Set();
        this.originals = [];
        for (const render of this.entity.findComponents('render')) for (const mesh of render.meshInstances) {
            if (mesh.material.name === 'CoastTerrain') {
                this.originals.push([mesh, mesh.material]);
                mesh.material = material;
            } else if (!materials.has(mesh.material)) applyRockWaterline(mesh.material, seaLevel);
            materials.add(mesh.material);
        }
        const component = this.waterEntity?.script?.waterSurface;
        const attach = water => { this.detach = [...materials].map(m => water.addReceiver(m)); };
        component?.on('water:ready', attach);
        if (component?.water) attach(component.water);
        this.on('destroy', () => {
            component?.off('water:ready', attach);
            this.detach?.forEach(fn => fn());
            for (const [mesh, original] of this.originals) mesh.material = original;
            material.destroy();
        });
    }
}
