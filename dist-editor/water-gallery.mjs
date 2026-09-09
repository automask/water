import { Script, CameraFrame as CameraFrame$1, Color, PIXELFORMAT_111110F, TONEMAP_LINEAR, PIXELFORMAT_RGBA8, PIXELFORMAT_RGBA16F, PIXELFORMAT_RGBA32F, TONEMAP_FILMIC, TONEMAP_HEJL, TONEMAP_ACES, TONEMAP_ACES2, TONEMAP_NEUTRAL, FramePassCameraFrame, ShaderUtils, SEMANTIC_POSITION, PROJECTION_PERSPECTIVE, Compute, RenderTarget, Shader, SHADERLANGUAGE_WGSL, RenderPassShaderQuad, Texture, FILTER_LINEAR_MIPMAP_LINEAR, ADDRESS_REPEAT, FILTER_LINEAR, ADDRESS_CLAMP_TO_EDGE, FILTER_NEAREST, Mesh, BoundingBox, Vec3, ShaderMaterial, BLEND_NORMAL, CULLFACE_NONE, MeshInstance, Entity, LAYERID_WORLD, StandardMaterial, drawQuadWithShader, EnvLighting, TEXTUREPROJECTION_EQUIRECT, TorusGeometry, Quat, Asset, createGraphicsDevice, DEVICETYPE_WEBGL2, DEVICETYPE_WEBGPU, AppBase, AppOptions, RenderComponentSystem, CameraComponentSystem, LightComponentSystem, ScriptComponentSystem, TextureHandler, ContainerHandler, dracoInitialize, basisInitialize, SHADOW_PCF3_32F, FOG_EXP2, FOG_EXP } from 'playcanvas';

// Camera Frame v 1.3


/**
 * @import { Asset, Entity } from 'playcanvas';
 */

/** @enum {string} */
const ToneMapping = {
    LINEAR: 'linear',
    FILMIC: 'filmic',
    HEJL: 'hejl',
    ACES: 'aces',
    ACES2: 'aces2',
    NEUTRAL: 'neutral'
};

/** @enum {string} */
const SsaoType = {
    NONE: 'none'};

/** @enum {string} */
const RenderFormat = {
    RGBA8: 'rgba8',
    RG11B10: 'rg11b10',
    RGBA16: 'rgba16',
    RGBA32: 'rgba32'
};

const toneMappingMap = new Map([
    [ToneMapping.LINEAR, TONEMAP_LINEAR],
    [ToneMapping.FILMIC, TONEMAP_FILMIC],
    [ToneMapping.HEJL, TONEMAP_HEJL],
    [ToneMapping.ACES, TONEMAP_ACES],
    [ToneMapping.ACES2, TONEMAP_ACES2],
    [ToneMapping.NEUTRAL, TONEMAP_NEUTRAL]
]);

const renderFormatMap = new Map([
    [RenderFormat.RGBA8, PIXELFORMAT_RGBA8],
    [RenderFormat.RG11B10, PIXELFORMAT_111110F],
    [RenderFormat.RGBA16, PIXELFORMAT_RGBA16F],
    [RenderFormat.RGBA32, PIXELFORMAT_RGBA32F]
]);

/**
 * Resolves a {@link ToneMapping} string to the engine's tone mapping constant. Numeric values
 * are passed through unchanged for backward compatibility with attribute data that stored the
 * engine constants directly.
 *
 * @param {ToneMapping|number} value - The tone mapping.
 * @returns {number} The engine tone mapping constant.
 */
const resolveToneMapping = (value) => {
    return typeof value === 'number' ? value : (toneMappingMap.get(value) ?? TONEMAP_LINEAR);
};

/**
 * Resolves a {@link RenderFormat} string to the engine's pixel format constant. Numeric values
 * are passed through unchanged for backward compatibility with attribute data that stored the
 * engine constants directly.
 *
 * @param {RenderFormat|number} value - The render format.
 * @returns {number} The engine pixel format constant.
 */
const resolveRenderFormat = (value) => {
    return typeof value === 'number' ? value : (renderFormatMap.get(value) ?? PIXELFORMAT_111110F);
};

/** @enum {string} */
const DebugType = {
    NONE: 'none'};

/**
 * @interface
 * @category Post-Processing
 */
class Rendering {
    /**
     * @attribute
     * @type {RenderFormat}
     */
    renderFormat = RenderFormat.RG11B10;

    /**
     * @attribute
     * @type {RenderFormat}
     */
    renderFormatFallback0 = RenderFormat.RGBA16;

    /**
     * @attribute
     * @type {RenderFormat}
     */
    renderFormatFallback1 = RenderFormat.RGBA32;

    stencil = false;

    /**
     * @attribute
     * @range [0.1, 1]
     * @precision 2
     * @step 0.01
     */
    renderTargetScale = 1.0;

    /**
     * @attribute
     * @range [1, 4]
     * @precision 0
     * @step 1
     */
    samples = 1;

    sceneColorMap = false;

    sceneDepthMap = false;

    /**
     * @attribute
     * @type {ToneMapping}
     */
    toneMapping = ToneMapping.LINEAR;

    /**
     * @range [0, 1]
     * @precision 3
     * @step 0.001
     */
    sharpness = 0.0;

    /**
     * @attribute
     * @type {DebugType}
     */
    debug = DebugType.NONE;
}

/**
 * @interface
 * @category Post-Processing
 */
class Ssao {
    /**
     * @attribute
     * @type {SsaoType}
     */
    type = SsaoType.NONE;

    /**
     * @visibleif {type !== 'none'}
     */
    blurEnabled = true;

    /**
     * Whether the sampling is randomized. Useful instead of the blur when TAA is enabled, which
     * resolves the noise over time and keeps more of the detail.
     *
     * @visibleif {type !== 'none'}
     */
    randomize = false;

    /**
     * @range [0, 1]
     * @visibleif {type !== 'none'}
     * @precision 3
     * @step 0.001
     */
    intensity = 0.5;

    /**
     * @range [0, 100]
     * @visibleif {type !== 'none'}
     * @precision 3
     * @step 0.001
     */
    radius = 30;

    /**
     * @range [1, 64]
     * @visibleif {type !== 'none'}
     * @precision 0
     * @step 1
     */
    samples = 12;

    /**
     * @range [0.1, 10]
     * @visibleif {type !== 'none'}
     * @precision 3
     * @step 0.001
     */
    power = 6;

    /**
     * @range [1, 90]
     * @visibleif {type !== 'none'}
     * @precision 1
     * @step 1
     */
    minAngle = 10;

    /**
     * @range [0.5, 1]
     * @visibleif {type !== 'none'}
     * @precision 3
     * @step 0.001
     */
    scale = 1;
}

/**
 * @interface
 * @category Post-Processing
 */
class Bloom {
    enabled = false;

    /**
     * @visibleif {enabled}
     * @range [0, 0.1]
     * @precision 3
     * @step 0.001
     */
    intensity = 0.01;

    /**
     * @attribute
     * @visibleif {enabled}
     * @range [1, 16]
     * @precision 0
     * @step 0
     */
    blurLevel = 16;
}

/**
 * @interface
 * @category Post-Processing
 */
class Grading {
    enabled = false;

    /**
     * @visibleif {enabled}
     * @range [0, 3]
     * @precision 3
     * @step 0.001
     */
    brightness = 1;

    /**
     * @visibleif {enabled}
     * @range [0.5, 1.5]
     * @precision 3
     * @step 0.001
     */
    contrast = 1;

    /**
     * @visibleif {enabled}
     * @range [0, 2]
     * @precision 3
     * @step 0.001
     */
    saturation = 1;

    /**
     * @attribute
     * @visibleif {enabled}
     */
    tint = new Color(1, 1, 1, 1);
}

/**
 * @interface
 * @category Post-Processing
 */
class ColorLUT {
    /**
     * @attribute
     * @type {Asset}
     * @resource texture
     */
    texture = null;

    /**
     * @visibleif {texture}
     * @range [0, 1]
     * @precision 3
     * @step 0.001
     */
    intensity = 1;

    /**
     * Optional secondary LUT texture. When set, both LUTs are sampled and the two graded
     * results are crossfaded according to the blend factor.
     *
     * @attribute
     * @type {Asset}
     * @resource texture
     */
    texture2 = null;

    /**
     * @visibleif {texture2}
     * @range [0, 1]
     * @precision 3
     * @step 0.001
     */
    intensity2 = 1;

    /**
     * Crossfade between the two graded results. 0 shows only the primary LUT, 1 shows only the
     * secondary LUT, intermediate values produce a linear-space mix.
     *
     * @visibleif {texture2}
     * @range [0, 1]
     * @precision 3
     * @step 0.001
     */
    blend = 0;
}

/**
 * @interface
 * @category Post-Processing
 */
class Vignette {
    enabled = false;

    /**
     * @visibleif {enabled}
     * @range [0, 1]
     * @precision 3
     * @step 0.001
     */
    intensity = 0.5;

    /**
     * @visibleif {enabled}
     * @range [0, 3]
     * @precision 3
     * @step 0.001
     */
    inner = 0.5;

    /**
     * @visibleif {enabled}
     * @range [0, 3]
     * @precision 3
     * @step 0.001
     */
    outer = 1;

    /**
     * @visibleif {enabled}
     * @range [0.01, 10]
     * @precision 3
     * @step 0.001
     */
    curvature = 0.5;

    /**
     * @attribute
     * @visibleif {enabled}
     */
    color = new Color(0, 0, 0, 1);
}

/**
 * @interface
 * @category Post-Processing
 */
class Fringing {
    enabled = false;

    /**
     * @visibleif {enabled}
     * @range [0, 100]
     * @precision 1
     * @step 0.1
     */
    intensity = 50;
}

/**
 * @interface
 * @category Post-Processing
 */
class ColorEnhance {
    enabled = false;

    /**
     * @visibleif {enabled}
     * @range [-3, 3]
     * @precision 2
     * @step 0.1
     */
    shadows = 0;

    /**
     * @visibleif {enabled}
     * @range [-3, 3]
     * @precision 2
     * @step 0.1
     */
    highlights = 0;

    /**
     * @visibleif {enabled}
     * @range [-1, 1]
     * @precision 3
     * @step 0.01
     */
    midtones = 0;

    /**
     * @visibleif {enabled}
     * @range [-1, 1]
     * @precision 3
     * @step 0.01
     */
    vibrance = 0;

    /**
     * @visibleif {enabled}
     * @range [-1, 1]
     * @precision 3
     * @step 0.01
     */
    dehaze = 0;
}

/**
 * @interface
 * @category Post-Processing
 */
class Taa {
    enabled = false;

    /**
     * @visibleif {enabled}
     * @range [0, 1]
     * @precision 2
     * @step 0.1
     */
    jitter = 1;
}

/**
 * @interface
 * @category Post-Processing
 */
class Dof {
    enabled = false;

    /**
     * @visibleif {enabled}
     */
    highQuality = true;

    /**
     * @visibleif {enabled}
     */
    nearBlur = false;

    /**
     * @visibleif {enabled}
     * @precision 2
     * @step 1
     */
    focusDistance = 100;

    /**
     * @visibleif {enabled}
     * @precision 2
     * @step 1
     */
    focusRange = 10;

    /**
     * @visibleif {enabled}
     * @precision 2
     * @step 0.1
     */
    blurRadius = 3;

    /**
     * @visibleif {enabled}
     * @range [1, 10]
     * @precision 0
     * @step 1
     */
    blurRings = 4;

    /**
     * @visibleif {enabled}
     * @range [1, 10]
     * @precision 0
     * @step 1
     */
    blurRingPoints = 5;
}

/**
 * @interface
 * @category Post-Processing
 */
class VolumetricFog {
    enabled = false;

    /**
     * The entity with the directional light providing the scattered light. Leave it unset to light
     * the fog by the local lights and the ambient term alone.
     *
     * @attribute
     * @visibleif {enabled}
     * @type {Entity}
     */
    light = null;

    /**
     * Whether the omni lights scatter light in the fog. Requires clustered lighting, which is
     * enabled by default. An omni light fills its whole range, so it typically covers much more of
     * the screen than a spot light and costs more.
     *
     * @visibleif {enabled}
     */
    localOmniLights = false;

    /**
     * Whether the spot lights scatter light in the fog, forming visible beams. Requires clustered
     * lighting, which is enabled by default.
     *
     * @visibleif {enabled}
     */
    localSpotLights = false;

    /**
     * The intensity of the light scattering of the omni and the spot lights. A narrow beam crosses
     * only a short part of each view ray, and so typically needs a much larger value than the
     * directional light's intensity below.
     *
     * @visibleif {enabled && (localOmniLights || localSpotLights)}
     * @range [0, 100]
     * @precision 2
     * @step 0.1
     */
    localIntensity = 1;

    /**
     * The number of raymarching steps taken inside the volume of each omni and spot light.
     *
     * @visibleif {enabled && (localOmniLights || localSpotLights)}
     * @range [2, 64]
     * @precision 0
     * @step 1
     */
    localSteps = 12;

    /**
     * @attribute
     * @visibleif {enabled}
     */
    tint = new Color(1, 1, 1, 1);

    /**
     * @visibleif {enabled}
     * @range [0, 0.2]
     * @precision 4
     * @step 0.001
     */
    density = 0.01;

    /**
     * @visibleif {enabled}
     * @precision 2
     * @step 1
     */
    heightBase = 0;

    /**
     * @visibleif {enabled}
     * @range [0, 1]
     * @precision 3
     * @step 0.001
     */
    heightFalloff = 0.05;

    /**
     * How quickly the fog absorbs the light passing through it, without affecting how much light it
     * scatters. A value of 1 is physically consistent, where distant fog and light shafts fade out
     * exponentially with the density. Lower it to keep them visible further away while the fog
     * itself stays as bright.
     *
     * @visibleif {enabled}
     * @range [0, 2]
     * @precision 2
     * @step 0.05
     */
    extinction = 1;

    /**
     * @visibleif {enabled}
     * @range [0, 0.95]
     * @precision 3
     * @step 0.001
     */
    anisotropy = 0.6;

    /**
     * @visibleif {enabled}
     * @range [0, 10]
     * @precision 3
     * @step 0.01
     */
    intensity = 1;

    /**
     * @attribute
     * @visibleif {enabled}
     */
    ambientColor = new Color(1, 1, 1, 1);

    /**
     * @visibleif {enabled}
     * @range [0, 1]
     * @precision 4
     * @step 0.001
     */
    ambientIntensity = 0.02;

    /**
     * @visibleif {enabled}
     * @precision 2
     * @step 1
     */
    maxDistance = 300;

    /**
     * @visibleif {enabled}
     * @range [4, 128]
     * @precision 0
     * @step 1
     */
    steps = 24;

    /**
     * @visibleif {enabled}
     * @range [0.25, 1]
     * @precision 2
     * @step 0.05
     */
    scale = 0.5;
}

/**
 * Enables the engine's {@link EngineCameraFrame | CameraFrame} render pipeline on a camera
 * entity, exposing its settings as grouped script attributes: rendering (render format, tone
 * mapping, sharpness, TAA), SSAO, bloom, color grading, color LUT, vignette, fringing, depth
 * of field and volumetric fog.
 *
 * Attach the script to an entity with a camera component and adjust the attribute groups to
 * configure the post-processing stack. Most groups are gated by their own `enabled` flag, which
 * defaults to false. Three are not: `rendering` is always applied, `ssao` is gated by its `type`
 * (`SsaoType.NONE` by default) and `colorLUT` by its `texture` (null by default) — setting
 * `enabled` on those two does nothing.
 *
 * Set the fields on the groups after creating the script. Do not pass a group through the
 * `properties` argument of {@link ScriptComponent#create}: that assignment is shallow, so it
 * replaces the whole group object and drops its `enabled` flag, leaving the effect switched off.
 *
 * @example
 * cameraEntity.addComponent('script');
 * const cameraFrame = cameraEntity.script.create(CameraFrame);
 * cameraFrame.rendering.toneMapping = 'aces';
 * cameraFrame.bloom.enabled = true;
 * cameraFrame.bloom.intensity = 0.02;
 * @category Post-Processing
 */
class CameraFrame extends Script {
    static scriptName = 'cameraFrame';

    /**
     * @attribute
     * @type {Rendering}
     */
    rendering = new Rendering();

    /**
     * @attribute
     * @type {Ssao}
     */
    ssao = new Ssao();

    /**
     * @attribute
     * @type {Bloom}
     */
    bloom = new Bloom();

    /**
     * @attribute
     * @type {Grading}
     */
    grading = new Grading();

    /**
     * @attribute
     * @type {ColorLUT}
     */
    colorLUT = new ColorLUT();

    /**
     * @attribute
     * @type {Vignette}
     */
    vignette = new Vignette();

    /**
     * @attribute
     * @type {Taa}
     */
    taa = new Taa();

    /**
     * @attribute
     * @type {Fringing}
     */
    fringing = new Fringing();

    /**
     * @attribute
     * @type {ColorEnhance}
     */
    colorEnhance = new ColorEnhance();

    /**
     * @attribute
     * @type {Dof}
     */
    dof = new Dof();

    /**
     * @attribute
     * @type {VolumetricFog}
     */
    volumetricFog = new VolumetricFog();

    engineCameraFrame;

    initialize() {

        this.engineCameraFrame = new CameraFrame$1(this.app, this.entity.camera);

        this.on('enable', () => {
            this.engineCameraFrame.enabled = true;
        });

        this.on('disable', () => {
            this.engineCameraFrame.enabled = false;
        });

        this.on('destroy', () => {
            this.engineCameraFrame.destroy();
        });

        this.on('state', (enabled) => {
            this.engineCameraFrame.enabled = enabled;
        });
    }

    postUpdate(dt) {

        const cf = this.engineCameraFrame;
        const { rendering, bloom, grading, colorEnhance, vignette, fringing, taa, ssao, dof, colorLUT, volumetricFog } = this;

        const dstRendering = cf.rendering;
        dstRendering.renderFormats.length = 0;
        dstRendering.renderFormats.push(resolveRenderFormat(rendering.renderFormat));
        dstRendering.renderFormats.push(resolveRenderFormat(rendering.renderFormatFallback0));
        dstRendering.renderFormats.push(resolveRenderFormat(rendering.renderFormatFallback1));
        dstRendering.stencil = rendering.stencil;
        dstRendering.renderTargetScale = rendering.renderTargetScale;
        dstRendering.samples = rendering.samples;
        dstRendering.sceneColorMap = rendering.sceneColorMap;
        dstRendering.sceneDepthMap = rendering.sceneDepthMap;
        dstRendering.toneMapping = resolveToneMapping(rendering.toneMapping);
        dstRendering.sharpness = rendering.sharpness;

        // ssao
        const dstSsao = cf.ssao;
        dstSsao.type = ssao.type;
        if (ssao.type !== SsaoType.NONE) {
            dstSsao.blurEnabled = ssao.blurEnabled;
            dstSsao.randomize = ssao.randomize;
            dstSsao.intensity = ssao.intensity;
            dstSsao.radius = ssao.radius;
            dstSsao.samples = ssao.samples;
            dstSsao.power = ssao.power;
            dstSsao.minAngle = ssao.minAngle;
            dstSsao.scale = ssao.scale;
        }

        // bloom
        const dstBloom = cf.bloom;
        dstBloom.intensity = bloom.enabled ? bloom.intensity : 0;
        if (bloom.enabled) {
            dstBloom.blurLevel = bloom.blurLevel;
        }

        // grading
        const dstGrading = cf.grading;
        dstGrading.enabled = grading.enabled;
        if (grading.enabled) {
            dstGrading.brightness = grading.brightness;
            dstGrading.contrast = grading.contrast;
            dstGrading.saturation = grading.saturation;
            dstGrading.tint.copy(grading.tint);
        }

        // colorLUT
        const dstColorLUT = cf.colorLUT;
        if (colorLUT.texture?.resource) {
            dstColorLUT.texture = colorLUT.texture.resource;
            dstColorLUT.intensity = colorLUT.intensity;
        } else {
            dstColorLUT.texture = null;
        }
        if (colorLUT.texture2?.resource) {
            dstColorLUT.texture2 = colorLUT.texture2.resource;
            dstColorLUT.intensity2 = colorLUT.intensity2;
            dstColorLUT.blend = colorLUT.blend;
        } else {
            dstColorLUT.texture2 = null;
        }

        // vignette
        const dstVignette = cf.vignette;
        dstVignette.intensity = vignette.enabled ? vignette.intensity : 0;
        if (vignette.enabled) {
            dstVignette.inner = vignette.inner;
            dstVignette.outer = vignette.outer;
            dstVignette.curvature = vignette.curvature;
            dstVignette.color.copy(vignette.color);
        }

        // taa
        const dstTaa = cf.taa;
        dstTaa.enabled = taa.enabled;
        if (taa.enabled) {
            dstTaa.jitter = taa.jitter;
        }

        // fringing
        const dstFringing = cf.fringing;
        dstFringing.intensity = fringing.enabled ? fringing.intensity : 0;

        // colorEnhance
        const dstColorEnhance = cf.colorEnhance;
        dstColorEnhance.enabled = colorEnhance.enabled;
        if (colorEnhance.enabled) {
            dstColorEnhance.shadows = colorEnhance.shadows;
            dstColorEnhance.highlights = colorEnhance.highlights;
            dstColorEnhance.midtones = colorEnhance.midtones;
            dstColorEnhance.vibrance = colorEnhance.vibrance;
            dstColorEnhance.dehaze = colorEnhance.dehaze;
        }

        // dof
        const dstDof = cf.dof;
        dstDof.enabled = dof.enabled;
        if (dof.enabled) {
            dstDof.highQuality = dof.highQuality;
            dstDof.nearBlur = dof.nearBlur;
            dstDof.focusDistance = dof.focusDistance;
            dstDof.focusRange = dof.focusRange;
            dstDof.blurRadius = dof.blurRadius;
            dstDof.blurRings = dof.blurRings;
            dstDof.blurRingPoints = dof.blurRingPoints;
        }

        // volumetricFog
        const dstVolumetricFog = cf.volumetricFog;
        dstVolumetricFog.enabled = volumetricFog.enabled;
        if (volumetricFog.enabled) {
            dstVolumetricFog.light = volumetricFog.light?.light ?? null;
            dstVolumetricFog.localOmniLights = volumetricFog.localOmniLights;
            dstVolumetricFog.localSpotLights = volumetricFog.localSpotLights;
            dstVolumetricFog.localIntensity = volumetricFog.localIntensity;
            dstVolumetricFog.localSteps = volumetricFog.localSteps;
            dstVolumetricFog.tint.copy(volumetricFog.tint);
            dstVolumetricFog.density = volumetricFog.density;
            dstVolumetricFog.heightBase = volumetricFog.heightBase;
            dstVolumetricFog.heightFalloff = volumetricFog.heightFalloff;
            dstVolumetricFog.extinction = volumetricFog.extinction;
            dstVolumetricFog.anisotropy = volumetricFog.anisotropy;
            dstVolumetricFog.intensity = volumetricFog.intensity;
            dstVolumetricFog.ambientColor.copy(volumetricFog.ambientColor);
            dstVolumetricFog.ambientIntensity = volumetricFog.ambientIntensity;
            dstVolumetricFog.maxDistance = volumetricFog.maxDistance;
            dstVolumetricFog.steps = volumetricFog.steps;
            dstVolumetricFog.scale = volumetricFog.scale;
        }

        // debugging
        cf.debug = rendering.debug;

        cf.update();
    }
}

const COC_GLSL = /* glsl */`
#include "screenDepthPS"
varying vec2 uv0;
uniform vec3 params;
uniform vec4 uDemoCocCamera;   // camera world position, sea level
uniform vec3 uDemoCocRight;
uniform vec3 uDemoCocUp;
uniform vec3 uDemoCocForward;
uniform vec4 uDemoCocLens;     // tan half horizontal/vertical FOV, enabled, near clip
void main() {
    float depth = getLinearScreenDepth(uv0);
    if (uDemoCocLens.z > 0.5 && uDemoCocCamera.y > uDemoCocCamera.w) {
        // Undo the image-effect UV convention to recover NDC; this handles WebGPU's Y flip.
        vec2 ndc = getImageEffectUV(uv0) * 2.0 - 1.0;
        vec3 ray = uDemoCocForward + uDemoCocRight * (ndc.x * uDemoCocLens.x)
            + uDemoCocUp * (ndc.y * uDemoCocLens.y);
        if (ray.y < -0.00001) {
            float waterDepth = (uDemoCocCamera.w - uDemoCocCamera.y) / ray.y;
            if (waterDepth >= uDemoCocLens.w) depth = min(depth, waterDepth);
        }
    }
    // Lens defocus varies with reciprocal depth. A linear metre ramp hits full blur
    // just behind the subject, making a horizontal stripe on a receding water plane.
    // Keep the focus tolerance, but let far blur approach its limit at infinity.
    depth = max(depth, 0.0001);
    float farRange = params.x + params.y * 0.5;
    float cocFar = clamp(1.0 - farRange / depth, 0.0, 1.0);
    #ifdef NEAR_BLUR
        float nearRange = params.x - params.y * 0.5;
        float cocNear = clamp(nearRange / depth - 1.0, 0.0, 1.0);
    #else
        float cocNear = 0.0;
    #endif
    gl_FragColor = vec4(cocFar, cocNear, 0.0, 0.0);
}
`;

const COC_WGSL = /* wgsl */`
#include "screenDepthPS"
varying uv0: vec2f;
uniform params: vec3f;
uniform uDemoCocCamera: vec4f;
uniform uDemoCocRight: vec3f;
uniform uDemoCocUp: vec3f;
uniform uDemoCocForward: vec3f;
uniform uDemoCocLens: vec4f;
@fragment
fn fragmentMain(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;
    var depth = getLinearScreenDepth(uv0);
    if (uniform.uDemoCocLens.z > 0.5 && uniform.uDemoCocCamera.y > uniform.uDemoCocCamera.w) {
        let ndc = getImageEffectUV(uv0) * 2.0 - vec2f(1.0);
        let ray = uniform.uDemoCocForward + uniform.uDemoCocRight * (ndc.x * uniform.uDemoCocLens.x)
            + uniform.uDemoCocUp * (ndc.y * uniform.uDemoCocLens.y);
        if (ray.y < -0.00001) {
            let waterDepth = (uniform.uDemoCocCamera.w - uniform.uDemoCocCamera.y) / ray.y;
            if (waterDepth >= uniform.uDemoCocLens.w) { depth = min(depth, waterDepth); }
        }
    }
    depth = max(depth, 0.0001);
    let farRange = uniform.params.x + uniform.params.y * 0.5;
    let cocFar = clamp(1.0 - farRange / depth, 0.0, 1.0);
    #ifdef NEAR_BLUR
        let nearRange = uniform.params.x - uniform.params.y * 0.5;
        let cocNear = clamp(nearRange / depth - 1.0, 0.0, 1.0);
    #else
        let cocNear = 0.0;
    #endif
    output.color = vec4f(cocFar, cocNear, 0.0, 0.0);
    return output;
}
`;

class WaterFocusFramePass extends FramePassCameraFrame {
    setupDofPass(options, inputTexture, inputTextureHalf) {
        super.setupDofPass(options, inputTexture, inputTextureHalf);
        const pass = this.dofPass?.cocPass;
        if (!pass) return;
        const defines = new Map();
        if (options.dofNearBlur) defines.set('NEAR_BLUR', '');
        const depthKey = ShaderUtils.addScreenDepthChunkDefines(this.cameraComponent.shaderParams, defines);
        pass.shader = ShaderUtils.createShader(this.device, {
            uniqueName: `DemoWaterFocusCoC-${options.dofNearBlur}${depthKey}`,
            attributes: { aPosition: SEMANTIC_POSITION }, vertexChunk: 'quadVS',
            fragmentGLSL: COC_GLSL, fragmentWGSL: COC_WGSL, fragmentDefines: defines
        });
        const names = ['Camera', 'Right', 'Up', 'Forward', 'Lens'];
        const handles = names.map(name => this.device.scope.resolve(`uDemoCoc${name}`));
        const values = names.map(name => new Float32Array(name === 'Camera' || name === 'Lens' ? 4 : 3));
        const before = pass.before?.bind(pass);
        pass.before = () => {
            before?.();
            const camera = this.cameraComponent, entity = camera.entity;
            const position = entity.getPosition();
            values[0].set([position.x, position.y, position.z, this.cameraFrame.seaLevel ?? 0]);
            const basis = [entity.right, entity.up, entity.forward];
            for (let i = 0; i < basis.length; i++) values[i + 1].set([basis[i].x, basis[i].y, basis[i].z]);
            const tanHalf = Math.tan(camera.fov * Math.PI / 360);
            const aspect = Math.max(camera.aspectRatio, 1e-6);
            const tanX = camera.horizontalFov ? tanHalf : tanHalf * aspect;
            const tanY = camera.horizontalFov ? tanHalf / aspect : tanHalf;
            const supported = camera.projection === PROJECTION_PERSPECTIVE && !camera.calculateProjection;
            values[4].set([tanX, tanY, this.cameraFrame.waterFocus && supported ? 1 : 0, camera.nearClip]);
            for (let i = 0; i < handles.length; i++) handles[i].setValue(values[i]);
        };
    }
}

class WaterFocusEngineFrame extends CameraFrame$1 {
    waterFocus = false;
    seaLevel = 0;
    createRenderPass() {
        return new WaterFocusFramePass(this.app, this, this.cameraComponent, this.options);
    }
}

/**
 * CameraFrame settings remain inherited. Enable waterFocus only for the calm close buoy shot:
 * displaced wave crests, underwater views and arbitrary transparent objects need actual depth.
 * Uses the documented CameraFrame/FramePassCameraFrame extension points; no engine internals.
 */
class CinematicFrame extends CameraFrame {
    static scriptName = 'cinematicFrame';
    waterFocus = false;
    seaLevel = 0;

    initialize() {
        this.engineCameraFrame = new WaterFocusEngineFrame(this.app, this.entity.camera);
        this.on('enable', () => { this.engineCameraFrame.enabled = true; });
        this.on('disable', () => { this.engineCameraFrame.enabled = false; });
        this.on('destroy', () => { this.engineCameraFrame.destroy(); });
        this.on('state', enabled => { this.engineCameraFrame.enabled = enabled; });
    }

    postUpdate(dt) {
        this.engineCameraFrame.waterFocus = this.waterFocus;
        this.engineCameraFrame.seaLevel = this.seaLevel;
        super.postUpdate(dt);
    }
}

/** Wave-driven, filtered inverse-refraction caustics shared by surface and opaque receivers. */
const CAUSTICS_GLSL = /* glsl */`
uniform sampler2D uCaustWave0;
uniform sampler2D uCaustWave1;
uniform vec2 uCaustWaveScales;
uniform vec3 uCaustWaveSettings; // amplitude, choppiness, texture resolution

vec3 waterCausticSunRay(vec3 sunDirection) {
    return refract(-sunDirection, vec3(0.0, 1.0, 0.0), 0.75187969);
}
vec3 waterCausticNormal(vec2 p, float footprint) {
    vec4 d = vec4(0.0);
    d += textureLod(uCaustWave0, p * uCaustWaveScales.x, max(0.0, log2(max(footprint * uCaustWaveScales.x * uCaustWaveSettings.z, 1.0))));
    d += textureLod(uCaustWave1, p * uCaustWaveScales.y, max(0.0, log2(max(footprint * uCaustWaveScales.y * uCaustWaveSettings.z, 1.0))));
    d *= uCaustWaveSettings.x;
    vec2 slope = d.xy / max(vec2(1.0) + d.zw * uCaustWaveSettings.y, vec2(0.2));
    return normalize(vec3(-slope.x, 1.0, -slope.y));
}
vec2 waterCausticOffset(vec2 p, float depth, float footprint, vec3 sun) {
    vec3 ray = refract(-sun, waterCausticNormal(p, footprint), 0.75187969);
    return ray.xz * depth / max(-ray.y, 0.2);
}
float waterCausticFocus(vec2 entry, float depth, float scale, vec3 sun, float pixelMetres) {
    if (uCaustWaveSettings.x <= 0.0 || depth <= 0.0) return 1.0;
    // Filter to the solar disc / pixel footprint. Scale selects a wave footprint, never a
    // second pattern frequency. Positions and time always come from the live FFT field.
    float epsilon = max(max(pixelMetres * 1.5, depth * 0.00465), 0.12 / max(scale, 0.1));
    vec3 flatRay = waterCausticSunRay(sun);
    vec2 receiver = entry + flatRay.xz * depth / max(-flatRay.y, 0.2);
    vec2 p = entry;
    // Bounded inverse refraction: follow the wave's ray landing toward this receiver.
    for (int i = 0; i < 2; i++) {
        vec2 error = p + waterCausticOffset(p, depth, epsilon, sun) - receiver;
        p -= clamp(error, vec2(-epsilon * 2.0), vec2(epsilon * 2.0)) * 0.65;
    }
    vec2 dx = (waterCausticOffset(p + vec2(epsilon, 0.0), depth, epsilon, sun)
             - waterCausticOffset(p - vec2(epsilon, 0.0), depth, epsilon, sun)) / (2.0 * epsilon);
    vec2 dz = (waterCausticOffset(p + vec2(0.0, epsilon), depth, epsilon, sun)
             - waterCausticOffset(p - vec2(0.0, epsilon), depth, epsilon, sun)) / (2.0 * epsilon);
    float determinant = (1.0 + dx.x) * (1.0 + dz.y) - dx.y * dz.x;
    // Finite source regularization: flat water returns exactly one, convergence brightens,
    // divergence darkens. Multiple overlapping ray paths are still an approximation.
    float irradiance = min(3.5, sqrt(1.05) / sqrt(determinant * determinant + 0.05));
    return mix(1.0, irradiance, 1.0 - smoothstep(0.3, 1.2, pixelMetres));
}
`;

const CAUSTICS_WGSL = /* wgsl */`
var uCaustWave0: texture_2d<f32>;
var uCaustWave0Sampler: sampler;
var uCaustWave1: texture_2d<f32>;
var uCaustWave1Sampler: sampler;
uniform uCaustWaveScales: vec2f;
uniform uCaustWaveSettings: vec3f; // amplitude, choppiness, texture resolution

fn waterCausticSunRay(sunDirection: vec3f) -> vec3f {
    return refract(-sunDirection, vec3f(0.0, 1.0, 0.0), 0.75187969);
}
fn waterCausticNormal(p: vec2f, footprint: f32) -> vec3f {
    var d = vec4f(0.0);
    d += textureSampleLevel(uCaustWave0, uCaustWave0Sampler, p * uniform.uCaustWaveScales.x, max(0.0, log2(max(footprint * uniform.uCaustWaveScales.x * uniform.uCaustWaveSettings.z, 1.0))));
    d += textureSampleLevel(uCaustWave1, uCaustWave1Sampler, p * uniform.uCaustWaveScales.y, max(0.0, log2(max(footprint * uniform.uCaustWaveScales.y * uniform.uCaustWaveSettings.z, 1.0))));
    d *= uniform.uCaustWaveSettings.x;
    var slope = d.xy / max(vec2f(1.0) + d.zw * uniform.uCaustWaveSettings.y, vec2f(0.2));
    return normalize(vec3f(-slope.x, 1.0, -slope.y));
}
fn waterCausticOffset(p: vec2f, depth: f32, footprint: f32, sun: vec3f) -> vec2f {
    var ray = refract(-sun, waterCausticNormal(p, footprint), 0.75187969);
    return ray.xz * depth / max(-ray.y, 0.2);
}
fn waterCausticFocus(entry: vec2f, depth: f32, scale: f32, sun: vec3f, pixelMetres: f32) -> f32 {
    if (uniform.uCaustWaveSettings.x <= 0.0 || depth <= 0.0) { return 1.0; }
    // Filter to the solar disc / pixel footprint. Scale selects a wave footprint, never a
    // second pattern frequency. Positions and time always come from the live FFT field.
    var epsilon = max(max(pixelMetres * 1.5, depth * 0.00465), 0.12 / max(scale, 0.1));
    var flatRay = waterCausticSunRay(sun);
    var receiver = entry + flatRay.xz * depth / max(-flatRay.y, 0.2);
    var p = entry;
    // Bounded inverse refraction: follow the wave's ray landing toward this receiver.
    for (var i = 0; i < 2; i++) {
        var error = p + waterCausticOffset(p, depth, epsilon, sun) - receiver;
        p -= clamp(error, vec2f(-epsilon * 2.0), vec2f(epsilon * 2.0)) * 0.65;
    }
    var dx = (waterCausticOffset(p + vec2f(epsilon, 0.0), depth, epsilon, sun)
             - waterCausticOffset(p - vec2f(epsilon, 0.0), depth, epsilon, sun)) / (2.0 * epsilon);
    var dz = (waterCausticOffset(p + vec2f(0.0, epsilon), depth, epsilon, sun)
             - waterCausticOffset(p - vec2f(0.0, epsilon), depth, epsilon, sun)) / (2.0 * epsilon);
    var determinant = (1.0 + dx.x) * (1.0 + dz.y) - dx.y * dz.x;
    // Finite source regularization: flat water returns exactly one, convergence brightens,
    // divergence darkens. Multiple overlapping ray paths are still an approximation.
    var irradiance = min(3.5, sqrt(1.05) / sqrt(determinant * determinant + 0.05));
    return mix(1.0, irradiance, 1.0 - smoothstep(0.3, 1.2, pixelMetres));
}
`;

// Reuse the surface's derivative bindings: WGSL does not expand GLSL-style aliases.
const SURFACE_CAUSTICS_GLSL = CAUSTICS_GLSL
    .replace(/uniform sampler2D uCaustWave[01];\n/g, '')
    .replace(/uCaustWave([01])/g, (_, i) => `uDeriv${Number(i) + 2}`);
const SURFACE_CAUSTICS_WGSL = CAUSTICS_WGSL
    .replace(/var uCaustWave[01](?:Sampler)?: [^;]+;\n/g, '')
    .replace(/uCaustWave([01])/g, (_, i) => `uDeriv${Number(i) + 2}`);

const attached = new WeakSet();

/** Short-wave curvature dominates shallow caustics. Bind the two finest live FFT bands,
 * leaving a StandardMaterial enough samplers for its own PBR maps and cascaded shadows. */
function bindCausticWaves(material, simulation, config) {
    const scales = [];
    for (let i = 0; i < 2; i++) {
        const j = Math.max(0, simulation.lengthScales.length - 2 + i);
        material.setParameter(`uCaustWave${i}`, simulation.derivativeTextures[j]);
        scales.push(1 / simulation.lengthScales[j]);
    }
    material.setParameter('uCaustWaveScales', scales);
    material.setParameter('uCaustWaveSettings', [config.waves.amplitude, config.waves.choppiness, simulation.params.size]);
}

const FOG_GLSL = /* glsl */`
uniform vec3 fog_color;
#if FOG == LINEAR
uniform float fog_start;
uniform float fog_end;
#else
uniform float fog_density;
#endif
uniform vec3 uReceiverExtinction;
uniform vec3 uReceiverScatter;
uniform vec3 uReceiverSun;
uniform vec3 uReceiverSunColor;
uniform vec4 uReceiverParams; // sea level, caustic strength, footprint scale, exposure
uniform sampler2D uReceiverSky;
float dBlendModeFogFactor = 1.0;
${CAUSTICS_GLSL}
vec3 addFog(vec3 color) {
    float distanceMetres = distance(view_position, vPositionW);
    if (view_position.y >= uReceiverParams.x) {
        #if FOG == NONE
            return color;
        #elif FOG == LINEAR
            float transmittance = clamp((fog_end - distanceMetres) / max(fog_end - fog_start, 0.001), 0.0, 1.0);
        #elif FOG == EXP
            float transmittance = exp(-distanceMetres * fog_density);
        #else
            float transmittance = exp(-pow(distanceMetres * fog_density, 2.0));
        #endif
        #if FOG != NONE
        return mix(fog_color * dBlendModeFogFactor, color, transmittance);
        #endif
    }
    float depth = max(uReceiverParams.x - vPositionW.y, 0.0);
    float pixelMetres = max(length(dFdx(vPositionW.xz)), length(dFdy(vPositionW.xz)));
    vec3 sunRay = waterCausticSunRay(uReceiverSun);
    float sunPath = depth / max(-sunRay.y, 0.2);
    vec3 ambient = textureLod(uReceiverSky, vec2(0.5, 0.1), 0.0).rgb * uReceiverParams.w;
    float sunUp = max(uReceiverSun.y, 0.0);
    if (uReceiverParams.y > 0.0 && depth > 0.0 && sunUp > 0.0) {
        vec2 entry = vPositionW.xz - sunRay.xz * sunPath;
        float focus = waterCausticFocus(entry, depth, uReceiverParams.z, uReceiverSun, pixelMetres);
        float direct = dot(uReceiverSunColor, vec3(0.2126, 0.7152, 0.0722)) * sunUp;
        float fraction = direct / max(direct + dot(ambient, vec3(0.2126, 0.7152, 0.0722)) * 3.14159, 0.001);
        color *= max(0.0, 1.0 + (focus - 1.0) * uReceiverParams.y * fraction);
    }
    // Light loses red on its way to the floor as well as on its way back to the viewer.
    color *= exp(-uReceiverExtinction * sunPath);
    float cameraDepth = max(uReceiverParams.x - view_position.y, 0.0);
    if (vPositionW.y > uReceiverParams.x) distanceMetres *= cameraDepth / max(vPositionW.y - view_position.y, 0.001);
    vec3 scatter = uReceiverScatter * (ambient + uReceiverSunColor * sunUp * 0.3183)
        * exp(-uReceiverExtinction * cameraDepth);
    vec3 transmittance = exp(-uReceiverExtinction * distanceMetres);
    return color * transmittance + scatter * (vec3(1.0) - transmittance);
}
`;

const FOG_WGSL = /* wgsl */`
uniform fog_color: vec3f;
#if FOG == LINEAR
uniform fog_start: f32;
uniform fog_end: f32;
#else
uniform fog_density: f32;
#endif
uniform uReceiverExtinction: vec3f;
uniform uReceiverScatter: vec3f;
uniform uReceiverSun: vec3f;
uniform uReceiverSunColor: vec3f;
uniform uReceiverParams: vec4f;
var uReceiverSky: texture_2d<f32>;
var uReceiverSkySampler: sampler;
var<private> dBlendModeFogFactor: f32 = 1.0;
${CAUSTICS_WGSL}
fn addFog(source: vec3f) -> vec3f {
    var color = source;
    var distanceMetres = distance(uniform.view_position, vPositionW);
    if (uniform.view_position.y >= uniform.uReceiverParams.x) {
        #if FOG == NONE
            return color;
        #elif FOG == LINEAR
            let transmittance = clamp((uniform.fog_end - distanceMetres) / max(uniform.fog_end - uniform.fog_start, 0.001), 0.0, 1.0);
        #elif FOG == EXP
            let transmittance = exp(-distanceMetres * uniform.fog_density);
        #else
            let transmittance = exp(-pow(distanceMetres * uniform.fog_density, 2.0));
        #endif
        #if FOG != NONE
        return mix(uniform.fog_color * dBlendModeFogFactor, color, transmittance);
        #endif
    }
    let depth = max(uniform.uReceiverParams.x - vPositionW.y, 0.0);
    let pixelMetres = max(length(dpdx(vPositionW.xz)), length(dpdy(vPositionW.xz)));
    let sunRay = waterCausticSunRay(uniform.uReceiverSun);
    let sunPath = depth / max(-sunRay.y, 0.2);
    let ambient = textureSampleLevel(uReceiverSky, uReceiverSkySampler, vec2f(0.5, 0.1), 0.0).rgb * uniform.uReceiverParams.w;
    let sunUp = max(uniform.uReceiverSun.y, 0.0);
    if (uniform.uReceiverParams.y > 0.0 && depth > 0.0 && sunUp > 0.0) {
        let entry = vPositionW.xz - sunRay.xz * sunPath;
        let focus = waterCausticFocus(entry, depth, uniform.uReceiverParams.z, uniform.uReceiverSun, pixelMetres);
        let direct = dot(uniform.uReceiverSunColor, vec3f(0.2126, 0.7152, 0.0722)) * sunUp;
        let fraction = direct / max(direct + dot(ambient, vec3f(0.2126, 0.7152, 0.0722)) * 3.14159, 0.001);
        color *= max(0.0, 1.0 + (focus - 1.0) * uniform.uReceiverParams.y * fraction);
    }
    color *= exp(-uniform.uReceiverExtinction * sunPath);
    let cameraDepth = max(uniform.uReceiverParams.x - uniform.view_position.y, 0.0);
    if (vPositionW.y > uniform.uReceiverParams.x) { distanceMetres *= cameraDepth / max(vPositionW.y - uniform.view_position.y, 0.001); }
    let scatter = uniform.uReceiverScatter * (ambient + uniform.uReceiverSunColor * sunUp * 0.3183)
        * exp(-uniform.uReceiverExtinction * cameraDepth);
    let transmittance = exp(-uniform.uReceiverExtinction * distanceMetres);
    return color * transmittance + scatter * (vec3f(1.0) - transmittance);
}
`;

function attachReceiver(material) {
    if (attached.has(material)) throw new Error('Material already belongs to another water receiver');
    attached.add(material);
    const { glsl, wgsl } = material.shaderChunks;
    const previous = [glsl.get('fogPS'), wgsl.get('fogPS')];
    glsl.set('fogPS', FOG_GLSL);
    wgsl.set('fogPS', FOG_WGSL);
    material.update();
    return () => {
        attached.delete(material);
        for (const [i, chunks] of [glsl, wgsl].entries()) {
            if (previous[i] === undefined) chunks.delete('fogPS');
            else chunks.set('fogPS', previous[i]);
        }
        for (const name of ['uCaustWave0', 'uCaustWave1', 'uCaustWaveScales', 'uCaustWaveSettings', 'uReceiverExtinction', 'uReceiverScatter', 'uReceiverSun', 'uReceiverSunColor', 'uReceiverParams', 'uReceiverSky']) material.deleteParameter(name);
        material.update();
    };
}

// Shared GLSL for the ocean spectrum / FFT simulation (WebGL2 fragment path).
// Math follows Horvath 2015 "Empirical directional wave spectra for computer graphics"
// (JONSWAP + TMA shallow-water correction, Hasselmann / Donelan-Banner directional spreading)
// as popularised by the gasgiant / Jump Trajectory FFT ocean and the Sea of Thieves talk.

const SIM_MATH_GLSL = /* glsl */`
#define PI 3.14159265358979
#define TWO_PI 6.28318530717959

// ---- integer hash -> uniform floats (pcg3d, Jarzynski & Olano 2020) ----
uvec3 pcg3d(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    return v;
}
vec3 hash3(uvec3 p) {
    return vec3(pcg3d(p)) * (1.0 / 4294967296.0);
}
// two independent standard normal variates (Box-Muller)
vec2 gaussian2(uvec2 texel, uint seed) {
    vec3 r = hash3(uvec3(texel, seed));
    float u1 = max(r.x, 1e-7);
    float u2 = r.y;
    float mag = sqrt(-2.0 * log(u1));
    return vec2(mag * cos(TWO_PI * u2), mag * sin(TWO_PI * u2));
}

// ---- dispersion (finite depth) ----
float dispersion(float k, float g, float depth) {
    return sqrt(g * k * tanh(min(k * depth, 20.0)));
}
float dispersionDerivative(float k, float g, float depth) {
    float th = tanh(min(k * depth, 20.0));
    float ch = cosh(min(k * depth, 20.0));
    return g * (depth * k / (ch * ch) + th) / dispersion(k, g, depth) * 0.5;
}

// ---- directional spreading ----
float normalisationFactor(float s) {
    float s2 = s * s, s3 = s2 * s, s4 = s3 * s;
    if (s < 5.0) return -0.000564 * s4 + 0.00776 * s3 - 0.044 * s2 + 0.192 * s + 0.163;
    return -4.80e-08 * s4 + 1.07e-05 * s3 - 9.53e-04 * s2 + 5.90e-02 * s + 3.93e-01;
}
float cosine2s(float theta, float s) {
    return normalisationFactor(s) * pow(abs(cos(0.5 * theta)), 2.0 * s);
}
float spreadPower(float omega, float peakOmega) {
    if (omega > peakOmega) return 9.77 * pow(abs(omega / peakOmega), -2.5);
    return 6.97 * pow(abs(omega / peakOmega), 5.0);
}

// spectrum parameter block:
//   p0 = (scale, angle, spreadBlend, swell)
//   p1 = (alpha, peakOmega, gamma, shortWavesFade)
float directionSpectrum(float theta, float omega, vec4 p0, vec4 p1) {
    float s = spreadPower(omega, p1.y) + 16.0 * tanh(min(omega / p1.y, 20.0)) * p0.w * p0.w;
    float c = cos(theta);
    return mix(2.0 / PI * c * c, cosine2s(theta - p0.y, s), p0.z);
}
float tmaCorrection(float omega, float g, float depth) {
    float omegaH = omega * sqrt(depth / g);
    if (omegaH <= 1.0) return 0.5 * omegaH * omegaH;
    if (omegaH < 2.0) return 1.0 - 0.5 * (2.0 - omegaH) * (2.0 - omegaH);
    return 1.0;
}
float jonswap(float omega, float g, float depth, vec4 p0, vec4 p1) {
    float peakOmega = p1.y;
    float sigma = omega <= peakOmega ? 0.07 : 0.09;
    float d = (omega - peakOmega) / (sigma * peakOmega);
    float r = exp(-0.5 * d * d);
    float invOmega = 1.0 / omega;
    float pk = peakOmega * invOmega;
    return p0.x * tmaCorrection(omega, g, depth) * p1.x * g * g
         * invOmega * invOmega * invOmega * invOmega * invOmega
         * exp(-1.25 * pk * pk * pk * pk)
         * pow(abs(p1.z), r);
}
float shortWavesFade(float k, vec4 p1) {
    return exp(-p1.w * p1.w * k * k);
}

// complex helpers
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 cconj(vec2 a) { return vec2(a.x, -a.y); }
`;

// Full-screen quad vertex shader (engine chunk 'quadVS' provides aPosition / uv0)
const SIM_QUAD_VS = /* glsl */`
attribute vec2 aPosition;
varying vec2 uv0;
void main(void) {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    uv0 = (aPosition.xy + 1.0) * 0.5;
}
`;

// ---------------------------------------------------------------------------
// Pass 1: initial spectrum H0(k) and conj(H0(-k)) -> RGBA32F
// ---------------------------------------------------------------------------
const SPECTRUM_FS = /* glsl */`
${SIM_MATH_GLSL}
uniform int   uSize;
uniform float uLengthScale;
uniform float uCutoffLow;
uniform float uCutoffHigh;
uniform float uDepth;
uniform float uGravity;
uniform int   uSeed;
uniform vec4  uSpecA0, uSpecA1, uSpecB0, uSpecB1;

vec2 h0(ivec2 texel) {
    int n = uSize;
    float deltaK = TWO_PI / uLengthScale;
    int nx = texel.x < n / 2 ? texel.x : texel.x - n;
    int nz = texel.y < n / 2 ? texel.y : texel.y - n;
    vec2 k = vec2(float(nx), float(nz)) * deltaK;
    float kLen = length(k);
    if (kLen < uCutoffLow || kLen > uCutoffHigh || kLen < 1e-6) return vec2(0.0);

    float kAngle = atan(k.y, k.x);
    float omega = dispersion(kLen, uGravity, uDepth);
    float dOmegadk = dispersionDerivative(kLen, uGravity, uDepth);

    float spectrum = jonswap(omega, uGravity, uDepth, uSpecA0, uSpecA1)
                   * directionSpectrum(kAngle, omega, uSpecA0, uSpecA1)
                   * shortWavesFade(kLen, uSpecA1);
    if (uSpecB0.x > 0.0) {
        spectrum += jonswap(omega, uGravity, uDepth, uSpecB0, uSpecB1)
                  * directionSpectrum(kAngle, omega, uSpecB0, uSpecB1)
                  * shortWavesFade(kLen, uSpecB1);
    }
    vec2 xi = gaussian2(uvec2(texel), uint(uSeed));
    // h0 = (xi_r + i xi_i)/sqrt(2) * sqrt(Ph),  Ph = Psi(k) dk^2 / 2  =>  calibrated so that
    // the ensemble height variance equals the integral of the directional spectrum.
    return xi * 0.5 * sqrt(spectrum * abs(dOmegadk) / kLen * deltaK * deltaK);
}

void main(void) {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    ivec2 mirror = ivec2((uSize - texel.x) % uSize, (uSize - texel.y) % uSize);
    vec2 a = h0(texel);
    vec2 b = h0(mirror);
    gl_FragColor = vec4(a, cconj(b));
}
`;

// ---------------------------------------------------------------------------
// Pass 2: time evolution. Packs 8 real fields into 4 complex spectra (2 x RGBA32F):
//   out0 = ( Dx + i Dz ,  Dy + i dDx/dz )
//   out1 = ( dDy/dx + i dDy/dz ,  dDx/dx + i dDz/dz )
// ---------------------------------------------------------------------------
const EVOLVE_FS = /* glsl */`
${SIM_MATH_GLSL}
uniform sampler2D uSpectrum;
uniform int   uSize;
uniform float uLengthScale;
uniform float uDepth;
uniform float uGravity;
uniform float uTime;

void main(void) {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    vec4 s = texelFetch(uSpectrum, texel, 0);
    int n = uSize;
    float deltaK = TWO_PI / uLengthScale;
    int nx = texel.x < n / 2 ? texel.x : texel.x - n;
    int nz = texel.y < n / 2 ? texel.y : texel.y - n;
    vec2 k = vec2(float(nx), float(nz)) * deltaK;
    float kLen = length(k);
    float invK = kLen > 1e-6 ? 1.0 / kLen : 0.0;
    float omega = dispersion(max(kLen, 1e-6), uGravity, uDepth);
    float phase = omega * uTime;
    vec2 e = vec2(cos(phase), sin(phase));
    vec2 h = cmul(s.xy, e) + cmul(s.zw, cconj(e));   // height spectrum h(k,t)
    vec2 ih = vec2(-h.y, h.x);                         // i*h

    // Horizontal displacement. Tessendorf writes D = sum -i (k/|k|) h e^{ikx} and then applies it
    // with a *negative* lambda; with the positive choppiness this simulation exposes, that sign
    // pushes surface points away from the crests and piles them into the troughs — sharp troughs,
    // broad crests, and whitecaps in the wrong place. So the sign is folded in here: +i (k/|k|) h,
    // which is the Gerstner convergence (points crowd the crest) for lambda > 0. The second
    // derivatives of D follow the same sign.
    vec2 Dx  = k.x * invK * ih;
    vec2 Dz  = k.y * invK * ih;
    vec2 Dy  = h;
    vec2 dyx = k.x * ih;
    vec2 dyz = k.y * ih;
    vec2 dxx = -k.x * k.x * invK * h;
    vec2 dzz = -k.y * k.y * invK * h;
    vec2 dxz = -k.x * k.y * invK * h;

    pcFragColor0 = vec4(Dx + vec2(-Dz.y, Dz.x),  Dy + vec2(-dxz.y, dxz.x));
    pcFragColor1 = vec4(dyx + vec2(-dyz.y, dyz.x), dxx + vec2(-dzz.y, dzz.x));
}
`;

// ---------------------------------------------------------------------------
// Pass 3: radix-2 Cooley-Tukey (decimation in time) inverse FFT, one stage per pass,
// horizontal then vertical. Bit-reversal permutation is folded into stage 0.
// Operates on two RGBA32F textures = four complex signals at once.
// ---------------------------------------------------------------------------
const FFT_FS = /* glsl */`
uniform sampler2D uIn0;
uniform sampler2D uIn1;
uniform int uSize;
uniform int uLog2Size;
uniform int uStage;       // 0 .. log2Size-1
uniform int uVertical;    // 0 = rows, 1 = columns

int bitReverse(int x) {
    int r = 0;
    for (int i = 0; i < uLog2Size; i++) {
        r = (r << 1) | (x & 1);
        x >>= 1;
    }
    return r;
}

void main(void) {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    int x = uVertical == 1 ? texel.y : texel.x;
    int hs = 1 << uStage;
    int len = hs << 1;
    int k = x & (len - 1);
    bool upper = k >= hs;
    int j = upper ? k - hs : k;
    int i0 = upper ? x - hs : x;
    int i1 = i0 + hs;
    if (uStage == 0) { i0 = bitReverse(i0); i1 = bitReverse(i1); }

    ivec2 t0 = uVertical == 1 ? ivec2(texel.x, i0) : ivec2(i0, texel.y);
    ivec2 t1 = uVertical == 1 ? ivec2(texel.x, i1) : ivec2(i1, texel.y);

    float ang = 6.28318530717959 * float(j) / float(len);   // inverse transform: +i
    vec2 w = vec2(cos(ang), sin(ang));

    vec4 a0 = texelFetch(uIn0, t0, 0);
    vec4 b0 = texelFetch(uIn0, t1, 0);
    vec4 a1 = texelFetch(uIn1, t0, 0);
    vec4 b1 = texelFetch(uIn1, t1, 0);

    // complex multiply each of the 4 complex numbers by w
    vec4 wb0 = vec4(b0.x * w.x - b0.y * w.y, b0.x * w.y + b0.y * w.x,
                    b0.z * w.x - b0.w * w.y, b0.z * w.y + b0.w * w.x);
    vec4 wb1 = vec4(b1.x * w.x - b1.y * w.y, b1.x * w.y + b1.y * w.x,
                    b1.z * w.x - b1.w * w.y, b1.z * w.y + b1.w * w.x);

    pcFragColor0 = upper ? a0 - wb0 : a0 + wb0;
    pcFragColor1 = upper ? a1 - wb1 : a1 + wb1;
}
`;

// ---------------------------------------------------------------------------
// Pass 4: assemble displacement / derivative maps + temporal foam (Jacobian).
//   displacement = (lambda*Dx, Dy, lambda*Dz, turbulence)
//   derivatives  = (dDy/dx, dDy/dz, dDx/dx, dDz/dz)
// ---------------------------------------------------------------------------
const ASSEMBLE_FS = /* glsl */`
uniform sampler2D uIn0;
uniform sampler2D uIn1;
uniform sampler2D uPrevDisplacement;
uniform float uLambda;
uniform float uDeltaTime;
uniform float uFoamDecay;   // recovery rate of the Jacobian (1/s)
uniform float uFoamReset;   // 1 = ignore history (first frame after a rebuild)

void main(void) {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    vec4 a = texelFetch(uIn0, texel, 0);
    vec4 b = texelFetch(uIn1, texel, 0);
    float Dx = a.x, Dz = a.y, Dy = a.z, dxz = a.w;
    float dyx = b.x, dyz = b.y, dxx = b.z, dzz = b.w;

    float jacobian = (1.0 + uLambda * dxx) * (1.0 + uLambda * dzz) - uLambda * uLambda * dxz * dxz;
    float prev = texelFetch(uPrevDisplacement, texel, 0).w;
    float turb = min(jacobian, prev + uDeltaTime * uFoamDecay / max(jacobian, 0.5));
    if (uFoamReset > 0.5) turb = jacobian;

    pcFragColor0 = vec4(uLambda * Dx, Dy, uLambda * Dz, turb);
    pcFragColor1 = vec4(dyx, dyz, dxx, dzz);
}
`;

// WGSL compute kernels for the ocean spectrum / FFT simulation (WebGPU path).
// Same math and data layout as simCommon.glsl.js — see that file for the derivation.

const SIM_MATH_WGSL = /* wgsl */`
const PI: f32 = 3.14159265358979;
const TWO_PI: f32 = 6.28318530717959;

fn pcg3d(vIn: vec3u) -> vec3u {
    var v = vIn * 1664525u + 1013904223u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    v ^= v >> vec3u(16u);
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    return v;
}
fn hash3(p: vec3u) -> vec3f {
    return vec3f(pcg3d(p)) * (1.0 / 4294967296.0);
}
fn gaussian2(texel: vec2u, seed: u32) -> vec2f {
    let r = hash3(vec3u(texel, seed));
    let u1 = max(r.x, 1e-7);
    let u2 = r.y;
    let mag = sqrt(-2.0 * log(u1));
    return vec2f(mag * cos(TWO_PI * u2), mag * sin(TWO_PI * u2));
}
fn dispersion(k: f32, g: f32, depth: f32) -> f32 {
    return sqrt(g * k * tanh(min(k * depth, 20.0)));
}
fn dispersionDerivative(k: f32, g: f32, depth: f32) -> f32 {
    let th = tanh(min(k * depth, 20.0));
    let ch = cosh(min(k * depth, 20.0));
    return g * (depth * k / (ch * ch) + th) / dispersion(k, g, depth) * 0.5;
}
fn normalisationFactor(s: f32) -> f32 {
    let s2 = s * s; let s3 = s2 * s; let s4 = s3 * s;
    if (s < 5.0) { return -0.000564 * s4 + 0.00776 * s3 - 0.044 * s2 + 0.192 * s + 0.163; }
    return -4.80e-08 * s4 + 1.07e-05 * s3 - 9.53e-04 * s2 + 5.90e-02 * s + 3.93e-01;
}
fn cosine2s(theta: f32, s: f32) -> f32 {
    return normalisationFactor(s) * pow(abs(cos(0.5 * theta)), 2.0 * s);
}
fn spreadPower(omega: f32, peakOmega: f32) -> f32 {
    if (omega > peakOmega) { return 9.77 * pow(abs(omega / peakOmega), -2.5); }
    return 6.97 * pow(abs(omega / peakOmega), 5.0);
}
fn directionSpectrum(theta: f32, omega: f32, p0: vec4f, p1: vec4f) -> f32 {
    let s = spreadPower(omega, p1.y) + 16.0 * tanh(min(omega / p1.y, 20.0)) * p0.w * p0.w;
    let c = cos(theta);
    return mix(2.0 / PI * c * c, cosine2s(theta - p0.y, s), p0.z);
}
fn tmaCorrection(omega: f32, g: f32, depth: f32) -> f32 {
    let omegaH = omega * sqrt(depth / g);
    if (omegaH <= 1.0) { return 0.5 * omegaH * omegaH; }
    if (omegaH < 2.0) { return 1.0 - 0.5 * (2.0 - omegaH) * (2.0 - omegaH); }
    return 1.0;
}
fn jonswap(omega: f32, g: f32, depth: f32, p0: vec4f, p1: vec4f) -> f32 {
    let peakOmega = p1.y;
    let sigma = select(0.09, 0.07, omega <= peakOmega);
    let d = (omega - peakOmega) / (sigma * peakOmega);
    let r = exp(-0.5 * d * d);
    let invOmega = 1.0 / omega;
    let pk = peakOmega * invOmega;
    return p0.x * tmaCorrection(omega, g, depth) * p1.x * g * g
         * invOmega * invOmega * invOmega * invOmega * invOmega
         * exp(-1.25 * pk * pk * pk * pk)
         * pow(abs(p1.z), r);
}
fn shortWavesFade(k: f32, p1: vec4f) -> f32 {
    return exp(-p1.w * p1.w * k * k);
}
fn cmul(a: vec2f, b: vec2f) -> vec2f { return vec2f(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
fn cconj(a: vec2f) -> vec2f { return vec2f(a.x, -a.y); }
fn cmul4(b: vec4f, w: vec2f) -> vec4f {
    return vec4f(b.x * w.x - b.y * w.y, b.x * w.y + b.y * w.x,
                 b.z * w.x - b.w * w.y, b.z * w.y + b.w * w.x);
}
`;

function spectrumCS(N) {
    return /* wgsl */`
${SIM_MATH_WGSL}
uniform uLengthScale: f32;
uniform uCutoffLow: f32;
uniform uCutoffHigh: f32;
uniform uDepth: f32;
uniform uGravity: f32;
uniform uSeed: u32;
uniform uSpecA0: vec4f;
uniform uSpecA1: vec4f;
uniform uSpecB0: vec4f;
uniform uSpecB1: vec4f;
var uOut: texture_storage_2d<rgba32float, write>;

fn h0(texel: vec2i) -> vec2f {
    let n = ${N};
    let deltaK = TWO_PI / uniform.uLengthScale;
    let nx = select(texel.x - n, texel.x, texel.x < n / 2);
    let nz = select(texel.y - n, texel.y, texel.y < n / 2);
    let k = vec2f(f32(nx), f32(nz)) * deltaK;
    let kLen = length(k);
    if (kLen < uniform.uCutoffLow || kLen > uniform.uCutoffHigh || kLen < 1e-6) { return vec2f(0.0); }
    let kAngle = atan2(k.y, k.x);
    let omega = dispersion(kLen, uniform.uGravity, uniform.uDepth);
    let dOmegadk = dispersionDerivative(kLen, uniform.uGravity, uniform.uDepth);
    var spectrum = jonswap(omega, uniform.uGravity, uniform.uDepth, uniform.uSpecA0, uniform.uSpecA1)
                 * directionSpectrum(kAngle, omega, uniform.uSpecA0, uniform.uSpecA1)
                 * shortWavesFade(kLen, uniform.uSpecA1);
    if (uniform.uSpecB0.x > 0.0) {
        spectrum += jonswap(omega, uniform.uGravity, uniform.uDepth, uniform.uSpecB0, uniform.uSpecB1)
                  * directionSpectrum(kAngle, omega, uniform.uSpecB0, uniform.uSpecB1)
                  * shortWavesFade(kLen, uniform.uSpecB1);
    }
    let xi = gaussian2(vec2u(texel), uniform.uSeed);
    return xi * 0.5 * sqrt(spectrum * abs(dOmegadk) / kLen * deltaK * deltaK);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let n = ${N};
    let texel = vec2i(gid.xy);
    if (texel.x >= n || texel.y >= n) { return; }
    let mirror = vec2i((n - texel.x) % n, (n - texel.y) % n);
    let a = h0(texel);
    let b = h0(mirror);
    textureStore(uOut, texel, vec4f(a, cconj(b)));
}
`;
}

function evolveCS(N) {
    return /* wgsl */`
${SIM_MATH_WGSL}
uniform uLengthScale: f32;
uniform uDepth: f32;
uniform uGravity: f32;
uniform uTime: f32;
var uSpectrum: texture_2d<f32>;
var uOut0: texture_storage_2d<rgba32float, write>;
var uOut1: texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let n = ${N};
    let texel = vec2i(gid.xy);
    if (texel.x >= n || texel.y >= n) { return; }
    let s = textureLoad(uSpectrum, texel, 0);
    let deltaK = TWO_PI / uniform.uLengthScale;
    let nx = select(texel.x - n, texel.x, texel.x < n / 2);
    let nz = select(texel.y - n, texel.y, texel.y < n / 2);
    let k = vec2f(f32(nx), f32(nz)) * deltaK;
    let kLen = length(k);
    let invK = select(0.0, 1.0 / kLen, kLen > 1e-6);
    let omega = dispersion(max(kLen, 1e-6), uniform.uGravity, uniform.uDepth);
    let phase = omega * uniform.uTime;
    let e = vec2f(cos(phase), sin(phase));
    let h = cmul(s.xy, e) + cmul(s.zw, cconj(e));
    let ih = vec2f(-h.y, h.x);

    // see the GLSL twin: +i (k/|k|) h so that positive choppiness crowds points onto the crests
    let Dx  = k.x * invK * ih;
    let Dz  = k.y * invK * ih;
    let Dy  = h;
    let dyx = k.x * ih;
    let dyz = k.y * ih;
    let dxx = -k.x * k.x * invK * h;
    let dzz = -k.y * k.y * invK * h;
    let dxz = -k.x * k.y * invK * h;

    textureStore(uOut0, texel, vec4f(Dx + vec2f(-Dz.y, Dz.x),  Dy + vec2f(-dxz.y, dxz.x)));
    textureStore(uOut1, texel, vec4f(dyx + vec2f(-dyz.y, dyz.x), dxx + vec2f(-dzz.y, dzz.x)));
}
`;
}

// One workgroup per row (or column); the entire 1D inverse FFT runs in workgroup memory.
// Each thread performs one butterfly per stage, so workgroup size = N/2.
function fftCS(N) {
    const log2N = Math.log2(N) | 0;
    const WG = N / 2;
    return /* wgsl */`
${SIM_MATH_WGSL}
uniform uVertical: u32;
var uIn0: texture_2d<f32>;
var uIn1: texture_2d<f32>;
var uOut0: texture_storage_2d<rgba32float, write>;
var uOut1: texture_storage_2d<rgba32float, write>;

var<workgroup> s0: array<vec4f, ${N}>;
var<workgroup> s1: array<vec4f, ${N}>;

fn bitReverse(xIn: u32) -> u32 {
    var x = xIn;
    var r = 0u;
    for (var i = 0u; i < ${log2N}u; i++) {
        r = (r << 1u) | (x & 1u);
        x >>= 1u;
    }
    return r;
}

fn coord(line: u32, i: u32) -> vec2i {
    if (uniform.uVertical == 1u) { return vec2i(i32(line), i32(i)); }
    return vec2i(i32(i), i32(line));
}

@compute @workgroup_size(${WG}, 1, 1)
fn main(@builtin(workgroup_id) wid: vec3u, @builtin(local_invocation_id) lid: vec3u) {
    let line = wid.x;
    let t = lid.x;

    // load with bit-reversal permutation
    for (var i = t; i < ${N}u; i += ${WG}u) {
        let src = bitReverse(i);
        s0[i] = textureLoad(uIn0, coord(line, src), 0);
        s1[i] = textureLoad(uIn1, coord(line, src), 0);
    }
    workgroupBarrier();

    for (var stage = 0u; stage < ${log2N}u; stage++) {
        let hs = 1u << stage;
        let len = hs << 1u;
        // butterfly index t -> element pair (i0, i1)
        let j = t & (hs - 1u);
        let i0 = ((t >> stage) << (stage + 1u)) + j;
        let i1 = i0 + hs;
        let ang = TWO_PI * f32(j) / f32(len);
        let w = vec2f(cos(ang), sin(ang));
        let a0 = s0[i0]; let b0 = cmul4(s0[i1], w);
        let a1 = s1[i0]; let b1 = cmul4(s1[i1], w);
        workgroupBarrier();
        s0[i0] = a0 + b0; s0[i1] = a0 - b0;
        s1[i0] = a1 + b1; s1[i1] = a1 - b1;
        workgroupBarrier();
    }

    for (var i = t; i < ${N}u; i += ${WG}u) {
        textureStore(uOut0, coord(line, i), s0[i]);
        textureStore(uOut1, coord(line, i), s1[i]);
    }
}
`;
}

function assembleCS(N) {
    return /* wgsl */`
uniform uLambda: f32;
uniform uDeltaTime: f32;
uniform uFoamDecay: f32;
uniform uFoamReset: f32;
var uIn0: texture_2d<f32>;
var uIn1: texture_2d<f32>;
var uPrevDisplacement: texture_2d<f32>;
var uDisplacement: texture_storage_2d<rgba16float, write>;
var uDerivatives: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3u) {
    let n = ${N};
    let texel = vec2i(gid.xy);
    if (texel.x >= n || texel.y >= n) { return; }
    let a = textureLoad(uIn0, texel, 0);
    let b = textureLoad(uIn1, texel, 0);
    let Dx = a.x; let Dz = a.y; let Dy = a.z; let dxz = a.w;
    let dyx = b.x; let dyz = b.y; let dxx = b.z; let dzz = b.w;
    let lambda = uniform.uLambda;
    let jacobian = (1.0 + lambda * dxx) * (1.0 + lambda * dzz) - lambda * lambda * dxz * dxz;
    let prev = textureLoad(uPrevDisplacement, texel, 0).w;
    var turb = min(jacobian, prev + uniform.uDeltaTime * uniform.uFoamDecay / max(jacobian, 0.5));
    if (uniform.uFoamReset > 0.5) { turb = jacobian; }
    textureStore(uDisplacement, texel, vec4f(lambda * Dx, Dy, lambda * Dz, turb));
    textureStore(uDerivatives, texel, vec4f(dyx, dyz, dxx, dzz));
}
`;
}

/**
 * Default simulation parameters. Two JONSWAP spectra are summed: a local wind sea and a
 * long-period swell. Spectra are described by physical quantities (wind speed in m/s,
 * fetch in metres) following Horvath 2015.
 */
const DEFAULT_WAVE_PARAMS = {
    size: 256,                     // FFT resolution per cascade (128 | 256 | 512)
    lengthScales: [1024, 256, 48, 8], // metres covered by each cascade (coarse -> fine)
    cascadeOverlap: 6,             // wavelength ratio used to split wave numbers between cascades
    depth: 500,                    // water depth (m) — TMA correction & dispersion
    gravity: 9.81,
    seed: 1337,
    choppiness: 1.4,               // horizontal displacement scale (lambda)
    foamDecay: 0.6,                // Jacobian recovery rate (1/s); lower = foam lingers longer
    timeScale: 1.0,
    wind: {
        scale: 1.0,
        windSpeed: 9.0,            // m/s
        windDirection: 35.0,       // degrees
        fetch: 120000,             // m
        spreadBlend: 0.9,
        swell: 0.25,
        peakEnhancement: 3.3,
        shortWavesFade: 0.015
    },
    swell: {
        scale: 0.6,
        windSpeed: 4.0,
        windDirection: -20,
        fetch: 500000,
        spreadBlend: 1.0,
        swell: 1.0,
        peakEnhancement: 3.3,
        shortWavesFade: 0.05
    }
};

function packSpectrum(s, g) {
    const alpha = 0.076 * Math.pow(s.windSpeed * s.windSpeed / (s.fetch * g), 0.22);
    const peakOmega = 22 * Math.pow(g * g / (s.windSpeed * s.fetch), 1 / 3);
    return {
        p0: [s.scale, s.windDirection * Math.PI / 180, s.spreadBlend, s.swell],
        p1: [alpha, peakOmega, s.peakEnhancement, s.shortWavesFade]
    };
}

function createTex(device, name, size, format, filter, address, storage, mipmaps = false) {
    return new Texture(device, {
        name, width: size, height: size, format,
        mipmaps,
        minFilter: mipmaps ? FILTER_LINEAR_MIPMAP_LINEAR : filter, magFilter: filter,
        anisotropy: mipmaps ? 16 : 1,   // the sea is seen at grazing angles: isotropic mips would blur it
        addressU: address, addressV: address,
        storage: !!storage
    });
}

/**
 * Cascaded FFT ocean simulation. Produces, per cascade, a displacement map
 * (x, y, z, turbulence) and a derivatives map (dy/dx, dy/dz, dx/dx, dz/dz) each frame.
 * Uses WebGPU compute when available, otherwise a WebGL2 MRT fragment pipeline.
 */
class WaveSimulation {
    constructor(device, params = {}) {
        this.device = device;
        this.params = structuredClone(DEFAULT_WAVE_PARAMS);
        Object.assign(this.params, params);
        this.useCompute = !!device.supportsCompute;
        this.time = 0;
        this.frame = 0;
        this.cascades = [];
        this._spectrumDirty = true;
        this._build();
    }

    get numCascades() { return this.cascades.length; }
    get size() { return this.params.size; }

    /** Current displacement textures (one per cascade). */
    get displacementTextures() { return this.cascades.map(c => c.sampled ? c.sampled.displacement : c.displacement[c.pingIndex]); }
    /** Derivative textures (one per cascade). */
    get derivativeTextures() { return this.cascades.map(c => c.sampled ? c.sampled.derivatives : c.derivatives); }
    /** Length scales (metres) per cascade. */
    get lengthScales() { return this.params.lengthScales; }

    /** Mark the initial spectrum for regeneration (call after changing wind/swell/depth/seed). */
    invalidateSpectrum() { this._spectrumDirty = true; }

    /** Change FFT size / cascade layout: rebuilds all GPU resources. */
    rebuild(newParams = {}) {
        Object.assign(this.params, newParams);
        this.destroy();
        this.frame = 0;
        this._build();
    }

    _build() {
        const { device, params } = this;
        const N = params.size;
        if ((N & (N - 1)) !== 0 || N < 16 || N > 1024) throw new Error('Water: FFT size must be a power of two in [16, 1024]');
        if (this.useCompute) {
            const maxWG = device.limits?.maxComputeWorkgroupSizeX ?? 256;
            const maxShared = device.limits?.maxComputeWorkgroupStorageSize ?? 16384;
            if (N / 2 > maxWG || N * 32 > maxShared) {
                console.warn(`Water: FFT size ${N} exceeds compute limits, using fragment path`);
                this.useCompute = false;
            }
        }
        this.log2N = Math.log2(N) | 0;
        this.cascades = params.lengthScales.map((L, i) => this._createCascade(i, L));
        this._spectrumDirty = true;
        if (this.useCompute) this._buildCompute(); else this._buildFragment();
    }

    _createCascade(index, lengthScale) {
        const { device, params } = this;
        const N = params.size;
        const storage = this.useCompute;
        const c = {
            index, lengthScale, pingIndex: 0,
            spectrum: createTex(device, `oceanSpectrum${index}`, N, PIXELFORMAT_RGBA32F, FILTER_NEAREST, ADDRESS_CLAMP_TO_EDGE, storage),
            pingA: [0, 1].map(j => createTex(device, `oceanPingA${index}_${j}`, N, PIXELFORMAT_RGBA32F, FILTER_NEAREST, ADDRESS_CLAMP_TO_EDGE, storage)),
            pingB: [0, 1].map(j => createTex(device, `oceanPingB${index}_${j}`, N, PIXELFORMAT_RGBA32F, FILTER_NEAREST, ADDRESS_CLAMP_TO_EDGE, storage)),
            // The outputs carry a mip chain: the surface mesh gets coarser with distance, so the vertex
            // shader reads the displacement at the mip that matches its local spacing, and the
            // fragment shader's slopes are filtered the same way. Without it the grid point-samples
            // waves shorter than its spacing, and the alias pattern moves whenever the camera does.
            displacement: [0, 1].map(j => createTex(device, `oceanDisplacement${index}_${j}`, N, PIXELFORMAT_RGBA16F, FILTER_LINEAR, ADDRESS_REPEAT, storage, !storage)),
            derivatives: createTex(device, `oceanDerivatives${index}`, N, PIXELFORMAT_RGBA16F, FILTER_LINEAR, ADDRESS_REPEAT, storage, !storage),
            // WebGPU storage textures are bound as a single level, so the compute path writes plain
            // textures and copies them into these mipmapped ones for sampling
            sampled: storage ? {
                displacement: createTex(device, `oceanDisplacementMip${index}`, N, PIXELFORMAT_RGBA16F, FILTER_LINEAR, ADDRESS_REPEAT, false, true),
                derivatives: createTex(device, `oceanDerivativesMip${index}`, N, PIXELFORMAT_RGBA16F, FILTER_LINEAR, ADDRESS_REPEAT, false, true)
            } : null
        };
        // wave-number band handled by this cascade
        const k = params.cascadeOverlap;
        const scales = params.lengthScales;
        c.cutoffLow = index === 0 ? 0.0001 : 2 * Math.PI / scales[index] * k;
        c.cutoffHigh = index === scales.length - 1 ? 1e6 : 2 * Math.PI / scales[index + 1] * k;
        return c;
    }

    // ------------------------------------------------------------------ WebGPU compute
    _buildCompute() {
        const { device, params } = this;
        const N = params.size;
        const mk = (name, src) => new Shader(device, {
            name, shaderLanguage: SHADERLANGUAGE_WGSL, cshader: src, computeEntryPoint: 'main'
        });
        this.csSpectrum = mk('oceanSpectrumCS', spectrumCS(N));
        this.csEvolve = mk('oceanEvolveCS', evolveCS(N));
        this.csFFT = mk('oceanFFTCS', fftCS(N));
        this.csAssemble = mk('oceanAssembleCS', assembleCS(N));
        const groups = Math.ceil(N / 8);

        for (const c of this.cascades) {
            c.spectrumCompute = new Compute(device, this.csSpectrum, `oceanSpectrum${c.index}`);
            c.spectrumCompute.setParameter('uOut', c.spectrum);
            c.spectrumCompute.setupDispatch(groups, groups, 1);

            c.evolveCompute = new Compute(device, this.csEvolve, `oceanEvolve${c.index}`);
            c.evolveCompute.setParameter('uSpectrum', c.spectrum);
            c.evolveCompute.setParameter('uOut0', c.pingA[0]);
            c.evolveCompute.setParameter('uOut1', c.pingA[1]);
            c.evolveCompute.setupDispatch(groups, groups, 1);

            c.fftH = new Compute(device, this.csFFT, `oceanFFTH${c.index}`);
            c.fftH.setParameter('uVertical', 0);
            c.fftH.setParameter('uIn0', c.pingA[0]);
            c.fftH.setParameter('uIn1', c.pingA[1]);
            c.fftH.setParameter('uOut0', c.pingB[0]);
            c.fftH.setParameter('uOut1', c.pingB[1]);
            c.fftH.setupDispatch(N, 1, 1);

            c.fftV = new Compute(device, this.csFFT, `oceanFFTV${c.index}`);
            c.fftV.setParameter('uVertical', 1);
            c.fftV.setParameter('uIn0', c.pingB[0]);
            c.fftV.setParameter('uIn1', c.pingB[1]);
            c.fftV.setParameter('uOut0', c.pingA[0]);
            c.fftV.setParameter('uOut1', c.pingA[1]);
            c.fftV.setupDispatch(N, 1, 1);

            c.assembleCompute = [0, 1].map((j) => {
                const cs = new Compute(device, this.csAssemble, `oceanAssemble${c.index}_${j}`);
                cs.setParameter('uIn0', c.pingA[0]);
                cs.setParameter('uIn1', c.pingA[1]);
                cs.setParameter('uPrevDisplacement', c.displacement[1 - j]);
                cs.setParameter('uDisplacement', c.displacement[j]);
                cs.setParameter('uDerivatives', c.derivatives);
                cs.setupDispatch(groups, groups, 1);
                return cs;
            });
        }
    }

    _updateSpectrumCompute() {
        const { params } = this;
        const a = packSpectrum(params.wind, params.gravity);
        const b = packSpectrum(params.swell, params.gravity);
        const computes = [];
        for (const c of this.cascades) {
            const cs = c.spectrumCompute;
            cs.setParameter('uLengthScale', c.lengthScale);
            cs.setParameter('uCutoffLow', c.cutoffLow);
            cs.setParameter('uCutoffHigh', c.cutoffHigh);
            cs.setParameter('uDepth', params.depth);
            cs.setParameter('uGravity', params.gravity);
            cs.setParameter('uSeed', params.seed >>> 0);
            cs.setParameter('uSpecA0', a.p0); cs.setParameter('uSpecA1', a.p1);
            cs.setParameter('uSpecB0', b.p0); cs.setParameter('uSpecB1', b.p1);
            computes.push(cs);
        }
        this.device.computeDispatch(computes, 'oceanSpectrum');
    }

    _stepCompute(dt) {
        const { params } = this;
        const computes = [];
        for (const c of this.cascades) {
            const e = c.evolveCompute;
            e.setParameter('uLengthScale', c.lengthScale);
            e.setParameter('uDepth', params.depth);
            e.setParameter('uGravity', params.gravity);
            e.setParameter('uTime', this.time);
            computes.push(e);
        }
        this.device.computeDispatch(computes, 'oceanEvolve');
        this.device.computeDispatch(this.cascades.map(c => c.fftH), 'oceanFFTH');
        this.device.computeDispatch(this.cascades.map(c => c.fftV), 'oceanFFTV');
        const assembles = [];
        for (const c of this.cascades) {
            c.pingIndex = 1 - c.pingIndex;
            const cs = c.assembleCompute[c.pingIndex];
            cs.setParameter('uLambda', params.choppiness);
            cs.setParameter('uDeltaTime', dt);
            cs.setParameter('uFoamDecay', params.foamDecay);
            cs.setParameter('uFoamReset', this.frame < 2 ? 1 : 0);
            assembles.push(cs);
        }
        this.device.computeDispatch(assembles, 'oceanAssemble');
        // copy the results into the mipmapped sampling textures and rebuild their chains
        const N = params.size;
        const encoder = this.device.getCommandEncoder();
        for (const c of this.cascades) {
            for (const [src, dst] of [[c.displacement[c.pingIndex], c.sampled.displacement], [c.derivatives, c.sampled.derivatives]]) {
                encoder.copyTextureToTexture({ texture: src.impl.gpuTexture }, { texture: dst.impl.gpuTexture }, { width: N, height: N, depthOrArrayLayers: 1 });
                this.device.mipmapRenderer.generate(dst.impl);
            }
        }
    }

    // ------------------------------------------------------------------ WebGL2 fragment
    _buildFragment() {
        const { device } = this;
        const attributes = { aPosition: SEMANTIC_POSITION };
        const mk = (name, fs, outputs) => ShaderUtils.createShader(device, {
            uniqueName: name, attributes, vertexGLSL: SIM_QUAD_VS, fragmentGLSL: fs,
            fragmentOutputTypes: outputs
        });
        this.fsSpectrum = mk('oceanSpectrumFS', SPECTRUM_FS, ['vec4']);
        this.fsEvolve = mk('oceanEvolveFS', EVOLVE_FS, ['vec4', 'vec4']);
        this.fsFFT = mk('oceanFFTFS', FFT_FS, ['vec4', 'vec4']);
        this.fsAssemble = mk('oceanAssembleFS', ASSEMBLE_FS, ['vec4', 'vec4']);

        const mkPass = (shader, rt) => {
            const pass = new RenderPassShaderQuad(device);
            pass.shader = shader;
            pass.init(rt);
            return pass;
        };

        for (const c of this.cascades) {
            c.rtSpectrum = new RenderTarget({ name: `oceanSpectrumRT${c.index}`, colorBuffer: c.spectrum, depth: false });
            c.rtA = new RenderTarget({ name: `oceanPingART${c.index}`, colorBuffers: c.pingA, depth: false });
            c.rtB = new RenderTarget({ name: `oceanPingBRT${c.index}`, colorBuffers: c.pingB, depth: false });
            c.rtOut = [0, 1].map(j => new RenderTarget({
                name: `oceanOutRT${c.index}_${j}`, colorBuffers: [c.displacement[j], c.derivatives], depth: false,
                mipmaps: true   // the engine regenerates the chain when the pass ends
            }));
            c.spectrumPass = mkPass(this.fsSpectrum, c.rtSpectrum);
            c.evolvePass = mkPass(this.fsEvolve, c.rtA);
            c.fftPassA = mkPass(this.fsFFT, c.rtA);   // writes A (reads B)
            c.fftPassB = mkPass(this.fsFFT, c.rtB);   // writes B (reads A)
            c.assemblePass = c.rtOut.map(rt => mkPass(this.fsAssemble, rt));
        }
    }

    _updateSpectrumFragment() {
        const { device, params } = this;
        const scope = device.scope;
        const a = packSpectrum(params.wind, params.gravity);
        const b = packSpectrum(params.swell, params.gravity);
        scope.resolve('uSize').setValue(params.size);
        scope.resolve('uDepth').setValue(params.depth);
        scope.resolve('uGravity').setValue(params.gravity);
        scope.resolve('uSeed').setValue(params.seed | 0);
        scope.resolve('uSpecA0').setValue(a.p0); scope.resolve('uSpecA1').setValue(a.p1);
        scope.resolve('uSpecB0').setValue(b.p0); scope.resolve('uSpecB1').setValue(b.p1);
        for (const c of this.cascades) {
            scope.resolve('uLengthScale').setValue(c.lengthScale);
            scope.resolve('uCutoffLow').setValue(c.cutoffLow);
            scope.resolve('uCutoffHigh').setValue(c.cutoffHigh);
            c.spectrumPass.render();
        }
    }

    _stepFragment(dt) {
        const { device, params } = this;
        const scope = device.scope;
        const uIn0 = scope.resolve('uIn0'), uIn1 = scope.resolve('uIn1');
        const uStage = scope.resolve('uStage'), uVertical = scope.resolve('uVertical');
        scope.resolve('uSize').setValue(params.size);
        scope.resolve('uLog2Size').setValue(this.log2N);
        scope.resolve('uDepth').setValue(params.depth);
        scope.resolve('uGravity').setValue(params.gravity);
        scope.resolve('uTime').setValue(this.time);
        scope.resolve('uLambda').setValue(params.choppiness);
        scope.resolve('uDeltaTime').setValue(dt);
        scope.resolve('uFoamDecay').setValue(params.foamDecay);
        scope.resolve('uFoamReset').setValue(this.frame < 2 ? 1 : 0);

        for (const c of this.cascades) {
            scope.resolve('uLengthScale').setValue(c.lengthScale);
            scope.resolve('uSpectrum').setValue(c.spectrum);
            c.evolvePass.render();   // -> A

            let inA = true;
            for (let dir = 0; dir < 2; dir++) {
                uVertical.setValue(dir);
                for (let s = 0; s < this.log2N; s++) {
                    uStage.setValue(s);
                    const src = inA ? c.pingA : c.pingB;
                    uIn0.setValue(src[0]); uIn1.setValue(src[1]);
                    (inA ? c.fftPassB : c.fftPassA).render();
                    inA = !inA;
                }
            }
            // ensure the result is in A (even number of stages keeps it there; handle odd)
            const src = inA ? c.pingA : c.pingB;
            uIn0.setValue(src[0]); uIn1.setValue(src[1]);
            c.pingIndex = 1 - c.pingIndex;
            scope.resolve('uPrevDisplacement').setValue(c.displacement[1 - c.pingIndex]);
            c.assemblePass[c.pingIndex].render();
        }
    }

    /**
     * Advance the simulation. Call once per frame before rendering.
     * @param {number} dt - frame delta time in seconds
     */
    update(dt) {
        dt = Math.min(dt, 1 / 15) * this.params.timeScale;
        this.time += dt;
        if (this._spectrumDirty) {
            this._spectrumDirty = false;
            if (this.useCompute) this._updateSpectrumCompute(); else this._updateSpectrumFragment();
        }
        if (this.useCompute) this._stepCompute(dt); else this._stepFragment(dt);
        this.frame++;
    }

    destroy() {
        for (const c of this.cascades) {
            [c.spectrum, ...c.pingA, ...c.pingB, ...c.displacement, c.derivatives, c.sampled?.displacement, c.sampled?.derivatives].forEach(t => t?.destroy());
            [c.rtSpectrum, c.rtA, c.rtB, ...(c.rtOut || [])].forEach(rt => rt?.destroy());
            [c.spectrumPass, c.evolvePass, c.fftPassA, c.fftPassB, ...(c.assemblePass || [])].forEach(p => p?.quadRender?.destroy());
            [c.spectrumCompute, c.evolveCompute, c.fftH, c.fftV, ...(c.assembleCompute || [])].forEach(cs => cs?.destroy());
        }
        this.cascades = [];
        [this.csSpectrum, this.csEvolve, this.csFFT, this.csAssemble].forEach(sh => sh?.destroy());
        this.csSpectrum = this.csEvolve = this.csFFT = this.csAssemble = null;
    }
}

/**
 * Camera-centred polar grid. Vertex density falls off geometrically with radius which gives a
 * near-constant screen-space triangle size for a surface viewed from above, without the
 * T-junction cracks of a clipmap. The mesh is translated (never rotated) to follow the camera
 * each frame; the wave field is sampled in world space so the tessellation just slides under it.
 *
 * @param {import('playcanvas').GraphicsDevice} device
 * @param {object} [opts]
 * @param {number} [opts.sectors=256]   angular subdivisions
 * @param {number} [opts.rings=320]     radial subdivisions
 * @param {number} [opts.innerRadius=0.5] radius of the first ring (m)
 * @param {number} [opts.outerRadius=20000] radius of the last ring (m)
 * @param {number} [opts.maxWaveHeight=30] used for the bounding box only
 */
function createWaterMesh(device, opts = {}) {
    const sectors = opts.sectors ?? 256;
    const rings = opts.rings ?? 320;
    const r0 = opts.innerRadius ?? 0.5;
    const r1 = opts.outerRadius ?? 20000;
    const growth = Math.pow(r1 / r0, 1 / (rings - 1));

    const positions = [];
    const indices = [];

    // centre vertex + fan
    positions.push(0, 0, 0);
    for (let j = 0; j < rings; j++) {
        const r = r0 * Math.pow(growth, j);
        for (let i = 0; i < sectors; i++) {
            const a = (i / sectors) * Math.PI * 2;
            positions.push(Math.cos(a) * r, 0, Math.sin(a) * r);
        }
    }
    const ringBase = j => 1 + j * sectors;
    for (let i = 0; i < sectors; i++) {
        const i2 = (i + 1) % sectors;
        indices.push(0, ringBase(0) + i2, ringBase(0) + i);
    }
    for (let j = 0; j < rings - 1; j++) {
        const a = ringBase(j), b = ringBase(j + 1);
        for (let i = 0; i < sectors; i++) {
            const i2 = (i + 1) % sectors;
            // alternate the diagonal for a more isotropic triangulation
            if ((i + j) & 1) {
                indices.push(a + i, b + i2, b + i, a + i, a + i2, b + i2);
            } else {
                indices.push(a + i, a + i2, b + i, a + i2, b + i2, b + i);
            }
        }
    }

    const mesh = new Mesh(device);
    mesh.setPositions(positions);
    mesh.setIndices(indices);
    mesh.update();
    const h = opts.maxWaveHeight ?? 30;
    mesh.aabb = new BoundingBox(new Vec3(0, 0, 0), new Vec3(r1, h, r1));
    return mesh;
}

// Wave probe (GLSL). Evaluates the same cascaded displacement the surface vertex shader uses, for
// a grid of world-space XZ queries, and inverts the horizontal (choppy) displacement so the result
// is the surface point that actually ends up above the query position.
//
// Input  uQuery  : RGBA32F, (worldX, worldZ, active, unused) per texel
// Output          : RGBA32F, (surfaceY, slopeX, slopeZ, active) per texel
//
// Both the query fetch and the output use gl_FragCoord, which indexes the same memory row on WebGL
// and WebGPU, so a readback of the result lines up with the uploaded query buffer on both.

const PROBE_VS = /* glsl */`
attribute vec2 aPosition;
void main(void) {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const PROBE_FS = /* glsl */`
uniform sampler2D uQuery;
uniform sampler2D uDisp0;
uniform sampler2D uDisp1;
uniform sampler2D uDisp2;
uniform sampler2D uDisp3;
uniform sampler2D uDeriv0;
uniform sampler2D uDeriv1;
uniform sampler2D uDeriv2;
uniform sampler2D uDeriv3;
uniform vec4  uCascadeInv[4];   // w = 1 / lengthScale
uniform int   uNumCascades;
uniform float uLambda;
uniform float uDisplacementScale;
uniform float uSeaLevel;

vec3 sampleDisp(vec2 p) {
    vec3 d = textureLod(uDisp0, p * uCascadeInv[0].w, 0.0).xyz;
    if (uNumCascades > 1) d += textureLod(uDisp1, p * uCascadeInv[1].w, 0.0).xyz;
    if (uNumCascades > 2) d += textureLod(uDisp2, p * uCascadeInv[2].w, 0.0).xyz;
    if (uNumCascades > 3) d += textureLod(uDisp3, p * uCascadeInv[3].w, 0.0).xyz;
    return d * uDisplacementScale;
}

vec4 sampleDeriv(vec2 p) {
    vec4 d = textureLod(uDeriv0, p * uCascadeInv[0].w, 0.0);
    if (uNumCascades > 1) d += textureLod(uDeriv1, p * uCascadeInv[1].w, 0.0);
    if (uNumCascades > 2) d += textureLod(uDeriv2, p * uCascadeInv[2].w, 0.0);
    if (uNumCascades > 3) d += textureLod(uDeriv3, p * uCascadeInv[3].w, 0.0);
    return d * uDisplacementScale;
}

void main(void) {
    ivec2 texel = ivec2(gl_FragCoord.xy);
    vec4 q = texelFetch(uQuery, texel, 0);
    if (q.z < 0.5) { gl_FragColor = vec4(uSeaLevel, 0.0, 0.0, 0.0); return; }

    vec2 target = q.xy;
    vec2 p = target;
    for (int i = 0; i < 4; i++) {
        p = target - sampleDisp(p).xz;
    }
    vec3 d = sampleDisp(p);
    vec4 der = sampleDeriv(p);
    vec2 slope = vec2(der.x / (1.0 + uLambda * der.z), der.y / (1.0 + uLambda * der.w));
    gl_FragColor = vec4(uSeaLevel + d.y, slope.x, slope.y, 1.0);
}
`;

// Wave probe — native WGSL for WebGPU. Mirrors waveProbe.glsl.js.

const PROBE_VS_WGSL = /* wgsl */`
attribute aPosition: vec2f;

@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(input.aPosition, 0.0, 1.0);
    return output;
}
`;

const PROBE_FS_WGSL = /* wgsl */`
var uQuery: texture_2d<f32>;
var uDisp0: texture_2d<f32>;
var uDisp0Sampler: sampler;
var uDisp1: texture_2d<f32>;
var uDisp1Sampler: sampler;
var uDisp2: texture_2d<f32>;
var uDisp2Sampler: sampler;
var uDisp3: texture_2d<f32>;
var uDisp3Sampler: sampler;
var uDeriv0: texture_2d<f32>;
var uDeriv0Sampler: sampler;
var uDeriv1: texture_2d<f32>;
var uDeriv1Sampler: sampler;
var uDeriv2: texture_2d<f32>;
var uDeriv2Sampler: sampler;
var uDeriv3: texture_2d<f32>;
var uDeriv3Sampler: sampler;
uniform uCascadeInv: array<vec4f, 4>;
uniform uNumCascades: i32;
uniform uLambda: f32;
uniform uDisplacementScale: f32;
uniform uSeaLevel: f32;

fn sampleDisp(p: vec2f) -> vec3f {
    var d = textureSampleLevel(uDisp0, uDisp0Sampler, p * uniform.uCascadeInv[0].w, 0.0).xyz;
    if (uniform.uNumCascades > 1) { d += textureSampleLevel(uDisp1, uDisp1Sampler, p * uniform.uCascadeInv[1].w, 0.0).xyz; }
    if (uniform.uNumCascades > 2) { d += textureSampleLevel(uDisp2, uDisp2Sampler, p * uniform.uCascadeInv[2].w, 0.0).xyz; }
    if (uniform.uNumCascades > 3) { d += textureSampleLevel(uDisp3, uDisp3Sampler, p * uniform.uCascadeInv[3].w, 0.0).xyz; }
    return d * uniform.uDisplacementScale;
}

fn sampleDeriv(p: vec2f) -> vec4f {
    var d = textureSampleLevel(uDeriv0, uDeriv0Sampler, p * uniform.uCascadeInv[0].w, 0.0);
    if (uniform.uNumCascades > 1) { d += textureSampleLevel(uDeriv1, uDeriv1Sampler, p * uniform.uCascadeInv[1].w, 0.0); }
    if (uniform.uNumCascades > 2) { d += textureSampleLevel(uDeriv2, uDeriv2Sampler, p * uniform.uCascadeInv[2].w, 0.0); }
    if (uniform.uNumCascades > 3) { d += textureSampleLevel(uDeriv3, uDeriv3Sampler, p * uniform.uCascadeInv[3].w, 0.0); }
    return d * uniform.uDisplacementScale;
}

@fragment fn fragmentMain(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;
    let texel = vec2i(pcPosition.xy);
    let q = textureLoad(uQuery, texel, 0);
    if (q.z < 0.5) {
        output.color = vec4f(uniform.uSeaLevel, 0.0, 0.0, 0.0);
        return output;
    }

    let queryXZ = q.xy;
    var p = queryXZ;
    for (var i = 0; i < 4; i++) {
        p = queryXZ - sampleDisp(p).xz;
    }
    let d = sampleDisp(p);
    let der = sampleDeriv(p);
    let slope = vec2f(der.x / (1.0 + uniform.uLambda * der.z), der.y / (1.0 + uniform.uLambda * der.w));
    output.color = vec4f(uniform.uSeaLevel + d.y, slope.x, slope.y, 1.0);
    return output;
}
`;

const GRID = 16;                 // 16 x 16 = 256 simultaneous query points
const SLOTS = GRID * GRID;
const READ_INTERVAL = 3;          // frames between readbacks

/**
 * CPU-side queries of the GPU wave field, for buoyancy and submersion tests.
 *
 * Each query point registered by {@link WaveProbe#sample} occupies one texel of a small query
 * texture. A quad pass evaluates the same cascaded displacement the vertex shader uses — including
 * the inverse of the horizontal (choppy) displacement, solved by fixed-point iteration — and the
 * result is read back asynchronously. Callers therefore get a value that is one or two frames old,
 * which is invisible for floating objects and not suitable for exact collision.
 *
 * Points are keyed on their XZ position, so asking about the same point every frame reuses its slot
 * and costs nothing; slots not asked about for a while are recycled.
 */
class WaveProbe {
    /** @param {import('./Water.js').Water} water - The water instance to sample. */
    constructor(water) {
        this.water = water;
        this.device = water._device;

        this.queryData = new Float32Array(SLOTS * 4);
        this.resultData = new Float32Array(SLOTS * 4);
        /** @type {Map<string, {slot: number, lastUsed: number, result: {position: Vec3, normal: Vec3}}>} */
        this.entries = new Map();
        this.slotOwner = new Array(SLOTS).fill(null);
        this.nextSlot = 0;
        this.frame = 0;
        this.pending = false;
        this.lastRead = -99;
        this._generation = 0;
        this._destroyed = false;
        this._zero = { position: new Vec3(), normal: new Vec3(0, 1, 0) };

        this._build();
    }

    _build() {
        const device = this.device;
        this.queryTex = new Texture(device, {
            name: 'waveProbeQuery', width: GRID, height: GRID, format: PIXELFORMAT_RGBA32F,
            mipmaps: false, minFilter: FILTER_NEAREST, magFilter: FILTER_NEAREST,
            addressU: ADDRESS_CLAMP_TO_EDGE, addressV: ADDRESS_CLAMP_TO_EDGE
        });
        this.queryTex.lock().set(this.queryData);
        this.queryTex.unlock();

        this.resultTex = new Texture(device, {
            name: 'waveProbeResult', width: GRID, height: GRID, format: PIXELFORMAT_RGBA32F,
            mipmaps: false, minFilter: FILTER_NEAREST, magFilter: FILTER_NEAREST,
            addressU: ADDRESS_CLAMP_TO_EDGE, addressV: ADDRESS_CLAMP_TO_EDGE
        });
        this.rt = new RenderTarget({ name: 'waveProbeRT', colorBuffer: this.resultTex, depth: false });

        const shader = ShaderUtils.createShader(device, {
            uniqueName: 'waveProbe',
            attributes: { aPosition: SEMANTIC_POSITION },
            vertexGLSL: PROBE_VS, fragmentGLSL: PROBE_FS,
            vertexWGSL: PROBE_VS_WGSL, fragmentWGSL: PROBE_FS_WGSL,
            fragmentOutputTypes: ['vec4']
        });
        this.pass = new RenderPassShaderQuad(device);
        this.pass.shader = shader;
        this.pass.init(this.rt);
        this._cascadeData = new Float32Array(16);
    }

    /** Rebuild after the simulation's cascade layout changed. */
    rebuild() {
        // In-flight results describe the previous configuration; never publish them over the reset.
        this._generation++;
        this.resultData.fill(0);
        for (const entry of this.entries.values()) {
            entry.result.position.y = this.water.seaLevel;
            entry.result.normal.set(0, 1, 0);
        }
        this.lastRead = -99;
    }

    /**
     * Surface point and normal at a world XZ position.
     *
     * @param {number} x - World X.
     * @param {number} z - World Z.
     * @returns {{position: Vec3, normal: Vec3}} A per-query object, updated in place each frame.
     */
    sample(x, z) {
        // quantise the key so a slowly drifting query keeps its slot
        const key = `${Math.round(x * 4)}:${Math.round(z * 4)}`;
        let e = this.entries.get(key);
        if (!e) {
            const slot = this._acquireSlot(key);
            if (slot < 0) {
                this._zero.position.set(x, this.water.config.seaLevel, z);
                return this._zero;
            }
            e = { slot, lastUsed: this.frame, result: { position: new Vec3(x, this.water.config.seaLevel, z), normal: new Vec3(0, 1, 0) } };
            this.entries.set(key, e);
        }
        e.lastUsed = this.frame;
        e.result.position.x = x;
        e.result.position.z = z;
        this.queryData[e.slot * 4 + 0] = x;
        this.queryData[e.slot * 4 + 1] = z;
        this.queryData[e.slot * 4 + 2] = 1;
        return e.result;
    }

    _acquireSlot(key) {
        for (let i = 0; i < SLOTS; i++) {
            const s = (this.nextSlot + i) % SLOTS;
            const owner = this.slotOwner[s];
            if (owner === null) { this.slotOwner[s] = key; this.nextSlot = s + 1; return s; }
            const e = this.entries.get(owner);
            if (!e || this.frame - e.lastUsed > 30) {
                if (e) this.entries.delete(owner);
                this.slotOwner[s] = key;
                this.nextSlot = s + 1;
                return s;
            }
        }
        return -1;
    }

    /** Run one probe pass and pick up the previous readback. Called by {@link Water#update}. */
    update() {
        this.frame++;
        if (this.entries.size === 0) return;

        const water = this.water;
        const sim = water._simulation;
        const cfg = water.config;
        const scope = this.device.scope;

        this.queryTex.lock().set(this.queryData);
        this.queryTex.unlock();

        const disp = sim.displacementTextures;
        const deriv = sim.derivativeTextures;
        const scales = sim.lengthScales;
        const n = disp.length;
        for (let i = 0; i < 4; i++) {
            const j = Math.min(i, n - 1);
            scope.resolve(`uDisp${i}`).setValue(disp[j]);
            scope.resolve(`uDeriv${i}`).setValue(deriv[j]);
            this._cascadeData[i * 4 + 3] = 1 / scales[j];
        }
        scope.resolve('uCascadeInv').setValue(this._cascadeData);
        scope.resolve('uCascadeInv[0]').setValue(this._cascadeData);
        scope.resolve('uQuery').setValue(this.queryTex);
        scope.resolve('uNumCascades').setValue(n);
        scope.resolve('uLambda').setValue(cfg.waves.choppiness);
        scope.resolve('uDisplacementScale').setValue(cfg.waves.amplitude);
        scope.resolve('uSeaLevel').setValue(cfg.seaLevel);
        this.pass.render();

        // One readback in flight at a time, and no more than every READ_INTERVAL frames: the staging
        // buffer a read maps is recycled by the device, and issuing them back to back trips its
        // validation. 20 Hz is far more than a floating object needs.
        if (!this.pending && this.frame - this.lastRead >= READ_INTERVAL) {
            this.pending = true;
            this.lastRead = this.frame;
            const generation = this._generation;
            const owners = Array.from(this.entries.entries());
            this.resultTex.read(0, 0, GRID, GRID, { renderTarget: this.rt, data: this.resultData, frequent: true })
                .then(() => {
                    this.pending = false;
                    if (!this._destroyed && generation === this._generation) this._publish(owners);
                })
                .catch(() => { this.pending = false; });
        }
    }

    _publish(owners) {
        const d = this.resultData;
        for (const [key, e] of owners) {
            if (this.entries.get(key) !== e) continue; // a slot was recycled during the GPU read
            const i = e.slot * 4;
            e.result.position.y = d[i + 0];
            e.result.normal.set(-d[i + 1], 1, -d[i + 2]).normalize();
        }
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this._generation++;
        this.pass?.quadRender?.destroy();
        this.rt?.destroy();
        this.queryTex?.destroy();
        this.resultTex?.destroy();
        this.entries.clear();
    }
}

// Whitewater is not noise — it is bubbles. What reads as foam is a field of round cells packed at
// several sizes, torn into filaments at the edges. A value-noise fbm gives none of that structure,
// so this bakes a tiling cellular texture once at start-up instead of pulling in an image.
//
//   r  coarse bubble clusters, the shape the eye reads first
//   g  fine bubbles, the texture inside a clump
//   b  large-scale breakup, so a foam sheet is never uniform
//   a  a soft dilation of r, used to tint the water around a patch of foam

/** Deterministic 2D hash on a wrapped integer lattice. */
function hash2(ix, iy, period, seed) {
    let x = ((ix % period) + period) % period;
    let y = ((iy % period) + period) % period;
    let h = x * 374761393 + y * 668265263 + seed * 1442695041;
    h = (h ^ (h >> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    const a = ((h ^ (h >> 16)) >>> 0) / 4294967296;
    h = Math.imul(h ^ 0x9e3779b9, 2246822519) >>> 0;
    const b = ((h ^ (h >> 15)) >>> 0) / 4294967296;
    return [a, b];
}

/**
 * Tiling cellular (Worley) field: distance to the nearest jittered feature point, normalised so 0 is
 * a cell centre and 1 is a cell boundary. Wraps exactly at `cells`.
 */
function worley(u, v, cells, seed) {
    const x = u * cells;
    const y = v * cells;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    let best = 1e9;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const [jx, jy] = hash2(ix + dx, iy + dy, cells, seed);
            const px = ix + dx + jx;
            const py = iy + dy + jy;
            const d = (x - px) * (x - px) + (y - py) * (y - py);
            if (d < best) best = d;
        }
    }
    return Math.min(Math.sqrt(best), 1);
}

/** Sum of tiling cellular octaves, each an inverted distance field so cells read as bubbles. */
function bubbles(u, v, baseCells, octaves, seed) {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let cells = baseCells;
    for (let o = 0; o < octaves; o++) {
        sum += amp * (1 - worley(u, v, cells, seed + o * 71));
        norm += amp;
        amp *= 0.5;
        cells *= 2;
    }
    return sum / norm;
}

/**
 * Build the foam texture. Runs once, on the CPU, at start-up.
 *
 * @param {import('playcanvas').GraphicsDevice} device - The graphics device.
 * @param {number} [size] - Edge length in texels; must be a power of two.
 * @returns {Texture} A tiling, mipmapped RGBA texture.
 */
function createFoamTexture(device, size = 512) {
    const data = new Uint8Array(size * size * 4);
    const inv = 1 / size;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = (x + 0.5) * inv;
            const v = (y + 0.5) * inv;

            // coarse clumps: contrast-stretched so the field is mostly empty with dense islands
            let coarse = bubbles(u, v, 6, 3, 17);
            coarse = Math.min(1, Math.max(0, (coarse - 0.34) * 2.1));
            coarse = coarse * coarse * (3 - 2 * coarse);

            // fine bubbles inside a clump
            const fine = Math.min(1, Math.max(0, (bubbles(u, v, 22, 2, 53) - 0.3) * 1.8));

            // slow breakup, so a sheet of foam has holes and streaks in it
            const broad = 0.5 + 0.5 * Math.sin((1 - worley(u, v, 3, 91)) * 5.2 + u * 6.283) *
                Math.cos(v * 6.283 * 2 + (1 - worley(u, v, 4, 29)) * 4.0);

            // a soft halo around the clumps, for tinting the water a patch of foam sits in
            const halo = Math.min(1, Math.max(0, (bubbles(u, v, 5, 2, 17) - 0.18) * 1.5));

            const i = (y * size + x) * 4;
            data[i] = coarse * 255;
            data[i + 1] = fine * 255;
            data[i + 2] = broad * 255;
            data[i + 3] = halo * 255;
        }
    }

    const tex = new Texture(device, {
        name: 'waterFoam', width: size, height: size, format: PIXELFORMAT_RGBA8,
        mipmaps: true, minFilter: FILTER_LINEAR_MIPMAP_LINEAR, magFilter: FILTER_LINEAR,
        addressU: ADDRESS_REPEAT, addressV: ADDRESS_REPEAT, anisotropy: 2,
        levels: [data]
    });
    return tex;
}

/**
 * @typedef {object} ShoreMap
 * @property {Texture} texture - RGBA map of the coast, see {@link bakeShoreMap}.
 * @property {number[]} origin - World XZ of the map's lower corner.
 * @property {number[]} size - World XZ extent the map covers, in metres.
 * @property {number} maxDepth - Depth in metres that R = 1 represents.
 * @property {number} seaLevel - World Y used when baking. Re-bake after changing the water level.
 * @property {() => void} destroy - Dispose the caller-owned texture after detaching the map.
 */

/**
 * Bake the coast into a texture the water shader can read anywhere on the surface.
 *
 * Open-ocean waves know nothing about the land they are running into. What makes a coast read as a
 * coast is everything that happens in the last few metres of depth: the swell shortens and steepens,
 * crests turn until they run parallel to the shore, they break, and the foam left behind washes up
 * and drains back. All of that is driven by one quantity — how deep the water is — which the surface
 * shader has no way to know from the wave simulation alone.
 *
 * So it is baked once, from whatever function describes the sea bed:
 *
 *   r  water depth, normalised against `maxDepth`; 0 is dry land
 *   gb the offshore direction (the normalised gradient of depth), packed into 0..1
 *   a  a smooth land mask, 1 in open water and 0 above the waterline
 *
 * Depth doubles as the phase variable for the shore waves. Lines of constant depth follow the
 * coastline, so a wave whose phase is a function of depth is automatically parallel to the shore and
 * wraps around headlands and sandbars without any extra work — which is the effect wave refraction
 * has in the real world, arrived at from the other end.
 *
 * @param {import('playcanvas').GraphicsDevice} device - The graphics device.
 * @param {object} options - Bake settings.
 * @param {number[]} options.origin - World XZ of the lower corner of the area to cover.
 * @param {number[]} options.size - World XZ extent to cover, in metres.
 * @param {(x: number, z: number) => number} options.heightAt - Sea-bed height at a world position.
 * @param {number} [options.seaLevel] - World Y of the undisturbed surface.
 * @param {number} [options.maxDepth] - Depth that saturates the depth channel. Only the shallows
 * matter, so keep this small — 40 m spends the whole channel on the surf zone.
 * @param {number} [options.resolution] - Texels per side.
 * @returns {ShoreMap} The baked map and the transform that places it in the world.
 */
function bakeShoreMap(device, options) {
    if (!options || typeof options !== 'object') throw new TypeError('Water: shore bake options are required');
    const {
        origin, size, heightAt,
        seaLevel = 0, maxDepth = 40, resolution = 512
    } = options;

    validatePair(origin, 'origin', false);
    validatePair(size, 'size', true);
    if (typeof heightAt !== 'function') throw new TypeError('Water: shore heightAt must be a function');
    if (!Number.isFinite(seaLevel)) throw new TypeError('Water: shore seaLevel must be finite');
    if (!Number.isFinite(maxDepth) || maxDepth <= 0) throw new RangeError('Water: shore maxDepth must be positive');
    if (!Number.isInteger(resolution) || resolution < 2 || resolution > (device.maxTextureSize || 16384)) {
        throw new RangeError('Water: shore resolution must be an integer from 2 to the device texture limit');
    }

    const n = resolution;
    const depth = new Float32Array(n * n);
    const stepX = size[0] / (n - 1);
    const stepZ = size[1] / (n - 1);

    for (let j = 0; j < n; j++) {
        const z = origin[1] + j * stepZ;
        for (let i = 0; i < n; i++) {
            const x = origin[0] + i * stepX;
            const height = heightAt(x, z);
            if (!Number.isFinite(height)) throw new TypeError(`Water: shore heightAt returned a non-finite height at (${x}, ${z})`);
            depth[j * n + i] = Math.max(seaLevel - height, 0);
        }
    }

    const data = new Uint8Array(n * n * 4);
    const at = (i, j) => depth[Math.min(n - 1, Math.max(0, j)) * n + Math.min(n - 1, Math.max(0, i))];

    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            const d = depth[j * n + i];

            // central differences give the direction the sea bed falls away in
            let gx = (at(i + 1, j) - at(i - 1, j)) / (2 * stepX);
            let gz = (at(i, j + 1) - at(i, j - 1)) / (2 * stepZ);
            const len = Math.hypot(gx, gz);
            if (len > 1e-6) { gx /= len; gz /= len; } else { gx = 0; gz = 0; }

            const k = (j * n + i) * 4;
            data[k] = Math.min(1, d / maxDepth) * 255;
            data[k + 1] = (gx * 0.5 + 0.5) * 255;
            data[k + 2] = (gz * 0.5 + 0.5) * 255;
            // a metre of water is already sea; the mask only needs to cut the dry land out
            data[k + 3] = Math.min(1, d / 0.6) * 255;
        }
    }

    const texture = new Texture(device, {
        name: 'waterShoreMap', width: n, height: n, format: PIXELFORMAT_RGBA8,
        mipmaps: false, minFilter: FILTER_LINEAR, magFilter: FILTER_LINEAR,
        addressU: ADDRESS_CLAMP_TO_EDGE, addressV: ADDRESS_CLAMP_TO_EDGE,
        levels: [data]
    });
    let destroyed = false;
    return Object.freeze({
        texture, origin: Object.freeze(origin.slice()), size: Object.freeze(size.slice()), maxDepth, seaLevel,
        get destroyed() { return destroyed; },
        destroy() { if (!destroyed) { destroyed = true; texture.destroy(); } }
    });
}

function validatePair(value, label, positive) {
    if (!Array.isArray(value) || value.length !== 2 ||
        !value.every(n => Number.isFinite(n) && (!positive || n > 0))) {
        throw new TypeError(`Water: shore ${label} must contain two finite ${positive ? 'positive ' : ''}numbers`);
    }
}

/** Internal guard also permits externally generated maps following the documented data contract. */
function validateShoreMap(map, seaLevel) {
    if (!map || typeof map !== 'object' || !map.texture || map.destroyed) throw new TypeError('Water: expected a live shore map or null');
    validatePair(map.origin, 'origin', false);
    validatePair(map.size, 'size', true);
    if (!Number.isFinite(map.maxDepth) || map.maxDepth <= 0) throw new RangeError('Water: shore maxDepth must be positive');
    if (!Number.isFinite(map.seaLevel) || map.seaLevel !== seaLevel) {
        throw new RangeError('Water: shore map must be baked at the water seaLevel');
    }
}

/** A 1x1 stand-in meaning "deep water everywhere", bound when no coast has been supplied. */
function createDeepWaterMap(device) {
    const texture = new Texture(device, {
        name: 'waterShoreMapNone', width: 1, height: 1, format: PIXELFORMAT_RGBA8,
        mipmaps: false, minFilter: FILTER_LINEAR, magFilter: FILTER_LINEAR,
        addressU: ADDRESS_CLAMP_TO_EDGE, addressV: ADDRESS_CLAMP_TO_EDGE,
        levels: [new Uint8Array([255, 128, 128, 255])]
    });
    return texture;
}

// Ocean surface shader (GLSL, WebGL2). A WGSL twin lives in oceanSurface.wgsl.js.
//
// Physically-based water shading:
//   · Fresnel (IOR 1.333) with roughness-aware Schlick
//   · GGX sun highlight widened by the sun's angular radius
//   · pre-filtered environment reflection + screen-space reflections of scene geometry
//   · Beer-Lambert absorption and in-scatter against the scene colour/depth grab
//   · animated caustics projected onto the refracted geometry
//   · crest subsurface scattering
//   · Jacobian whitecaps, wave-driven lacing and shoreline foam
//   · from below: Snell's window with total internal reflection

const WATER_VS = /* glsl */`
attribute vec3 vertex_position;

uniform mat4 matrix_model;
uniform mat4 matrix_viewProjection;
uniform vec3 view_position;

uniform sampler2D uDisp0;
uniform sampler2D uDisp1;
uniform sampler2D uDisp2;
uniform sampler2D uDisp3;
uniform vec4 uCascade[4];      // (lengthScale, fadeStart, fadeEnd, 1/lengthScale)
uniform int  uNumCascades;
uniform float uSeaLevel;
uniform float uDisplacementScale;
uniform vec4 uMeshLod;         // (grid spacing per metre of radius, inner radius, sim size, -)
// Declared identically in both stages: the engine hoists uniforms from vertex and fragment
// sources into one shared block, and two spellings of the same uniform become a redefinition.
// uShoreArea    (originX, originZ, 1/sizeX, 1/sizeZ)
// uShoreParams  (maxDepth, crest spacing in m of depth, speed, break depth)
// uShoreParams2 (foam, swash, shoaling, enabled)
uniform sampler2D uShoreMap;
uniform vec4 uShoreArea;
uniform vec4 uShoreParams;
uniform vec4 uShoreParams2;

varying vec3 vWorldPos;
varying vec4 vClipPos;
varying vec2 vSampleXZ;
varying vec2 vShore;          // (water depth in m, land mask)

float cascadeWeight(int i, float dist) {
    if (i == 0) return 1.0;
    return 1.0 - smoothstep(uCascade[i].y, uCascade[i].z, dist);
}

void main(void) {
    vec3 base = (matrix_model * vec4(vertex_position, 1.0)).xyz;
    base.y = uSeaLevel;
    float dist = distance(base, view_position);

    // The mesh is a camera-centred polar grid whose spacing grows with radius, so past a few
    // metres it cannot carry the shorter waves in a cascade. Point-sampling them anyway aliases,
    // and because the grid slides under the wave field the alias pattern moves with the camera.
    // So each cascade is read at the mip whose texel matches the local grid spacing: the geometry
    // carries what the mesh can represent and the normal map carries the rest.
    float spacing = max(length(vertex_position.xz) * uMeshLod.x, uMeshLod.y);
    float lod0 = log2(max(spacing * uCascade[0].w * uMeshLod.z, 1.0));
    float lod1 = log2(max(spacing * uCascade[1].w * uMeshLod.z, 1.0));
    float lod2 = log2(max(spacing * uCascade[2].w * uMeshLod.z, 1.0));
    float lod3 = log2(max(spacing * uCascade[3].w * uMeshLod.z, 1.0));
    vec3 disp = vec3(0.0);
    disp += textureLod(uDisp0, base.xz * uCascade[0].w, lod0).xyz * cascadeWeight(0, dist);
    if (uNumCascades > 1) disp += textureLod(uDisp1, base.xz * uCascade[1].w, lod1).xyz * cascadeWeight(1, dist);
    if (uNumCascades > 2) disp += textureLod(uDisp2, base.xz * uCascade[2].w, lod2).xyz * cascadeWeight(2, dist);
    if (uNumCascades > 3) disp += textureLod(uDisp3, base.xz * uCascade[3].w, lod3).xyz * cascadeWeight(3, dist);

    // ---- the coast ----
    vec2 shoreUv = (base.xz - uShoreArea.xy) * uShoreArea.zw;
    vec4 shore = texture(uShoreMap, clamp(shoreUv, 0.0, 1.0));
    // Outside a supplied bathymetry map the surface is open ocean, not its clamped edge.
    if (any(lessThan(shoreUv, vec2(0.0))) || any(greaterThan(shoreUv, vec2(1.0)))) shore = vec4(1.0, 0.5, 0.5, 1.0);
    float depth = shore.x * uShoreParams.x;
    float landMask = shore.w;
    vShore = vec2(depth, landMask);

    if (uShoreParams2.w > 0.5) {
        // A wave cannot be taller than the water it is standing in: as the bed rises the swell has
        // to give up its amplitude, and it does so by rearing up first. Both halves matter — without
        // the damping the sea saws straight through the beach, without the rearing there is no surf.
        float shoal = clamp(depth / max(uShoreParams.w * 2.5, 0.5), 0.0, 1.0);
        float rear = 1.0 + uShoreParams2.z * (1.0 - shoal) * shoal * 4.0;
        disp.y *= shoal * rear;
        disp.xz *= mix(0.35, 1.0, shoal);
        disp *= landMask;
    }

    vec3 worldPos = base + disp * uDisplacementScale;
    // The wave field is a function of the *undisplaced* point: the surface at base.xz has moved to
    // worldPos, but its slope, its folding and the foam riding on it all belong to base.xz. Reading
    // them back at worldPos.xz instead offsets everything by the horizontal displacement — metres,
    // on a choppy sea — which is what puts whitecaps in the troughs instead of on the crest faces.
    vSampleXZ = base.xz;
    vWorldPos = worldPos;
    vClipPos = matrix_viewProjection * vec4(worldPos, 1.0);
    gl_Position = vClipPos;
}
`;

const WATER_FS = /* glsl */`
#include "decodePS"
#include "gammaPS"
#include "tonemappingPS"
#include "fogPS"
#include "screenDepthPS"
#include "sphericalPS"
#include "envAtlasPS"

uniform sampler2D uSceneColorMap;
uniform sampler2D texture_envAtlas;
uniform sampler2D uFoamTex;

uniform vec3 view_position;
uniform mat4 matrix_viewProjection;

uniform sampler2D uDisp0;
uniform sampler2D uDisp1;
uniform sampler2D uDisp2;
uniform sampler2D uDisp3;
uniform sampler2D uDeriv0;
uniform sampler2D uDeriv1;
uniform sampler2D uDeriv2;
uniform sampler2D uDeriv3;
uniform vec4 uCascade[4];
uniform int  uNumCascades;
uniform float uLambda;
uniform float uDisplacementScale;
uniform float uTime;

uniform vec3  uSunDir;          // towards the sun (world)
uniform vec3  uSunColor;        // sun irradiance (linear)
uniform float uSunRadius;       // tan(angular radius) used to widen the highlight

uniform vec3  uExtinction;      // per-channel extinction 1/m
uniform vec3  uScatterColor;    // volumetric in-scatter albedo
uniform float uScatterStrength;
uniform vec3  uSSSColor;
uniform vec4  uSSSParams;       // (strength, power, height scale, normal distortion)
uniform vec4  uSurfaceParams;   // (roughness, roughnessDistance, envStrength, specularStrength)
uniform vec4  uRefractionParams;// (strength, blur, max thickness for distortion, unused)
uniform vec4  uFoamParams;      // (bias, sharpness, tiling, shoreDistance)
uniform vec3  uFoamColor;
uniform float uFoamStrength;
uniform vec4  uFoamCascadeWeights;
uniform sampler2D uSkyRadiance;
uniform float uHasSkyRadiance;
uniform float uEnvironmentExposure;
uniform float uWaterRadius;
uniform float uFogDensity;      // aerial perspective towards the sky colour in the view direction
uniform vec4  uSSRParams;       // (intensity, maxDistance, steps, thickness tolerance)
uniform vec3  uCausticsParams;  // (intensity, inverse footprint, depth fade 1/m)
uniform float uSeaLevel;
uniform sampler2D uShoreMap;
uniform vec4 uShoreArea;
uniform vec4 uShoreParams;
uniform vec4 uShoreParams2;

varying vec3 vWorldPos;
varying vec4 vClipPos;
varying vec2 vSampleXZ;
varying vec2 vShore;

#define F0 0.02
#define IOR_AIR_WATER 0.75187969   // 1.0 / 1.333
#define IOR_WATER_AIR 1.333

${SURFACE_CAUSTICS_GLSL}

float cascadeWeight(int i, float dist) {
    if (i == 0) return 1.0;
    return 1.0 - smoothstep(uCascade[i].y, uCascade[i].z, dist);
}

// environment reflection from the prefiltered atlas (roughness in [0,1])
vec3 sampleEnv(vec3 dir, float roughness) {
    vec3 d = normalize(dir) * vec3(-1.0, 1.0, 1.0);
    vec2 uv = toSphericalUv(d);
    float level = clamp(roughness * 5.0, 0.0, 5.0);
    float il = floor(level);
    vec2 uvA = il == 0.0 ? mapShinyUv(uv, 0.0) : mapRoughnessUv(uv, il);
    vec2 uvB = mapRoughnessUv(uv, il + 1.0);
    vec3 a = {ENV_DECODE}(texture(texture_envAtlas, uvA));
    vec3 b = {ENV_DECODE}(texture(texture_envAtlas, uvB));
    return mix(a, b, level - il) * uEnvironmentExposure;
}
// Aerial light uses the unfiltered sky, not a roughness-convolved reflection that mixes
// planetary ground into the horizon. Generic environments can use the atlas fallback.
vec3 sampleAerial(vec3 dir) {
    if (uHasSkyRadiance > 0.5) return textureLod(uSkyRadiance, toSphericalUv(normalize(dir) * vec3(-1.0, 1.0, 1.0)), 0.0).rgb * uEnvironmentExposure;
    return sampleEnv(dir, 0.0);
}
vec3 sampleAmbient(vec3 dir) {
    vec3 d = normalize(dir) * vec3(-1.0, 1.0, 1.0);
    vec2 uv = mapUv(toSphericalUv(d), vec4(128.0, 256.0 + 128.0, 64.0, 32.0) / atlasSize);
    return {ENV_DECODE}(texture(texture_envAtlas, uv)) * uEnvironmentExposure;
}

// GGX specular for a directional light with angular size widening (Karis 2013)
float ggxSpecular(vec3 N, vec3 V, vec3 L, float roughness) {
    float a = roughness * roughness;
    float aWide = clamp(a + uSunRadius, 0.0, 1.0);
    // The widened GGX distribution is already normalized; retain its integrated energy.
    vec3 H = (V + L) / max(length(V + L), 1e-5);
    float NdotH = max(dot(N, H), 0.0);
    float NdotV = max(dot(N, V), 1e-4);
    float NdotL = max(dot(N, L), 0.0);
    float a2 = aWide * aWide;
    float d = NdotH * NdotH * (a2 - 1.0) + 1.0;
    float D = a2 / (3.14159265 * d * d);
    float k = aWide * 0.5;
    float Vis = 1.0 / ((NdotV * (1.0 - k) + k) * (NdotL * (1.0 - k) + k));   // Smith-Schlick, includes 1/(4 NdotV NdotL)
    return D * Vis * 0.25 * NdotL;
}

// ---- screen-space reflections against the opaque colour/depth grab ----
// Marches the reflected ray in world space with a geometrically growing step, then bisects the
// crossing. Returns the reflected colour; 'mask' is the confidence (0 = miss, fall back to the sky).
vec3 traceSSR(vec3 origin, vec3 dir, float roughness, float dither, out float mask) {
    mask = 0.0;
    int steps = int(uSSRParams.z);
    float stride = uSSRParams.y * 0.14 / (pow(1.14, float(steps)) - 1.0);
    float tol = uSSRParams.w;

    vec3 prev = origin;
    float t = stride * (0.5 + dither);
    float grow = 1.0;
    for (int i = 0; i < 40; i++) {
        if (i >= steps || t > uSSRParams.y) break;
        vec3 p = origin + dir * t;
        vec4 clip = matrix_viewProjection * vec4(p, 1.0);
        if (clip.w <= 0.0) break;
        vec2 uv = getGrabScreenPos(clip);
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;

        float sceneD = getLinearScreenDepth(uv);
        float rayD = getLinearDepth(p);
        float delta = rayD - sceneD;
        if (delta > 0.0 && delta < tol + stride * grow) {
            // bisect between prev (in front) and p (behind) for a tighter hit
            vec3 a = prev, b = p;
            for (int j = 0; j < 5; j++) {
                vec3 m = (a + b) * 0.5;
                vec4 mc = matrix_viewProjection * vec4(m, 1.0);
                vec2 muv = getGrabScreenPos(mc);
                if (getLinearDepth(m) - getLinearScreenDepth(muv) > 0.0) b = m; else a = m;
            }
            vec4 hc = matrix_viewProjection * vec4(b, 1.0);
            uv = getGrabScreenPos(hc);
            // fade at the screen border, at grazing rays and with distance travelled
            vec2 edge = smoothstep(vec2(0.0), vec2(0.12), uv) * smoothstep(vec2(0.0), vec2(0.12), 1.0 - uv);
            mask = edge.x * edge.y * (1.0 - smoothstep(0.6, 1.0, t / uSSRParams.y));
            vec3 hitColor = textureLod(uSceneColorMap, uv, min(roughness * 8.0, 4.0)).rgb;
            #ifdef SCENE_COLORMAP_GAMMA
                hitColor = decodeGamma(hitColor);
            #endif
            return hitColor;
        }
        prev = p;
        grow *= 1.14;
        t += stride * grow;
    }
    return vec3(0.0);
}

void main(void) {
    vec3 worldPos = vWorldPos;
    vec3 camToPos = worldPos - view_position;
    float dist = max(length(camToPos), 1e-4);
    vec3 V = -camToPos / dist;
    bool underwater = view_position.y < uSeaLevel;

    // ---- normal from summed slope derivatives ----
    // slopes follow the cascade LOD; the folding (Jacobian) does not — see the WGSL twin
    vec4 dsum = vec4(0.0);
    float wsum = 0.0;
    float jac = 1.0;
    float w;
    vec2 cuv;
    w = cascadeWeight(0, dist); cuv = vSampleXZ * uCascade[0].w; dsum += texture(uDeriv0, cuv) * w; jac += (texture(uDisp0, cuv).w - 1.0) * uFoamCascadeWeights.x; wsum += w;
    if (uNumCascades > 1) { w = cascadeWeight(1, dist); cuv = vSampleXZ * uCascade[1].w; dsum += texture(uDeriv1, cuv) * w; jac += (texture(uDisp1, cuv).w - 1.0) * uFoamCascadeWeights.y; wsum += w; }
    if (uNumCascades > 2) { w = cascadeWeight(2, dist); cuv = vSampleXZ * uCascade[2].w; dsum += texture(uDeriv2, cuv) * w; jac += (texture(uDisp2, cuv).w - 1.0) * uFoamCascadeWeights.z; wsum += w; }
    if (uNumCascades > 3) { w = cascadeWeight(3, dist); cuv = vSampleXZ * uCascade[3].w; dsum += texture(uDeriv3, cuv) * w; jac += (texture(uDisp3, cuv).w - 1.0) * uFoamCascadeWeights.w; wsum += w; }
    dsum *= uDisplacementScale;
    float detail = wsum / float(uNumCascades);
    // A folded FFT surface has no single-valued slope. Bound its horizontal Jacobian
    // before division so breaking crests stay finite rather than flipping inside out.
    vec2 slope = dsum.xy / max(vec2(1.0) + uLambda * dsum.zw, vec2(0.1));
    vec3 Nup = normalize(vec3(-slope.x, 1.0, -slope.y));
    vec3 N = underwater ? -Nup : Nup;
    // keep the normal facing the viewer (steep backfaces of choppy waves)
    float NdotVraw = dot(N, V);
    if (NdotVraw < 0.02) N = normalize(N + V * (0.02 - NdotVraw));
    float NdotV = max(dot(N, V), 1e-4);

    // ---- roughness increases as high-frequency cascades fade ----
    float roughness = clamp(uSurfaceParams.x + uSurfaceParams.y * (1.0 - detail), 0.02, 1.0);
    // geometric specular anti-aliasing (Tokuyoshi & Kaplanyan): fold normal variance within the pixel into roughness
    vec3 dndx = dFdx(N), dndy = dFdy(N);
    float nVar = 0.25 * (dot(dndx, dndx) + dot(dndy, dndy));
    roughness = sqrt(clamp(roughness * roughness + min(2.0 * nVar, 0.2), 0.0, 1.0));

    // ---- Fresnel (Schlick) ----
    // Plain Schlick, not the roughness-capped variant: that one is an ambient-occlusion
    // approximation, and capping grazing reflectance at (1 - roughness) means a rough sea reflects
    // only half the sky at the horizon. The far water then comes out darker than the sky above it,
    // which is what draws a line along the horizon. Roughness belongs in the lobe, not here.
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - NdotV, 5.0);

    // ---- refraction / underwater volume ----
    vec2 screenUv = getGrabScreenPos(vClipPos);
    float surfaceDepth = getLinearDepth(worldPos);
    float sceneDepth = getLinearScreenDepth(screenUv);
    float thickness = max(sceneDepth - surfaceDepth, 0.0);
    // Reconstruct the opaque receiver at the original pixel. Distance to its tangent plane
    // makes the contact band stable when the camera turns; eye-depth thickness does not.
    vec3 opaquePos = view_position + camToPos * (sceneDepth / max(surfaceDepth, 1e-4));
    vec3 receiverCross = cross(dFdx(opaquePos), dFdy(opaquePos));
    vec3 receiverNormal = receiverCross * inversesqrt(max(dot(receiverCross, receiverCross), 1e-8));
    float contactDistance = abs(dot(opaquePos - worldPos, receiverNormal));
    float contactNearby = 1.0 - smoothstep(2.0, 4.0, length(opaquePos - worldPos));

    // Project the refracted ray into the camera, so distortion follows camera heading/roll.
    vec3 camFwd = -vec3(matrix_view[0].z, matrix_view[1].z, matrix_view[2].z);
    vec3 refrDir = refract(-V, N, underwater ? IOR_WATER_AIR : IOR_AIR_WATER);
    vec3 offsetPoint = worldPos + refrDir * min(thickness, uRefractionParams.z);
    vec2 offset = (getGrabScreenPos(matrix_viewProjection * vec4(offsetPoint, 1.0)) - screenUv) * uRefractionParams.x;
    offset = clamp(offset, vec2(-0.05), vec2(0.05));
    vec2 refrUv = clamp(screenUv + offset, vec2(0.001), vec2(0.999));
    float refrDepth = getLinearScreenDepth(refrUv);
    if (refrDepth < surfaceDepth) { refrUv = screenUv; refrDepth = sceneDepth; }
    thickness = max(refrDepth - surfaceDepth, 0.0);
    float opticalDistance = thickness / max(dot(refrDir, camFwd), 0.15);
    float lod = min(opticalDistance * uRefractionParams.y, 4.0);
    vec3 sceneColor = textureLod(uSceneColorMap, refrUv, lod).rgb;
    #ifdef SCENE_COLORMAP_GAMMA
        sceneColor = decodeGamma(sceneColor);
    #endif

    vec3 ambientUp = sampleAmbient(vec3(0.0, 1.0, 0.0));
    vec3 sunE = uSunColor;
    float sunUp = clamp(uSunDir.y, 0.0, 1.0);

    // Pixel derivatives stay outside divergent branches for both rendering backends.
    float causticPixelMetres = max(length(dFdx(opaquePos.xz)), length(dFdy(opaquePos.xz)));
    // Shared, bounded wave-ray focusing modulates the receiver's existing light.
    if (uCausticsParams.x > 0.0 && uDisplacementScale > 0.0 && thickness > 0.0 && !underwater && sunUp > 0.0) {
        vec3 hit = worldPos + refrDir * opticalDistance;
        float depthBelow = max(uSeaLevel - hit.y, 0.0);
        vec3 sunRay = waterCausticSunRay(uSunDir);
        float lightPath = depthBelow / max(-sunRay.y, 0.1);
        vec2 entry = hit.xz - sunRay.xz * lightPath;
        float focus = waterCausticFocus(entry, depthBelow, uCausticsParams.y,
            uSunDir, causticPixelMetres);
        float facing = max(dot(receiverNormal, -sunRay), 0.0);
        float direct = dot(sunE, vec3(0.2126, 0.7152, 0.0722)) * facing;
        float diffuseSky = dot(ambientUp, vec3(0.2126, 0.7152, 0.0722)) * 3.14159265;
        float directFraction = direct / max(direct + diffuseSky, 1e-5);
        float fade = exp(-depthBelow * uCausticsParams.z) * smoothstep(0.02, 0.35, sunUp) * detail;
        float amount = uCausticsParams.x * min(uDisplacementScale, 1.0) * fade * directFraction;
        sceneColor *= max(vec3(0.0), vec3(1.0) + (focus - 1.0) * amount * exp(-uExtinction * lightPath));
    }

    // ---- subsurface scattering through crests (Atlas / Sea of Thieves style) ----
    float waveHeight = max(worldPos.y - uSeaLevel, 0.0);
    vec3 Ls = normalize(-uSunDir + Nup * uSSSParams.w);
    float sssView = pow(clamp(dot(V, Ls), 0.0, 1.0), uSSSParams.y);
    float sssHeight = clamp(waveHeight * uSSSParams.z, 0.0, 1.0);
    vec3 sss = uSSSColor * (sunE * sssView * sssHeight * uSSSParams.x * sunUp + ambientUp * sssHeight * uSSSParams.x * 0.25);

    vec3 scatterRadiance = uScatterColor * uScatterStrength * (ambientUp + sunE * sunUp * 0.3183) + sss;
    vec3 T = exp(-uExtinction * opticalDistance);
    vec3 refracted = sceneColor * T + scatterRadiance * (1.0 - T);

    vec3 windowRay = refract(-V, N, IOR_WATER_AIR);
    float sunWindowCos = dot(windowRay / max(length(windowRay), 1e-5), uSunDir);
    float sunWindowEdge = max(fwidth(sunWindowCos), 1e-6);
    vec3 color;
    if (underwater) {
        // ---- looking up from below: Snell's window, total internal reflection outside it ----
        vec3 up = refract(-V, N, IOR_WATER_AIR);
        float tir = dot(up, up) < 1e-5 ? 1.0 : 0.0;
        vec3 skyThroughSurface = vec3(0.0);
        if (tir < 0.5) {
            skyThroughSurface = sampleEnv(up, roughness) * uSurfaceParams.z;
            // sun disc seen through the window
            float sunCos = sunWindowCos;
            float radius = max(uSunRadius, 1e-4);
            float edge = sunWindowEdge;
            float disc = smoothstep(cos(radius) - edge, cos(radius) + edge, sunCos);
            skyThroughSurface += sunE * disc / max(3.14159265 * radius * radius, 1e-6);
        }
        // the water below the surface, mirrored back down when past the critical angle
        vec3 mirrored = scatterRadiance;
        // Exact dielectric Fresnel approaches one smoothly at the critical angle.
        float cosT = sqrt(max(1.0 - IOR_WATER_AIR * IOR_WATER_AIR * (1.0 - NdotV * NdotV), 0.0));
        float rs = (IOR_WATER_AIR * NdotV - cosT) / max(IOR_WATER_AIR * NdotV + cosT, 1e-5);
        float rp = (NdotV - IOR_WATER_AIR * cosT) / max(NdotV + IOR_WATER_AIR * cosT, 1e-5);
        float fUp = mix(0.5 * (rs * rs + rp * rp), 1.0, tir);
        color = mix(skyThroughSurface, mirrored, fUp);
    } else {
        vec3 R = reflect(-V, N);
        vec3 envRefl = sampleEnv(R, roughness) * uSurfaceParams.z;
        // only worth tracing when the ray stays low enough to plausibly meet geometry
        if (uSSRParams.x > 0.0 && roughness < 0.3 && R.y < 0.4) {
            float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453 + uTime);
            float mask;
            vec3 ssr = traceSSR(worldPos, R, roughness, dither, mask);
            mask *= uSSRParams.x * (1.0 - smoothstep(0.15, 0.35, roughness));
            envRefl = mix(envRefl, ssr, clamp(mask, 0.0, 1.0));
        }
        float spec = ggxSpecular(N, V, uSunDir, roughness) * uSurfaceParams.w;
        vec3 H = (V + uSunDir) / max(length(V + uSunDir), 1e-5);
        float FH = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
        vec3 sunSpec = sunE * spec * FH;
        color = refracted * (1.0 - fresnel) + envRefl * fresnel + sunSpec;
    }

    // ---- foam: whitecaps where the surface is folding, plus a shoreline band ----
    float foamMask = clamp((uFoamParams.x - jac) * uFoamParams.y, 0.0, 1.0);
    vec2 foamUv = vSampleXZ * uFoamParams.z;
    // two scales drifting apart, so the bubble field never reads as a repeating tile
    vec4 fa = texture(uFoamTex, foamUv + vec2(uTime * 0.011, uTime * 0.006));
    vec4 fb = texture(uFoamTex, foamUv * 2.83 - vec2(uTime * 0.019, uTime * -0.013));
    float clumps = fa.r * 0.62 + fb.r * 0.38;
    float bubbles = fa.g * 0.5 + fb.g * 0.5;
    float lace = clamp(clumps * mix(0.72, 1.28, fa.b) + bubbles * 0.22, 0.0, 1.0);

    float whitecap = foamMask * smoothstep(1.0 - foamMask * 1.15, max(1.0 - foamMask * 0.22, 1.001 - foamMask * 1.15), lace);
    whitecap *= mix(0.72, 1.0, bubbles);
    // Past a couple of kilometres a whitecap is smaller than a pixel. The mip-averaged texture put
    // through the threshold above still reports ~40% coverage there, and foam lit by a dull sky is
    // darker than the horizon glow behind it — which is what paints a dark band along the horizon
    // on a stormy sea. So the resolved coverage is faded with distance instead.
    whitecap *= 1.0 - 0.75 * smoothstep(700.0, 2600.0, dist);

    float shore = (1.0 - smoothstep(0.02, 0.55, contactDistance)) * contactNearby;
    float shoreBands = 0.5 + 0.5 * sin(contactDistance * 9.0 - uTime * 1.3 + fa.b * 5.0);
    float shoreFoam = shore * shore * clamp((lace * 0.9 + shoreBands * 0.5 + shore * 0.6 - 0.78) * 3.2, 0.0, 1.0);

    // ---- surf: bands of broken water riding the shoaling swell in towards the beach ----
    float surfFoam = 0.0;
    if (uShoreParams2.w > 0.5) {
        float depth = vShore.x;
        vec4 sh = texture(uShoreMap, clamp((vSampleXZ - uShoreArea.xy) * uShoreArea.zw, 0.0, 1.0));
        vec2 offshore = sh.yz * 2.0 - 1.0;

        // Depth is the phase variable, so a crest is a line of constant depth: parallel to the shore
        // wherever the shore happens to run, and bending around a headland the way refraction does.
        float phase = depth / max(uShoreParams.y, 0.05) + uTime * uShoreParams.z;
        // break the bands up so they are not perfectly regular
        phase += (fa.b - 0.5) * 0.35 + dot(vSampleXZ, offshore) * 0.004;
        float band = 0.5 - 0.5 * cos(phase * 6.28318530718);

        // waves break where the water gets too shallow to hold them, and the foam lingers after
        float breaking = 1.0 - smoothstep(uShoreParams.w * 0.3, uShoreParams.w * 1.4, depth);
        float crest = pow(band, 3.0);
        float surf = crest * breaking;

        // swash: the sheet of foam left on the sand, always there, thickest at the waterline
        // swash: a lace a metre or two wide that runs up the sand and drains back, not a sheet
        float swashPulse = 0.4 + 0.6 * (0.5 + 0.5 * sin(uTime * 0.9 + fa.b * 6.0 + depth * 4.0));
        float swash = uShoreParams2.y * (1.0 - smoothstep(0.0, uShoreParams.w * 0.2, depth)) * swashPulse;

        surfFoam = clamp((surf + swash) * lace * 1.15 * uShoreParams2.x, 0.0, 1.0);
        surfFoam *= vShore.y;
    }

    float foam = clamp((whitecap + shoreFoam + surfFoam) * uFoamStrength, 0.0, 1.0);
    if (underwater) foam *= 0.25;

    // the water immediately around a foam patch is aerated: lighter, and less transparent
    float aerate = clamp((fa.a * 0.7 + fb.a * 0.3) * foamMask * uFoamStrength - 0.25, 0.0, 1.0) * 0.22;
    float NdotL = max(dot(Nup, uSunDir), 0.0);
    vec3 foamLit = uFoamColor * (ambientUp + sunE * (NdotL * 0.85 + 0.15) * 0.3183);
    // wet foam has a sheen: at grazing angles it mirrors the sky like the water around it
    if (!underwater) foamLit = mix(foamLit, sampleEnv(reflect(-V, Nup), 0.35), fresnel * 0.55);
    color = mix(color, foamLit * 0.55, aerate * (1.0 - foam));
    color = mix(color, foamLit, foam);

    if (!underwater) {
        // Exponential atmospheric extinction, plus a separate coverage fade at the finite
        // mesh boundary. Sampling the actual horizon removes the old fixed-elevation stripe.
        vec3 apDir = normalize(vec3(camToPos.x, max(camToPos.y, 0.0), camToPos.z));
        vec3 horizonSky = sampleAerial(apDir);
        float coverage = 1.0 - smoothstep(uWaterRadius * 0.72, uWaterRadius * 0.98, dist);
        color = mix(horizonSky, color, exp(-uFogDensity * dist) * coverage);
    } else {
        // seen through the water body: absorb along the view ray
        color = mix(scatterRadiance, color, exp(-uExtinction * dist));
    }
    // The surface dissolves where the water runs out of depth, so the shoreline is a wet gradient
    // rather than a cut; the foam lying in the swash stays.
    float alpha = 1.0;
    if (!underwater) alpha = clamp(smoothstep(0.0, 0.08, mix(1.0, contactDistance, contactNearby)) + foam * 0.7, 0.0, 1.0);
    // Keep HDR output representable in half-float targets, independently of the camera grade.
    gl_FragColor = vec4(gammaCorrectOutput(toneMap(clamp(color, 0.0, 60000.0))), alpha);
}
`;

// Ocean surface shader — native WGSL for WebGPU. Mirrors oceanSurface.glsl.js exactly.

const WATER_VS_WGSL = /* wgsl */`
attribute vertex_position: vec3f;

uniform matrix_model: mat4x4f;
uniform matrix_viewProjection: mat4x4f;
uniform view_position: vec3f;
uniform uCascade: array<vec4f, 4>;
uniform uNumCascades: i32;
uniform uSeaLevel: f32;
uniform uDisplacementScale: f32;
uniform uShoreArea: vec4f;
uniform uShoreParams: vec4f;
uniform uShoreParams2: vec4f;
uniform uMeshLod: vec4f;      // (grid spacing per metre of radius, inner radius, sim size, -)

var uShoreMap: texture_2d<f32>;
var uShoreMapSampler: sampler;
var uDisp0: texture_2d<f32>;
var uDisp0Sampler: sampler;
var uDisp1: texture_2d<f32>;
var uDisp1Sampler: sampler;
var uDisp2: texture_2d<f32>;
var uDisp2Sampler: sampler;
var uDisp3: texture_2d<f32>;
var uDisp3Sampler: sampler;

varying vWorldPos: vec3f;
varying vClipPos: vec4f;
varying vSampleXZ: vec2f;
varying vShore: vec2f;

fn cascadeWeight(i: i32, dist: f32) -> f32 {
    if (i == 0) { return 1.0; }
    return 1.0 - smoothstep(uniform.uCascade[i].y, uniform.uCascade[i].z, dist);
}

@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    var base = (uniform.matrix_model * vec4f(input.vertex_position, 1.0)).xyz;
    base.y = uniform.uSeaLevel;
    let dist = distance(base, uniform.view_position);

    // The grid's spacing here, in metres, against each cascade's texel: the mip whose texel is
    // the spacing holds only the waves this vertex density can represent. See the GLSL twin.
    let spacing = max(length(input.vertex_position.xz) * uniform.uMeshLod.x, uniform.uMeshLod.y);
    let lod0 = log2(max(spacing * uniform.uCascade[0].w * uniform.uMeshLod.z, 1.0));
    let lod1 = log2(max(spacing * uniform.uCascade[1].w * uniform.uMeshLod.z, 1.0));
    let lod2 = log2(max(spacing * uniform.uCascade[2].w * uniform.uMeshLod.z, 1.0));
    let lod3 = log2(max(spacing * uniform.uCascade[3].w * uniform.uMeshLod.z, 1.0));
    var disp = vec3f(0.0);
    disp += textureSampleLevel(uDisp0, uDisp0Sampler, base.xz * uniform.uCascade[0].w, lod0).xyz * cascadeWeight(0, dist);
    if (uniform.uNumCascades > 1) { disp += textureSampleLevel(uDisp1, uDisp1Sampler, base.xz * uniform.uCascade[1].w, lod1).xyz * cascadeWeight(1, dist); }
    if (uniform.uNumCascades > 2) { disp += textureSampleLevel(uDisp2, uDisp2Sampler, base.xz * uniform.uCascade[2].w, lod2).xyz * cascadeWeight(2, dist); }
    if (uniform.uNumCascades > 3) { disp += textureSampleLevel(uDisp3, uDisp3Sampler, base.xz * uniform.uCascade[3].w, lod3).xyz * cascadeWeight(3, dist); }

    // ---- the coast; see the GLSL twin ----
    let shoreUv = (base.xz - uniform.uShoreArea.xy) * uniform.uShoreArea.zw;
    var shore = textureSampleLevel(uShoreMap, uShoreMapSampler, clamp(shoreUv, vec2f(0.0), vec2f(1.0)), 0.0);
    if (any(shoreUv < vec2f(0.0)) || any(shoreUv > vec2f(1.0))) { shore = vec4f(1.0, 0.5, 0.5, 1.0); }
    let depth = shore.x * uniform.uShoreParams.x;
    output.vShore = vec2f(depth, shore.w);

    if (uniform.uShoreParams2.w > 0.5) {
        let shoal = clamp(depth / max(uniform.uShoreParams.w * 2.5, 0.5), 0.0, 1.0);
        let rear = 1.0 + uniform.uShoreParams2.z * (1.0 - shoal) * shoal * 4.0;
        disp.y *= shoal * rear;
        disp = vec3f(disp.x * mix(0.35, 1.0, shoal), disp.y, disp.z * mix(0.35, 1.0, shoal));
        disp *= shore.w;
    }

    let worldPos = base + disp * uniform.uDisplacementScale;
    // see the GLSL twin: slope, folding and foam are functions of the undisplaced point
    output.vSampleXZ = base.xz;
    output.vWorldPos = worldPos;
    output.vClipPos = uniform.matrix_viewProjection * vec4f(worldPos, 1.0);
    output.position = output.vClipPos;
    return output;
}
`;

const WATER_FS_WGSL = /* wgsl */`
#include "decodePS"
#include "gammaPS"
#include "tonemappingPS"
#include "fogPS"
#include "screenDepthPS"
#include "sphericalPS"
#include "envAtlasPS"

var uSceneColorMap: texture_2d<f32>;
var uSceneColorMapSampler: sampler;
var texture_envAtlas: texture_2d<f32>;
var texture_envAtlas_sampler: sampler;
var uFoamTex: texture_2d<f32>;
var uFoamTexSampler: sampler;

uniform view_position: vec3f;
uniform matrix_viewProjection: mat4x4f;

var uDisp0: texture_2d<f32>;
var uDisp0Sampler: sampler;
var uDisp1: texture_2d<f32>;
var uDisp1Sampler: sampler;
var uDisp2: texture_2d<f32>;
var uDisp2Sampler: sampler;
var uDisp3: texture_2d<f32>;
var uDisp3Sampler: sampler;
var uDeriv0: texture_2d<f32>;
var uDeriv0Sampler: sampler;
var uDeriv1: texture_2d<f32>;
var uDeriv1Sampler: sampler;
var uDeriv2: texture_2d<f32>;
var uDeriv2Sampler: sampler;
var uDeriv3: texture_2d<f32>;
var uDeriv3Sampler: sampler;
uniform uCascade: array<vec4f, 4>;
uniform uNumCascades: i32;
uniform uLambda: f32;
uniform uDisplacementScale: f32;
uniform uTime: f32;

uniform uSunDir: vec3f;
uniform uSunColor: vec3f;
uniform uSunRadius: f32;

uniform uExtinction: vec3f;
uniform uScatterColor: vec3f;
uniform uScatterStrength: f32;
uniform uSSSColor: vec3f;
uniform uSSSParams: vec4f;
uniform uSurfaceParams: vec4f;
uniform uRefractionParams: vec4f;
uniform uFoamParams: vec4f;
uniform uFoamColor: vec3f;
uniform uFoamStrength: f32;
uniform uFoamCascadeWeights: vec4f;
var uSkyRadiance: texture_2d<f32>;
var uSkyRadianceSampler: sampler;
uniform uHasSkyRadiance: f32;
uniform uEnvironmentExposure: f32;
uniform uWaterRadius: f32;
uniform uFogDensity: f32;
uniform uSSRParams: vec4f;
uniform uCausticsParams: vec3f;
uniform uSeaLevel: f32;
uniform uShoreArea: vec4f;
uniform uShoreParams: vec4f;
uniform uShoreParams2: vec4f;
var uShoreMap: texture_2d<f32>;
var uShoreMapSampler: sampler;

varying vWorldPos: vec3f;
varying vClipPos: vec4f;
varying vSampleXZ: vec2f;
varying vShore: vec2f;

const F0: f32 = 0.02;
const IOR_AIR_WATER: f32 = 0.75187969;
const IOR_WATER_AIR: f32 = 1.333;

${SURFACE_CAUSTICS_WGSL}

fn cascadeWeight(i: i32, dist: f32) -> f32 {
    if (i == 0) { return 1.0; }
    return 1.0 - smoothstep(uniform.uCascade[i].y, uniform.uCascade[i].z, dist);
}

fn sampleEnv(dir: vec3f, roughness: f32) -> vec3f {
    let d = normalize(dir) * vec3f(-1.0, 1.0, 1.0);
    let uv = toSphericalUv(d);
    let level = clamp(roughness * 5.0, 0.0, 5.0);
    let il = floor(level);
    let uvA = select(mapRoughnessUv(uv, il), mapShinyUv(uv, 0.0), il == 0.0);
    let uvB = mapRoughnessUv(uv, il + 1.0);
    let a = {ENV_DECODE}(textureSampleLevel(texture_envAtlas, texture_envAtlas_sampler, uvA, 0.0));
    let b = {ENV_DECODE}(textureSampleLevel(texture_envAtlas, texture_envAtlas_sampler, uvB, 0.0));
    return mix(a, b, level - il) * uniform.uEnvironmentExposure;
}
fn sampleAerial(dir: vec3f) -> vec3f {
    if (uniform.uHasSkyRadiance > 0.5) {
        return textureSampleLevel(uSkyRadiance, uSkyRadianceSampler, toSphericalUv(normalize(dir) * vec3f(-1.0, 1.0, 1.0)), 0.0).rgb * uniform.uEnvironmentExposure;
    }
    return sampleEnv(dir, 0.0);
}
fn sampleAmbient(dir: vec3f) -> vec3f {
    let d = normalize(dir) * vec3f(-1.0, 1.0, 1.0);
    let uv = mapUv(toSphericalUv(d), vec4f(128.0, 256.0 + 128.0, 64.0, 32.0) / atlasSize);
    return {ENV_DECODE}(textureSampleLevel(texture_envAtlas, texture_envAtlas_sampler, uv, 0.0)) * uniform.uEnvironmentExposure;
}

fn ggxSpecular(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {
    let a = roughness * roughness;
    let aWide = clamp(a + uniform.uSunRadius, 0.0, 1.0);
    // The widened GGX distribution is already normalized.
    let H = (V + L) / max(length(V + L), 1e-5);
    let NdotH = max(dot(N, H), 0.0);
    let NdotV = max(dot(N, V), 1e-4);
    let NdotL = max(dot(N, L), 0.0);
    let a2 = aWide * aWide;
    let d = NdotH * NdotH * (a2 - 1.0) + 1.0;
    let D = a2 / (3.14159265 * d * d);
    let k = aWide * 0.5;
    let Vis = 1.0 / ((NdotV * (1.0 - k) + k) * (NdotL * (1.0 - k) + k));
    return D * Vis * 0.25 * NdotL;
}

struct SsrResult { color: vec3f, mask: f32 }

// ---- screen-space reflections against the opaque colour/depth grab ----
fn traceSSR(origin: vec3f, dir: vec3f, roughness: f32, dither: f32) -> SsrResult {
    var res: SsrResult;
    res.color = vec3f(0.0);
    res.mask = 0.0;
    let steps = i32(uniform.uSSRParams.z);
    let stride = uniform.uSSRParams.y * 0.14 / (pow(1.14, f32(steps)) - 1.0);
    let tol = uniform.uSSRParams.w;

    var prev = origin;
    var t = stride * (0.5 + dither);
    var grow = 1.0;
    for (var i = 0; i < 40; i++) {
        if (i >= steps || t > uniform.uSSRParams.y) { break; }
        let p = origin + dir * t;
        let clip = uniform.matrix_viewProjection * vec4f(p, 1.0);
        if (clip.w <= 0.0) { break; }
        var uv = getGrabScreenPos(clip);
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { break; }

        let sceneD = getLinearScreenDepth(uv);
        let rayD = getLinearDepth(p);
        let delta = rayD - sceneD;
        if (delta > 0.0 && delta < tol + stride * grow) {
            var a = prev;
            var b = p;
            for (var j = 0; j < 5; j++) {
                let m = (a + b) * 0.5;
                let mc = uniform.matrix_viewProjection * vec4f(m, 1.0);
                let muv = getGrabScreenPos(mc);
                if (getLinearDepth(m) - getLinearScreenDepth(muv) > 0.0) { b = m; } else { a = m; }
            }
            let hc = uniform.matrix_viewProjection * vec4f(b, 1.0);
            uv = getGrabScreenPos(hc);
            let edge = smoothstep(vec2f(0.0), vec2f(0.12), uv) * smoothstep(vec2f(0.0), vec2f(0.12), vec2f(1.0) - uv);
            res.mask = edge.x * edge.y * (1.0 - smoothstep(0.6, 1.0, t / uniform.uSSRParams.y));
            res.color = textureSampleLevel(uSceneColorMap, uSceneColorMapSampler, uv, min(roughness * 8.0, 4.0)).rgb;
            #ifdef SCENE_COLORMAP_GAMMA
                res.color = decodeGamma3(res.color);
            #endif
            return res;
        }
        prev = p;
        grow *= 1.14;
        t += stride * grow;
    }
    return res;
}

@fragment fn fragmentMain(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;
    let worldPos = input.vWorldPos;
    let camToPos = worldPos - uniform.view_position;
    let dist = max(length(camToPos), 1e-4);
    let V = -camToPos / dist;
    let underwater = uniform.view_position.y < uniform.uSeaLevel;

    // Slopes follow the cascade LOD. The folding (Jacobian) does not: whitecaps are a property of
    // the sea state, so every cascade counts at every distance — the maps are mipmapped, so a far
    // sample is the local average — or the whitecap coverage would change with the camera.
    var dsum = vec4f(0.0);
    var wsum = 0.0;
    var jac = 1.0;
    var w: f32;
    var cuv: vec2f;
    w = cascadeWeight(0, dist); cuv = input.vSampleXZ * uniform.uCascade[0].w;
    dsum += textureSample(uDeriv0, uDeriv0Sampler, cuv) * w; jac += (textureSample(uDisp0, uDisp0Sampler, cuv).w - 1.0) * uniform.uFoamCascadeWeights.x; wsum += w;
    if (uniform.uNumCascades > 1) { w = cascadeWeight(1, dist); cuv = input.vSampleXZ * uniform.uCascade[1].w;
        dsum += textureSample(uDeriv1, uDeriv1Sampler, cuv) * w; jac += (textureSample(uDisp1, uDisp1Sampler, cuv).w - 1.0) * uniform.uFoamCascadeWeights.y; wsum += w; }
    if (uniform.uNumCascades > 2) { w = cascadeWeight(2, dist); cuv = input.vSampleXZ * uniform.uCascade[2].w;
        dsum += textureSample(uDeriv2, uDeriv2Sampler, cuv) * w; jac += (textureSample(uDisp2, uDisp2Sampler, cuv).w - 1.0) * uniform.uFoamCascadeWeights.z; wsum += w; }
    if (uniform.uNumCascades > 3) { w = cascadeWeight(3, dist); cuv = input.vSampleXZ * uniform.uCascade[3].w;
        dsum += textureSample(uDeriv3, uDeriv3Sampler, cuv) * w; jac += (textureSample(uDisp3, uDisp3Sampler, cuv).w - 1.0) * uniform.uFoamCascadeWeights.w; wsum += w; }
    dsum *= uniform.uDisplacementScale;
    let detail = wsum / f32(uniform.uNumCascades);
    let slope = dsum.xy / max(vec2f(1.0) + uniform.uLambda * dsum.zw, vec2f(0.1));
    let Nup = normalize(vec3f(-slope.x, 1.0, -slope.y));
    var N = select(Nup, -Nup, underwater);
    let NdotVraw = dot(N, V);
    if (NdotVraw < 0.02) { N = normalize(N + V * (0.02 - NdotVraw)); }
    let NdotV = max(dot(N, V), 1e-4);

    var roughness = clamp(uniform.uSurfaceParams.x + uniform.uSurfaceParams.y * (1.0 - detail), 0.02, 1.0);
    let dndx = dpdx(N); let dndy = dpdy(N);
    let nVar = 0.25 * (dot(dndx, dndx) + dot(dndy, dndy));
    roughness = sqrt(clamp(roughness * roughness + min(2.0 * nVar, 0.2), 0.0, 1.0));

    // plain Schlick — see the GLSL twin on why the roughness-capped variant darkens the horizon
    let fresnel = F0 + (1.0 - F0) * pow(1.0 - NdotV, 5.0);

    let screenUv = getGrabScreenPos(input.vClipPos);
    let surfaceDepth = getLinearDepth(worldPos);
    let sceneDepth = getLinearScreenDepth(screenUv);
    var thickness = max(sceneDepth - surfaceDepth, 0.0);
    let opaquePos = uniform.view_position + camToPos * (sceneDepth / max(surfaceDepth, 1e-4));
    let receiverCross = cross(dpdx(opaquePos), dpdy(opaquePos));
    let receiverNormal = receiverCross * inverseSqrt(max(dot(receiverCross, receiverCross), 1e-8));
    let contactDistance = abs(dot(opaquePos - worldPos, receiverNormal));
    let contactNearby = 1.0 - smoothstep(2.0, 4.0, length(opaquePos - worldPos));

    let camFwd = -vec3f(uniform.matrix_view[0].z, uniform.matrix_view[1].z, uniform.matrix_view[2].z);
    let refrDir = refract(-V, N, select(IOR_AIR_WATER, IOR_WATER_AIR, underwater));
    let offsetPoint = worldPos + refrDir * min(thickness, uniform.uRefractionParams.z);
    var offset = (getGrabScreenPos(uniform.matrix_viewProjection * vec4f(offsetPoint, 1.0)) - screenUv) * uniform.uRefractionParams.x;
    offset = clamp(offset, vec2f(-0.05), vec2f(0.05));
    var refrUv = clamp(screenUv + offset, vec2f(0.001), vec2f(0.999));
    var refrDepth = getLinearScreenDepth(refrUv);
    if (refrDepth < surfaceDepth) { refrUv = screenUv; refrDepth = sceneDepth; }
    thickness = max(refrDepth - surfaceDepth, 0.0);
    let opticalDistance = thickness / max(dot(refrDir, camFwd), 0.15);
    let lod = min(opticalDistance * uniform.uRefractionParams.y, 4.0);
    var sceneColor = textureSampleLevel(uSceneColorMap, uSceneColorMapSampler, refrUv, lod).rgb;
    #ifdef SCENE_COLORMAP_GAMMA
        sceneColor = decodeGamma3(sceneColor);
    #endif

    let ambientUp = sampleAmbient(vec3f(0.0, 1.0, 0.0));
    let sunE = uniform.uSunColor;
    let sunUp = clamp(uniform.uSunDir.y, 0.0, 1.0);

    let causticPixelMetres = max(length(dpdx(opaquePos.xz)), length(dpdy(opaquePos.xz)));
    if (uniform.uCausticsParams.x > 0.0 && uniform.uDisplacementScale > 0.0 && thickness > 0.0 && !underwater && sunUp > 0.0) {
        let hit = worldPos + refrDir * opticalDistance;
        let depthBelow = max(uniform.uSeaLevel - hit.y, 0.0);
        let sunRay = waterCausticSunRay(uniform.uSunDir);
        let lightPath = depthBelow / max(-sunRay.y, 0.1);
        let entry = hit.xz - sunRay.xz * lightPath;
        let focus = waterCausticFocus(entry, depthBelow, uniform.uCausticsParams.y,
            uniform.uSunDir, causticPixelMetres);
        let facing = max(dot(receiverNormal, -sunRay), 0.0);
        let direct = dot(sunE, vec3f(0.2126, 0.7152, 0.0722)) * facing;
        let diffuseSky = dot(ambientUp, vec3f(0.2126, 0.7152, 0.0722)) * 3.14159265;
        let directFraction = direct / max(direct + diffuseSky, 1e-5);
        let fade = exp(-depthBelow * uniform.uCausticsParams.z) * smoothstep(0.02, 0.35, sunUp) * detail;
        let amount = uniform.uCausticsParams.x * min(uniform.uDisplacementScale, 1.0) * fade * directFraction;
        sceneColor *= max(vec3f(0.0), vec3f(1.0) + (focus - 1.0) * amount * exp(-uniform.uExtinction * lightPath));
    }

    let waveHeight = max(worldPos.y - uniform.uSeaLevel, 0.0);
    let Ls = normalize(-uniform.uSunDir + Nup * uniform.uSSSParams.w);
    let sssView = pow(clamp(dot(V, Ls), 0.0, 1.0), uniform.uSSSParams.y);
    let sssHeight = clamp(waveHeight * uniform.uSSSParams.z, 0.0, 1.0);
    let sss = uniform.uSSSColor * (sunE * sssView * sssHeight * uniform.uSSSParams.x * sunUp + ambientUp * sssHeight * uniform.uSSSParams.x * 0.25);

    let scatterRadiance = uniform.uScatterColor * uniform.uScatterStrength * (ambientUp + sunE * sunUp * 0.3183) + sss;
    let T = exp(-uniform.uExtinction * opticalDistance);
    let refracted = sceneColor * T + scatterRadiance * (1.0 - T);

    let windowRay = refract(-V, N, IOR_WATER_AIR);
    let sunWindowCos = dot(windowRay / max(length(windowRay), 1e-5), uniform.uSunDir);
    let sunWindowEdge = max(fwidth(sunWindowCos), 1e-6);
    var color: vec3f;
    if (underwater) {
        let up = refract(-V, N, IOR_WATER_AIR);
        let tir = select(0.0, 1.0, dot(up, up) < 1e-5);
        var skyThroughSurface = vec3f(0.0);
        if (tir < 0.5) {
            skyThroughSurface = sampleEnv(up, roughness) * uniform.uSurfaceParams.z;
            let sunCos = sunWindowCos;
            let radius = max(uniform.uSunRadius, 1e-4);
            let edge = sunWindowEdge;
            let disc = smoothstep(cos(radius) - edge, cos(radius) + edge, sunCos);
            skyThroughSurface += sunE * disc / max(3.14159265 * radius * radius, 1e-6);
        }
        let mirrored = scatterRadiance;
        let cosT = sqrt(max(1.0 - IOR_WATER_AIR * IOR_WATER_AIR * (1.0 - NdotV * NdotV), 0.0));
        let rs = (IOR_WATER_AIR * NdotV - cosT) / max(IOR_WATER_AIR * NdotV + cosT, 1e-5);
        let rp = (NdotV - IOR_WATER_AIR * cosT) / max(NdotV + IOR_WATER_AIR * cosT, 1e-5);
        let fUp = mix(0.5 * (rs * rs + rp * rp), 1.0, tir);
        color = mix(skyThroughSurface, mirrored, fUp);
    } else {
        var R = reflect(-V, N);
        var envRefl = sampleEnv(R, roughness) * uniform.uSurfaceParams.z;
        if (uniform.uSSRParams.x > 0.0 && roughness < 0.3 && R.y < 0.4) {
            let dither = fract(sin(dot(pcPosition.xy, vec2f(12.9898, 78.233))) * 43758.5453 + uniform.uTime);
            let ssr = traceSSR(worldPos, R, roughness, dither);
            let m = ssr.mask * uniform.uSSRParams.x * (1.0 - smoothstep(0.15, 0.35, roughness));
            envRefl = mix(envRefl, ssr.color, clamp(m, 0.0, 1.0));
        }
        let spec = ggxSpecular(N, V, uniform.uSunDir, roughness) * uniform.uSurfaceParams.w;
        let H = (V + uniform.uSunDir) / max(length(V + uniform.uSunDir), 1e-5);
        let FH = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
        let sunSpec = sunE * spec * FH;
        color = refracted * (1.0 - fresnel) + envRefl * fresnel + sunSpec;
    }

    // see the GLSL twin
    let foamMask = clamp((uniform.uFoamParams.x - jac) * uniform.uFoamParams.y, 0.0, 1.0);
    let foamUv = input.vSampleXZ * uniform.uFoamParams.z;
    let fa = textureSample(uFoamTex, uFoamTexSampler, foamUv + vec2f(uniform.uTime * 0.011, uniform.uTime * 0.006));
    let fb = textureSample(uFoamTex, uFoamTexSampler, foamUv * 2.83 - vec2f(uniform.uTime * 0.019, uniform.uTime * -0.013));
    let clumps = fa.r * 0.62 + fb.r * 0.38;
    let bubbles = fa.g * 0.5 + fb.g * 0.5;
    let lace = clamp(clumps * mix(0.72, 1.28, fa.b) + bubbles * 0.22, 0.0, 1.0);

    var whitecap = foamMask * smoothstep(1.0 - foamMask * 1.15, max(1.0 - foamMask * 0.22, 1.001 - foamMask * 1.15), lace);
    whitecap *= mix(0.72, 1.0, bubbles);
    whitecap *= 1.0 - 0.75 * smoothstep(700.0, 2600.0, dist);   // see the GLSL twin

    let shore = (1.0 - smoothstep(0.02, 0.55, contactDistance)) * contactNearby;
    let shoreBands = 0.5 + 0.5 * sin(contactDistance * 9.0 - uniform.uTime * 1.3 + fa.b * 5.0);
    let shoreFoam = shore * shore * clamp((lace * 0.9 + shoreBands * 0.5 + shore * 0.6 - 0.78) * 3.2, 0.0, 1.0);

    // ---- surf; see the GLSL twin ----
    var surfFoam = 0.0;
    if (uniform.uShoreParams2.w > 0.5) {
        let sdepth = input.vShore.x;
        let sh = textureSampleLevel(uShoreMap, uShoreMapSampler, clamp((input.vSampleXZ - uniform.uShoreArea.xy) * uniform.uShoreArea.zw, vec2f(0.0), vec2f(1.0)), 0.0);
        let offshore = sh.yz * 2.0 - 1.0;

        var phase = sdepth / max(uniform.uShoreParams.y, 0.05) + uniform.uTime * uniform.uShoreParams.z;
        phase += (fa.b - 0.5) * 0.35 + dot(input.vSampleXZ, offshore) * 0.004;
        let band = 0.5 - 0.5 * cos(phase * 6.28318530718);

        let breaking = 1.0 - smoothstep(uniform.uShoreParams.w * 0.3, uniform.uShoreParams.w * 1.4, sdepth);
        let crest = pow(band, 3.0);
        let surf = crest * breaking;
        // swash: a lace a metre or two wide that runs up the sand and drains back, not a sheet
        let swashPulse = 0.4 + 0.6 * (0.5 + 0.5 * sin(uniform.uTime * 0.9 + fa.b * 6.0 + sdepth * 4.0));
        let swash = uniform.uShoreParams2.y * (1.0 - smoothstep(0.0, uniform.uShoreParams.w * 0.2, sdepth)) * swashPulse;

        surfFoam = clamp((surf + swash) * lace * 1.15 * uniform.uShoreParams2.x, 0.0, 1.0) * input.vShore.y;
    }

    var foam = clamp((whitecap + shoreFoam + surfFoam) * uniform.uFoamStrength, 0.0, 1.0);
    if (underwater) { foam *= 0.25; }

    let aerate = clamp((fa.a * 0.7 + fb.a * 0.3) * foamMask * uniform.uFoamStrength - 0.25, 0.0, 1.0) * 0.22;
    let NdotL = max(dot(Nup, uniform.uSunDir), 0.0);
    var foamLit = uniform.uFoamColor * (ambientUp + sunE * (NdotL * 0.85 + 0.15) * 0.3183);
    if (!underwater) { foamLit = mix(foamLit, sampleEnv(reflect(-V, Nup), 0.35), fresnel * 0.55); }
    color = mix(color, foamLit * 0.55, aerate * (1.0 - foam));
    color = mix(color, foamLit, foam);

    if (!underwater) {
        let apDir = normalize(vec3f(camToPos.x, max(camToPos.y, 0.0), camToPos.z));
        let horizonSky = sampleAerial(apDir);
        let coverage = 1.0 - smoothstep(uniform.uWaterRadius * 0.72, uniform.uWaterRadius * 0.98, dist);
        color = mix(horizonSky, color, exp(-uniform.uFogDensity * dist) * coverage);
    } else {
        color = mix(scatterRadiance, color, exp(-uniform.uExtinction * dist));
    }
    // The surface dissolves where the water runs out of depth, so the shoreline is a wet gradient
    // rather than a cut; the foam lying in the swash stays.
    var alpha = 1.0;
    if (!underwater) { alpha = clamp(smoothstep(0.0, 0.08, mix(1.0, contactDistance, contactNearby)) + foam * 0.7, 0.0, 1.0); }
    output.color = vec4f(gammaCorrectOutput(toneMap(clamp(color, vec3f(0.0), vec3f(60000.0)))), alpha);
    return output;
}
`;

/**
 * The supported water configuration. Partial objects are accepted by the constructor, set() and
 * reset(). Colours are linear RGB; distances are metres; headings are degrees.
 *
 * @typedef {object} WaterConfig
 * @property {number} seaLevel - World Y of the undisturbed surface.
 * @property {'low'|'medium'|'high'} quality - A matched FFT, tessellation and reflection budget.
 * @property {{speed:number, direction:number}} wind - Wind sea, with speed in metres per second.
 * @property {{strength:number, direction:number}} swell - Independent long-period wave energy.
 * @property {{amplitude:number, choppiness:number}} waves - Displacement and crest-shape multipliers.
 * @property {number} roughness - Microfacet roughness, from 0 to 1.
 * @property {{color:number[], visibility:number}} volume - Scattered colour and approximate green
 * channel 1/e attenuation distance. Extinction is [3.2, 1, 0.6] / visibility in inverse metres.
 * @property {number} foam - Foam coverage multiplier. Zero removes foam.
 * @property {{enabled:boolean, strength:number, scale:number}} caustics - Focused light, with scale
 * setting the inverse filtering footprint in metres; the pattern follows the FFT waves. Opt-in.
 * @property {number} seed - Reproducible unsigned 32-bit wave seed.
 * @property {number} timeScale - Simulation speed. Zero pauses water animation.
 */
const WATER_DEFAULTS = freezeConfig({
    seaLevel: 0,
    quality: 'medium',
    wind: { speed: 9, direction: 35 },
    swell: { strength: 0.6, direction: -20 },
    waves: { amplitude: 1, choppiness: 1.4 },
    roughness: 0.06,
    volume: { color: [0.003, 0.075, 0.11], visibility: 10 },
    foam: 1,
    caustics: { enabled: false, strength: 1, scale: 0.2 },
    seed: 1337,
    timeScale: 1
});

/** Internal configuration helpers. The package exposes defaults, not the merge machinery. */
function freezeConfig(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.values(value).forEach(freezeConfig);
        Object.freeze(value);
    }
    return value;
}

const isObject = value => value !== null && typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function mergeConfig(base, patch, path = '') {
    if (!isObject(patch)) throw new TypeError(`Water: ${path || 'configuration'} must be a plain object`);
    const result = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        const name = path ? `${path}.${key}` : key;
        if (!Object.hasOwn(base, key)) throw new TypeError(`Water: unknown configuration field "${name}"`);
        if (value === undefined) continue;
        if (isObject(base[key])) result[key] = mergeConfig(base[key], value, name);
        else if (Array.isArray(base[key])) {
            if (!Array.isArray(value)) throw new TypeError(`Water: ${name} must be an array`);
            result[key] = value.slice();
        } else {
            if (typeof value !== typeof base[key]) throw new TypeError(`Water: ${name} must be a ${typeof base[key]}`);
            result[key] = value;
        }
    }
    return result;
}

const RANGES$1 = {
    seaLevel: [-Infinity, Infinity],
    'wind.speed': [0, 40], 'wind.direction': [-Infinity, Infinity],
    'swell.strength': [0, 3], 'swell.direction': [-Infinity, Infinity],
    'waves.amplitude': [0, 3], 'waves.choppiness': [0, 2.5],
    roughness: [0, 1], 'volume.visibility': [0.1, 1000],
    foam: [0, 2], 'caustics.strength': [0, 4], 'caustics.scale': [0.01, 2],
    seed: [0, 0xffffffff], timeScale: [0, 10]
};

function validateNumbers(value, path = '') {
    for (const [key, item] of Object.entries(value)) {
        const name = path ? `${path}.${key}` : key;
        if (item && typeof item === 'object' && !Array.isArray(item)) {
            validateNumbers(item, name);
        } else if (typeof item === 'number') {
            const [min, max] = RANGES$1[name];
            if (!Number.isFinite(item) || item < min || item > max) {
                throw new RangeError(`Water: ${name} must be finite and in [${min}, ${max}]`);
            }
        }
    }
}

/** Validate an entire partial update before changing the live instance. */
function resolveWaterConfig(patch = {}, base = WATER_DEFAULTS) {
    const next = mergeConfig(base, patch);
    validateNumbers(next);
    if (!['low', 'medium', 'high'].includes(next.quality)) {
        throw new RangeError('Water: quality must be low, medium or high');
    }
    if (!Number.isInteger(next.seed)) throw new RangeError('Water: seed must be an unsigned 32-bit integer');
    const color = next.volume.color;
    if (color.length !== 3 || !Array.from(color).every(v => Number.isFinite(v) && v >= 0 && v <= 1)) {
        throw new TypeError('Water: volume.color must contain three linear RGB values in [0, 1]');
    }
    // Normalize equivalent headings so repeating a full turn does not regenerate the spectrum.
    for (const key of ['wind', 'swell']) {
        const direction = ((next[key].direction + 180) % 360 + 360) % 360 - 180;
        if (direction !== next[key].direction) next[key] = { ...next[key], direction };
    }
    return freezeConfig(next);
}

function configEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && configEqual(a[key], b[key]));
}

/** @typedef {import('./config.js').WaterConfig} WaterConfig */

// Implementation choices are deliberately not a second public configuration surface.
const QUALITY_TIERS = {
    low: { resolution: 128, sectors: 128, rings: 192, reflectionSteps: 12 },
    medium: { resolution: 256, sectors: 256, rings: 320, reflectionSteps: 18 },
    high: { resolution: 512, sectors: 384, rings: 420, reflectionSteps: 28 }
};
const CASCADE_LENGTHS = [1024, 256, 48, 8];
const CASCADE_FADE_START = 12;
const CASCADE_FADE_END = 30;
const SURFACE_RADIUS = 20000;
const SOLAR_ANGULAR_RADIUS = 0.00465;
const EARTH_GRAVITY = 9.81;
const DEEP_WATER_DEPTH = 500;
const FOAM_CASCADE_WEIGHTS = [1, 1, 0.4, 0.1];
const FOAM_COLOR = [0.92, 0.96, 1];
const CREST_SCATTER_COLOR = [0.06, 0.55, 0.45];
const CREST_SCATTER_PARAMS = [0.35, 6, 0.6, 0.35]; // strength, angular exponent, height, normal bias
const REFRACTION_PARAMS = [0.7, 0.12, 4, 0]; // offset, distance blur, offset depth limit
const FOAM_SURFACE_PARAMS = [0.68, 3, 0.07, 1]; // Jacobian threshold, edge, frequency, contact depth
const SHORE_RESPONSE = [1, 0.4, 0.6]; // surf, swash, shoaling
const CAUSTIC_DEPTH_FADE = 0.09;

/**
 * A configurable, physically-based water surface.
 *
 * A cascaded FFT wave simulation (WebGPU compute, with a WebGL2 fragment fallback) drives a
 * camera-following polar mesh. Everything about the look and the sea state lives in one config
 * object which can be patched at any time with {@link Water#set}.
 *
 * ```js
 * const water = new Water(app, { wind: { speed: 14 } });
 * app.on('update', dt => water.update(dt, camera));
 * water.set({ volume: { visibility: 20 } });
 * const y = water.getHeightAt(x, z);   // for buoyancy
 * ```
 */
class Water {
    /**
     * @param {import('playcanvas').AppBase} app - The application.
     * @param {Partial<WaterConfig>} [config] - Partial configuration; anything omitted uses the default.
     */
    constructor(app, config = {}) {
        this._app = app;
        this._device = app.graphicsDevice;

        this._config = resolveWaterConfig(config);
        this._time = 0;
        this._sunDirection = new Vec3(0, 1, 0);
        this._sunColor = new Color(1, 1, 1);
        this._hazeDensity = 0;
        this._destroyed = false;
        this._cascadeData = new Float32Array(16);
        this._envAtlas = null;
        this._skyRadiance = null;
        this._environmentExposure = 1;
        this._rebuildSim = false;
        this._rebuildMesh = false;

        this._simulation = new WaveSimulation(this._device, this._simParams());

        this._material = new ShaderMaterial({
            uniqueName: 'WaterSurface',
            attributes: { vertex_position: SEMANTIC_POSITION },
            vertexGLSL: WATER_VS,
            fragmentGLSL: WATER_FS,
            vertexWGSL: WATER_VS_WGSL,
            fragmentWGSL: WATER_FS_WGSL
        });
        // rendered in the transparent pass so the scene colour / depth grab includes everything below
        this._material.blendType = BLEND_NORMAL;
        this._material.depthWrite = true;
        this._material.cull = CULLFACE_NONE;
        this._material.setDefine('{ENV_DECODE}', 'decodeRGBP');

        this._foamTexture = createFoamTexture(this._device);
        this._material.setParameter('uFoamTex', this._foamTexture);

        this._deepWaterMap = createDeepWaterMap(this._device);
        /** @type {import('./shoreMap.js').ShoreMap|null} */
        this._shoreMap = null;
        this._material.setParameter('uShoreMap', this._deepWaterMap);
        this._material.setParameter('uShoreArea', [0, 0, 1, 1]);

        this._mesh = createWaterMesh(this._device, this._meshParams());
        this._builtMeshParams = this._meshParams();
        this._meshInstance = new MeshInstance(this._mesh, this._material);
        this._meshInstance.cull = false;
        this._meshInstance.castShadow = false;
        this._meshInstance.receiveShadow = false;

        this._entity = new Entity('Water');
        this._entity.addComponent('render', {
            meshInstances: [this._meshInstance], layers: [LAYERID_WORLD], castShadows: false
        });
        app.root.addChild(this._entity);

        this._probe = new WaveProbe(this);
    }

    /** Whether the wave simulation is running on WebGPU compute shaders. */
    get usesCompute() { return this._simulation.useCompute; }

    /** @type {WaterConfig} Immutable snapshot. Use set() or reset() to change it. */
    get config() { return this._config; }

    /** Elapsed simulation seconds, including timeScale and the simulation's delta clamp. */
    get time() { return this._time; }

    /** Copy of the light direction supplied to setEnvironment(). */
    get sunDirection() { return this._sunDirection.clone(); }

    /** Copy of the linear irradiance supplied to setEnvironment(). */
    get sunColor() { return this._sunColor.clone(); }

    /** Surface Y of the undisturbed water plane. */
    get seaLevel() { return this.config.seaLevel; }

    /**
     * Patch the configuration. Only the fields present in the patch change, and the minimum amount
     * of GPU work is redone. FFT layout and tessellation changes rebuild on the next update();
     * only changes to wind, swell or seed regenerate the initial spectrum.
     * Invalid patches throw before any state changes. Arrays are replaced in full.
     *
     * @param {Partial<WaterConfig>} patch - The fields to change.
     */
    set(patch) {
        this._assertAlive();
        return this._setConfig(resolveWaterConfig(patch, this.config));
    }

    /** Replace all settings with defaults plus config. Assigned environment and shore map remain. */
    reset(config = {}) {
        this._assertAlive();
        return this._setConfig(resolveWaterConfig(config));
    }

    _setConfig(next) {
        if (this._shoreMap && next.seaLevel !== this._shoreMap.seaLevel) {
            throw new RangeError('Water: detach the shore map before changing seaLevel, then bake and attach a map at the new level');
        }
        const before = this.config;
        if (configEqual(before, next)) return this;
        this._config = next;
        const params = this._simParams();
        const current = this._simulation.params;
        this._rebuildSim = ['size', 'lengthScales', 'cascadeOverlap'].some(key => !configEqual(current[key], params[key]));
        if (!this._rebuildSim) {
            const spectrumChanged = ['wind', 'swell', 'depth', 'gravity', 'seed'].some(key => !configEqual(current[key], params[key]));
            Object.assign(current, params);
            if (spectrumChanged) this._simulation.invalidateSpectrum();
        }
        this._rebuildMesh = !configEqual(this._builtMeshParams, this._meshParams());
        if (['seaLevel', 'waves', 'wind', 'swell', 'seed'].some(key => !configEqual(before[key], next[key]))) this._probe.rebuild();
        return this;
    }

    _assertAlive() {
        if (this._destroyed) throw new Error('Water: this instance has been destroyed');
    }

    /** Apply any deferred resource rebuild. Called at the top of {@link Water#update}. */
    _applyPendingRebuilds() {
        if (this._rebuildSim) {
            this._simulation.rebuild(this._simParams());
            this._probe.rebuild();
            this._rebuildSim = false;
        }
        if (this._rebuildMesh) {
            const old = this._mesh;
            this._mesh = createWaterMesh(this._device, this._meshParams());
            this._meshInstance.mesh = this._mesh;
            this._builtMeshParams = this._meshParams();
            this._rebuildMesh = false;
            old.destroy();
        }
    }

    /** Translate the public config into the flat parameter block the simulation expects. */
    _simParams() {
        const cfg = this.config;
        const q = QUALITY_TIERS[cfg.quality];
        const speed = cfg.wind.speed;
        return {
            size: q.resolution,
            lengthScales: CASCADE_LENGTHS.slice(),
            cascadeOverlap: 6,
            depth: DEEP_WATER_DEPTH,
            gravity: EARTH_GRAVITY,
            seed: cfg.seed,
            choppiness: cfg.waves.choppiness,
            foamDecay: 0.8,
            timeScale: cfg.timeScale,
            wind: {
                scale: speed === 0 ? 0 : 1, windSpeed: Math.max(speed, 0.1), windDirection: cfg.wind.direction,
                fetch: Math.max(10000, Math.min(1000000, 120000 * (speed / 9) ** 2)),
                spreadBlend: 0.9, swell: 0.25, peakEnhancement: 3.3, shortWavesFade: 0.0075
            },
            swell: {
                scale: cfg.swell.strength, windSpeed: 6, windDirection: cfg.swell.direction,
                fetch: 800000, spreadBlend: 1, swell: 1, peakEnhancement: 3.3, shortWavesFade: 0.05
            }
        };
    }

    _meshParams() {
        const q = QUALITY_TIERS[this.config.quality];
        return { sectors: q.sectors, rings: q.rings, outerRadius: SURFACE_RADIUS };
    }

    /**
     * Give the water a coast to break on.
     *
     * Pass a map baked by {@link import('./shoreMap.js').bakeShoreMap} and the shore model turns on:
     * the swell shoals and rears as the bed rises, breaks into shore-parallel bands of surf, and
     * leaves foam washing on the sand. Pass null to go back to open ocean. The map remains owned
     * by the caller: detach it before calling map.destroy(). It must be baked at this sea level.
     *
     * @param {import('./shoreMap.js').ShoreMap|null} map - The baked coast, or null.
     */
    setShoreMap(map) {
        this._assertAlive();
        if (map !== null) validateShoreMap(map, this.seaLevel);
        this._shoreMap = map;
        this._material.setParameter('uShoreMap', map ? map.texture : this._deepWaterMap);
        this._material.setParameter('uShoreArea', map
            ? [map.origin[0], map.origin[1], 1 / map.size[0], 1 / map.size[1]]
            : [0, 0, 1, 1]);
        return this;
    }

    /**
     * Assign the environment the surface reflects and the sun it is lit by.
     *
     * @param {object} environment - Caller-owned illumination resources, independent of any sky library.
     * @param {import('playcanvas').Texture} environment.atlas - Prefiltered PlayCanvas RGBP atlas.
     * @param {Vec3} environment.sunDirection - Direction towards the sun.
     * @param {Color} environment.sunColor - Linear solar irradiance, already including exposure.
     * @param {import('playcanvas').Texture} [environment.radiance] - Linear, sun-free equirectangular sky.
     * @param {number} [environment.exposure=1] - Scale for atlas and equirectangular radiance.
     * @param {number} [environment.hazeDensity=0] - Aerial extinction in inverse metres.
     */
    setEnvironment(environment) {
        this._assertAlive();
        if (!environment || typeof environment !== 'object' || Array.isArray(environment)) throw new TypeError('Water: environment must be an object');
        const allowed = ['atlas', 'radiance', 'sunDirection', 'sunColor', 'exposure', 'hazeDensity'];
        for (const key of Object.keys(environment)) if (!allowed.includes(key)) throw new TypeError(`Water: unknown environment field "${key}"`);
        const { atlas, radiance = null, sunDirection, sunColor, exposure = 1, hazeDensity = 0 } = environment;
        if (!atlas || typeof atlas !== 'object') throw new TypeError('Water: atlas must be a prefiltered texture');
        if (radiance !== null && typeof radiance !== 'object') throw new TypeError('Water: radiance must be a linear equirectangular texture');
        if (![exposure, hazeDensity].every(v => Number.isFinite(v) && v >= 0)) throw new RangeError('Water: exposure and hazeDensity must be finite and non-negative');
        if (!sunDirection || ![sunDirection.x, sunDirection.y, sunDirection.z].every(Number.isFinite) ||
            Math.hypot(sunDirection.x, sunDirection.y, sunDirection.z) === 0) {
            throw new TypeError('Water: sunDirection must be a finite non-zero vector');
        }
        if (!sunColor || ![sunColor.r, sunColor.g, sunColor.b].every(v => Number.isFinite(v) && v >= 0)) {
            throw new TypeError('Water: sunColor must contain finite non-negative linear RGB values');
        }
        this._envAtlas = atlas;
        this._skyRadiance = radiance;
        this._environmentExposure = exposure;
        this._hazeDensity = hazeDensity;
        this._material.setParameter('texture_envAtlas', atlas);
        this._material.setParameter('uSkyRadiance', radiance || atlas);
        this._material.setParameter('uHasSkyRadiance', radiance ? 1 : 0);
        this._material.setParameter('uEnvironmentExposure', exposure);
        this._sunDirection.copy(sunDirection).normalize();
        this._sunColor.copy(sunColor);
        return this;
    }

    /**
     * The surface height at a world XZ position, in metres. Backed by an asynchronous GPU readback,
     * updated at most once every three frames. New queries return seaLevel until the first readback.
     * Suitable for approximate buoyancy, not exact collision. Queries evaluate the FFT field and do
     * not include the visual shoreline deformation or distance filtering applied to the mesh.
     *
     * @param {number} x - World X.
     * @param {number} z - World Z.
     * @returns {number} World Y of the surface.
     */
    getHeightAt(x, z) {
        return this.getSurfaceAt(x, z).position.y;
    }

    /**
     * Full surface state at a world XZ position: the displaced point and its normal. Use this to
     * float and tilt an object convincingly. See {@link Water#getHeightAt} for the latency caveat.
     *
     * @param {number} x - World X.
     * @param {number} z - World Z.
     * @returns {{position: Vec3, normal: Vec3}} Borrowed query result updated in place; clone to retain.
     */
    getSurfaceAt(x, z) {
        this._assertAlive();
        if (!Number.isFinite(x) || !Number.isFinite(z)) throw new TypeError('Water: query coordinates must be finite numbers');
        return this._probe.sample(x, z);
    }

    /**
     * Whether a world position is below the water surface, accounting for the waves.
     *
     * @param {Vec3} position - World position to test.
     * @returns {boolean} True when submerged.
     */
    isSubmerged(position) {
        return position.y < this.getHeightAt(position.x, position.z);
    }

    /** Opt an opaque StandardMaterial into underwater attenuation and wave caustics.
     * Returns a detach function. Material and texture ownership remain with the caller.
     * Its fog chunk is reserved while attached; call detach before destroying the material.
     */
    addReceiver(material) {
        this._assertAlive();
        if (!(material instanceof StandardMaterial)) {
            throw new TypeError('Water.addReceiver requires a StandardMaterial');
        }
        this._receivers ??= new Map();
        if (this._receivers.has(material)) return this._receivers.get(material);
        const restore = attachReceiver(material);
        const detach = () => {
            if (!this._receivers.delete(material)) return;
            restore();
        };
        this._receivers.set(material, detach);
        return detach;
    }

    /**
     * Step the simulation and push uniforms. Call once per frame from the app's `update` event,
     * before rendering.
     *
     * @param {number} dt - Frame delta time in seconds.
     * @param {import('playcanvas').Entity} cameraEntity - Camera the surface follows and fades against.
     */
    update(dt, cameraEntity) {
        this._assertAlive();
        if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Water: dt must be a finite non-negative number of seconds');
        if (!cameraEntity || typeof cameraEntity.getPosition !== 'function') throw new TypeError('Water: update requires a camera entity');
        this._applyPendingRebuilds();
        const cfg = this.config;
        const sim = this._simulation;
        sim.update(dt);
        this._time = sim.time;
        this._probe.update();

        // the surface disc follows the camera in XZ; the wave field is sampled in world space so the
        // tessellation just slides underneath it
        const cp = cameraEntity.getPosition();
        this._entity.setPosition(cp.x, 0, cp.z);

        const m = this._material;
        const disp = sim.displacementTextures;
        const deriv = sim.derivativeTextures;
        const scales = sim.lengthScales;
        const n = disp.length;
        for (let i = 0; i < 4; i++) {
            const j = Math.min(i, n - 1);
            m.setParameter(`uDisp${i}`, disp[j]);
            m.setParameter(`uDeriv${i}`, deriv[j]);
            const L = scales[j];
            this._cascadeData[i * 4 + 0] = L;
            this._cascadeData[i * 4 + 1] = L * CASCADE_FADE_START;
            this._cascadeData[i * 4 + 2] = L * CASCADE_FADE_END;
            this._cascadeData[i * 4 + 3] = 1 / L;
        }
        m.setParameter('uCascade[0]', this._cascadeData);   // WebGL names the array uniform 'uCascade[0]'
        m.setParameter('uCascade', this._cascadeData);      // WebGPU reflects it as 'uCascade'
        m.setParameter('uNumCascades', n);
        // vertex spacing of the polar grid as a fraction of radius: the larger of the radial and
        // angular steps. The vertex shader turns it into a mip level per cascade.
        const mp = this._meshParams();
        const growth = Math.log(mp.outerRadius / 0.5) / (mp.rings - 1);
        m.setParameter('uMeshLod', [Math.max(growth, 2 * Math.PI / mp.sectors), 0.5, this._simulation.params.size, 0]);
        m.setParameter('uWaterRadius', mp.outerRadius);
        m.setParameter('uLambda', cfg.waves.choppiness);
        m.setParameter('uDisplacementScale', cfg.waves.amplitude);
        m.setParameter('uSeaLevel', cfg.seaLevel);
        m.setParameter('uTime', this.time);

        const sd = this._sunDirection, sc = this._sunColor;
        m.setParameter('uSunDir', [sd.x, sd.y, sd.z]);
        m.setParameter('uSunColor', [sc.r, sc.g, sc.b]);
        m.setParameter('uSunRadius', SOLAR_ANGULAR_RADIUS);

        const vol = cfg.volume;
        m.setParameter('uExtinction', [3.2 / vol.visibility, 1 / vol.visibility, 0.6 / vol.visibility]);
        m.setParameter('uScatterColor', vol.color);
        m.setParameter('uScatterStrength', 1);
        m.setParameter('uSSSColor', CREST_SCATTER_COLOR);
        m.setParameter('uSSSParams', CREST_SCATTER_PARAMS);

        m.setParameter('uSurfaceParams', [cfg.roughness, 0.15, 1, 1]);
        m.setParameter('uRefractionParams', REFRACTION_PARAMS);
        m.setParameter('uSSRParams', [0.9, 220, QUALITY_TIERS[cfg.quality].reflectionSteps, 1.5]);

        bindCausticWaves(m, sim, cfg);
        const c = cfg.caustics;
        for (const receiver of this._receivers?.keys() ?? []) {
            bindCausticWaves(receiver, sim, cfg);
            receiver.setParameter('uReceiverExtinction', [3.2, 1, 0.6].map(e => e / vol.visibility));
            receiver.setParameter('uReceiverScatter', vol.color);
            receiver.setParameter('uReceiverSun', [sd.x, sd.y, sd.z]);
            receiver.setParameter('uReceiverSunColor', [sc.r, sc.g, sc.b]);
            receiver.setParameter('uReceiverParams', [cfg.seaLevel, c.enabled ? c.strength : 0, c.scale, this._skyRadiance ? this._environmentExposure : 0]);
            receiver.setParameter('uReceiverSky', this._skyRadiance || this._deepWaterMap);
        }
        m.setParameter('uCausticsParams', [c.enabled ? c.strength : 0, c.scale, CAUSTIC_DEPTH_FADE]);

        const active = this._shoreMap ? 1 : 0;
        m.setParameter('uShoreParams', [this._shoreMap ? this._shoreMap.maxDepth : 1, 5, 0.16, 2.4]);
        m.setParameter('uShoreParams2', [...SHORE_RESPONSE, active]);

        m.setParameter('uFoamParams', FOAM_SURFACE_PARAMS);
        m.setParameter('uFoamColor', FOAM_COLOR);
        m.setParameter('uFoamStrength', cfg.foam);
        m.setParameter('uFoamCascadeWeights', FOAM_CASCADE_WEIGHTS);
        m.setParameter('uFogDensity', this._hazeDensity);
        m.setParameter('uSkyRadiance', this._skyRadiance || this._envAtlas || this._deepWaterMap);
        m.setParameter('uHasSkyRadiance', this._skyRadiance ? 1 : 0);
        m.setParameter('uEnvironmentExposure', this._environmentExposure);
    }

    /** Release owned resources. Safe to call twice. Supplied environment and shore maps survive. */
    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        for (const detach of [...(this._receivers?.values() ?? [])]) detach();
        this._probe.destroy();
        // RenderComponent destroys its mesh instances. Detach the mesh so its ownership stays here.
        this._meshInstance.mesh = null;
        this._entity.destroy();
        this._foamTexture.destroy();
        this._deepWaterMap.destroy();
        this._simulation.destroy();
        this._mesh.destroy();
        this._material.destroy();
        this._shoreMap = null;
        this._envAtlas = null;
        this._skyRadiance = null;
    }
}

// Physically based atmosphere after Hillaire 2020, "A Scalable and Production Ready Sky and
// Atmosphere Rendering Technique" — the model behind Unreal's SkyAtmosphere.
//
// Three passes, all run only when the sun or the atmosphere parameters change:
//
//   1. transmittance LUT   (256 x 64)   T(r, mu): light surviving from a point to the top of the
//                                        atmosphere. Rayleigh + Mie + ozone.
//   2. multi-scatter LUT   (64 x 32)    Psi_ms(r, mu_s): light arriving at a point after two or more
//                                        bounces, as an isotropic source term. This is what keeps a
//                                        twilight sky blue instead of black and the horizon bright
//                                        instead of dipping — single scattering alone cannot.
//   3. sky march                         the equirect the engine turns into skybox and light probe.
//
// Distances are in kilometres. Coefficients are Hillaire's Earth values at sea level; the
// `uRayleigh` / `uMie` / `uOzone` uniforms scale them.

const GLSL_COMMON = /* glsl */`
const float PI = 3.14159265358979;
const float RG = 6360.0;                                   // planet radius, km
const float RT = 6460.0;                                   // top of the atmosphere, km
const vec3  RAYLEIGH_S = vec3(5.802e-3, 13.558e-3, 33.1e-3);
const float MIE_S = 3.996e-3;
const float MIE_A = 0.444e-3; // extinction (4.440e-3) minus scattering
const vec3  OZONE_A = vec3(0.650e-3, 1.881e-3, 0.085e-3);
const float CAMERA_R = RG + 0.01;                          // ten metres up

uniform float uRayleigh;
uniform float uMie;
uniform float uOzone;
uniform float uGroundAlbedo;

void medium(float h, out vec3 sR, out float sM, out vec3 sT) {
    float dR = exp(-h / 8.0);
    float dM = exp(-h / 1.2);
    float dO = max(0.0, 1.0 - abs(h - 25.0) / 15.0);
    float mie = uMie;
    sR = RAYLEIGH_S * uRayleigh * dR;
    sM = MIE_S * mie * dM;
    sT = sR + vec3(sM + MIE_A * mie * dM) + OZONE_A * uOzone * dO;
}

// nearest positive hit with a sphere of radius R about the origin, or -1
float raySphere(vec3 o, vec3 d, float R) {
    float b = dot(o, d);
    float c = dot(o, o) - R * R;
    float disc = b * b - c;
    if (disc < 0.0) return -1.0;
    float s = sqrt(disc);
    float t0 = -b - s;
    float t1 = -b + s;
    if (t0 > 0.0) return t0;
    if (t1 > 0.0) return t1;
    return -1.0;
}

// Bruneton's (r, mu) <-> uv mapping, which spends the LUT's precision along the horizon
vec2 transmittanceUv(float r, float mu) {
    float H = sqrt(max(RT * RT - RG * RG, 0.0));
    float rho = sqrt(max(r * r - RG * RG, 0.0));
    float disc = r * r * (mu * mu - 1.0) + RT * RT;
    float d = max(0.0, -r * mu + sqrt(max(disc, 0.0)));
    float dMin = RT - r;
    float dMax = rho + H;
    vec2 uv = clamp(vec2((d - dMin) / (dMax - dMin), rho / H), 0.0, 1.0);
    return (uv * vec2(255.0, 63.0) + 0.5) / vec2(256.0, 64.0);
}
void uvToRMu(vec2 uv, out float r, out float mu) {
    uv = clamp((uv * vec2(256.0, 64.0) - 0.5) / vec2(255.0, 63.0), 0.0, 1.0);
    float H = sqrt(RT * RT - RG * RG);
    float rho = H * uv.y;
    r = sqrt(rho * rho + RG * RG);
    float dMin = RT - r;
    float dMax = rho + H;
    float d = dMin + uv.x * (dMax - dMin);
    mu = d == 0.0 ? 1.0 : (H * H - rho * rho - d * d) / (2.0 * r * d);
    mu = clamp(mu, -1.0, 1.0);
}
`;

const WGSL_COMMON = /* wgsl */`
const PI: f32 = 3.14159265358979;
const RG: f32 = 6360.0;
const RT: f32 = 6460.0;
const RAYLEIGH_S: vec3f = vec3f(5.802e-3, 13.558e-3, 33.1e-3);
const MIE_S: f32 = 3.996e-3;
const MIE_A: f32 = 0.444e-3;
const OZONE_A: vec3f = vec3f(0.650e-3, 1.881e-3, 0.085e-3);
const CAMERA_R: f32 = RG + 0.01;

uniform uRayleigh: f32;
uniform uMie: f32;
uniform uOzone: f32;
uniform uGroundAlbedo: f32;

struct Medium { sR: vec3f, sM: f32, sT: vec3f }
fn medium(h: f32) -> Medium {
    let dR = exp(-h / 8.0);
    let dM = exp(-h / 1.2);
    let dO = max(0.0, 1.0 - abs(h - 25.0) / 15.0);
    let mie = uniform.uMie;
    var m: Medium;
    m.sR = RAYLEIGH_S * uniform.uRayleigh * dR;
    m.sM = MIE_S * mie * dM;
    m.sT = m.sR + vec3f(m.sM + MIE_A * mie * dM) + OZONE_A * uniform.uOzone * dO;
    return m;
}

fn raySphere(o: vec3f, d: vec3f, R: f32) -> f32 {
    let b = dot(o, d);
    let c = dot(o, o) - R * R;
    let disc = b * b - c;
    if (disc < 0.0) { return -1.0; }
    let s = sqrt(disc);
    let t0 = -b - s;
    let t1 = -b + s;
    if (t0 > 0.0) { return t0; }
    if (t1 > 0.0) { return t1; }
    return -1.0;
}

fn transmittanceUv(r: f32, mu: f32) -> vec2f {
    let H = sqrt(max(RT * RT - RG * RG, 0.0));
    let rho = sqrt(max(r * r - RG * RG, 0.0));
    let disc = r * r * (mu * mu - 1.0) + RT * RT;
    let d = max(0.0, -r * mu + sqrt(max(disc, 0.0)));
    let dMin = RT - r;
    let dMax = rho + H;
    let uv = clamp(vec2f((d - dMin) / (dMax - dMin), rho / H), vec2f(0.0), vec2f(1.0));
    return (uv * vec2f(255.0, 63.0) + 0.5) / vec2f(256.0, 64.0);
}
struct RMu { r: f32, mu: f32 }
fn uvToRMu(texUv: vec2f) -> RMu {
    let uv = clamp((texUv * vec2f(256.0, 64.0) - 0.5) / vec2f(255.0, 63.0), vec2f(0.0), vec2f(1.0));
    let H = sqrt(RT * RT - RG * RG);
    let rho = H * uv.y;
    let r = sqrt(rho * rho + RG * RG);
    let dMin = RT - r;
    let dMax = rho + H;
    let d = dMin + uv.x * (dMax - dMin);
    var mu = select((H * H - rho * rho - d * d) / (2.0 * r * d), 1.0, d == 0.0);
    mu = clamp(mu, -1.0, 1.0);
    return RMu(r, mu);
}
`;

const ATMOS_VS = /* glsl */`
attribute vec2 aPosition;
varying vec2 uv0;
void main(void) {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    uv0 = getImageEffectUV((aPosition + 1.0) * 0.5);
}
`;
const ATMOS_VS_WGSL = /* wgsl */`
attribute aPosition: vec2f;
varying uv0: vec2f;
@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4f(input.aPosition, 0.0, 1.0);
    output.uv0 = getImageEffectUV((input.aPosition + 1.0) * 0.5);
    return output;
}
`;

// ---------------------------------------------------------------- 1. transmittance
const TRANSMITTANCE_FS = /* glsl */`
${GLSL_COMMON}
varying vec2 uv0;
void main(void) {
    float r, mu;
    uvToRMu(uv0, r, mu);
    vec3 o = vec3(0.0, r, 0.0);
    vec3 d = vec3(sqrt(max(1.0 - mu * mu, 0.0)), mu, 0.0);
    float tMax = max(raySphere(o, d, RT), 0.0);
    const int N = 64;
    float tPrev = 0.0;
    vec3 tau = vec3(0.0);
    for (int i = 0; i < N; i++) {
        float f = (float(i) + 1.0) / float(N);
        float t = tMax * f * f;
        float dt = t - tPrev;
        vec3 p = o + d * ((t + tPrev) * 0.5);
        tPrev = t;
        vec3 sR, sT; float sM;
        medium(length(p) - RG, sR, sM, sT);
        tau += sT * dt;
    }
    gl_FragColor = vec4(exp(-tau), 1.0);
}
`;
const TRANSMITTANCE_FS_WGSL = /* wgsl */`
${WGSL_COMMON}
varying uv0: vec2f;
@fragment fn fragmentMain(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;
    let rm = uvToRMu(input.uv0);
    let o = vec3f(0.0, rm.r, 0.0);
    let d = vec3f(sqrt(max(1.0 - rm.mu * rm.mu, 0.0)), rm.mu, 0.0);
    let tMax = max(raySphere(o, d, RT), 0.0);
    let N = 64;
    var tPrev = 0.0;
    var tau = vec3f(0.0);
    for (var i = 0; i < N; i++) {
        let f = (f32(i) + 1.0) / f32(N);
        let t = tMax * f * f;
        let dt = t - tPrev;
        let p = o + d * ((t + tPrev) * 0.5);
        tPrev = t;
        let m = medium(length(p) - RG);
        tau += m.sT * dt;
    }
    output.color = vec4f(exp(-tau), 1.0);
    return output;
}
`;

// ---------------------------------------------------------------- 2. multiple scattering
// For every (sun angle, altitude): send rays over the whole sphere, integrate the light each one
// scatters back after one bounce (L2) and the fraction it would scatter again (f_ms), then sum the
// geometric series Psi = L2 / (1 - f_ms). The outer isotropic phase cancels the
// sphere integral's solid angle. The first bounce still needs its own 1/(4*pi) phase.
// Reference: sebh/UnrealEngineSkyAtmosphere, RenderSkyRayMarching.hlsl.
const MULTISCATTER_FS = /* glsl */`
${GLSL_COMMON}
uniform sampler2D uTransmittance;
varying vec2 uv0;
vec3 T_lut(float r, float mu) { return texture(uTransmittance, transmittanceUv(r, mu)).rgb; }
void main(void) {
    vec2 uv = clamp((uv0 * vec2(64.0, 32.0) - 0.5) / vec2(63.0, 31.0), 0.0, 1.0);
    // Concentrate samples on twilight sun angles and dense air near the ground.
    float signedAngle = uv.x * 2.0 - 1.0;
    float mus = sign(signedAngle) * signedAngle * signedAngle;
    float r = clamp(RG + uv.y * uv.y * (RT - RG), RG + 0.001, RT - 0.001);
    vec3 sunDir = vec3(sqrt(max(1.0 - mus * mus, 0.0)), mus, 0.0);
    vec3 o = vec3(0.0, r, 0.0);
    vec3 L2 = vec3(0.0), fms = vec3(0.0);
    const int NS = 8;
    const int N = 20;
    for (int i = 0; i < NS; i++) {
        for (int j = 0; j < NS; j++) {
            float ct = 1.0 - 2.0 * (float(i) + 0.5) / float(NS);
            float st = sqrt(max(1.0 - ct * ct, 0.0));
            float ph = 2.0 * PI * (float(j) + 0.5) / float(NS);
            vec3 w = vec3(st * cos(ph), ct, st * sin(ph));
            float tTop = raySphere(o, w, RT);
            float tG = raySphere(o, w, RG);
            float tMax = tG > 0.0 ? tG : tTop;
            float dt = tMax / float(N);
            vec3 T = vec3(1.0);
            for (int k = 0; k < N; k++) {
                vec3 p = o + w * ((float(k) + 0.5) * dt);
                float rp = length(p);
                vec3 sR, sT; float sM;
                medium(rp - RG, sR, sM, sT);
                vec3 sS = sR + vec3(sM);
                vec3 up = p / rp;
                float mup = dot(up, sunDir);
                float shadow = raySphere(p, sunDir, RG) > 0.0 ? 0.0 : 1.0;
                vec3 Tsun = T_lut(rp, mup) * shadow;
                vec3 Tstep = exp(-sT * dt);
                vec3 S = sS * Tsun / (4.0 * PI);
                L2 += T * (S - S * Tstep) / max(sT, vec3(1e-6));
                fms += T * (sS - sS * Tstep) / max(sT, vec3(1e-6));
                T *= Tstep;
            }
            if (tG > 0.0) {
                vec3 ng = normalize(o + w * tG);
                float ndl = max(dot(ng, sunDir), 0.0);
                L2 += T * (uGroundAlbedo / PI) * ndl * T_lut(RG, ndl);
            }
        }
    }
    L2 /= float(NS * NS);
    fms /= float(NS * NS);
    gl_FragColor = vec4(L2 / max(vec3(1.0) - fms, vec3(1e-4)), 1.0);
}
`;
const MULTISCATTER_FS_WGSL = /* wgsl */`
${WGSL_COMMON}
var uTransmittance: texture_2d<f32>;
var uTransmittanceSampler: sampler;
varying uv0: vec2f;
fn T_lut(r: f32, mu: f32) -> vec3f { return textureSampleLevel(uTransmittance, uTransmittanceSampler, transmittanceUv(r, mu), 0.0).rgb; }
@fragment fn fragmentMain(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;
    let uv = clamp((input.uv0 * vec2f(64.0, 32.0) - 0.5) / vec2f(63.0, 31.0), vec2f(0.0), vec2f(1.0));
    let signedAngle = uv.x * 2.0 - 1.0;
    let mus = sign(signedAngle) * signedAngle * signedAngle;
    let r = clamp(RG + uv.y * uv.y * (RT - RG), RG + 0.001, RT - 0.001);
    let sunDir = vec3f(sqrt(max(1.0 - mus * mus, 0.0)), mus, 0.0);
    let o = vec3f(0.0, r, 0.0);
    var L2 = vec3f(0.0);
    var fms = vec3f(0.0);
    let NS = 8;
    let N = 20;
    for (var i = 0; i < NS; i++) {
        for (var j = 0; j < NS; j++) {
            let ct = 1.0 - 2.0 * (f32(i) + 0.5) / f32(NS);
            let st = sqrt(max(1.0 - ct * ct, 0.0));
            let ph = 2.0 * PI * (f32(j) + 0.5) / f32(NS);
            let w = vec3f(st * cos(ph), ct, st * sin(ph));
            let tTop = raySphere(o, w, RT);
            let tG = raySphere(o, w, RG);
            let tMax = select(tTop, tG, tG > 0.0);
            let dt = tMax / f32(N);
            var T = vec3f(1.0);
            for (var k = 0; k < N; k++) {
                let p = o + w * ((f32(k) + 0.5) * dt);
                let rp = length(p);
                let m = medium(rp - RG);
                let sS = m.sR + vec3f(m.sM);
                let up = p / rp;
                let mup = dot(up, sunDir);
                let shadow = select(1.0, 0.0, raySphere(p, sunDir, RG) > 0.0);
                let Tsun = T_lut(rp, mup) * shadow;
                let Tstep = exp(-m.sT * dt);
                let S = sS * Tsun / (4.0 * PI);
                L2 += T * (S - S * Tstep) / max(m.sT, vec3f(1e-6));
                fms += T * (sS - sS * Tstep) / max(m.sT, vec3f(1e-6));
                T *= Tstep;
            }
            if (tG > 0.0) {
                let ng = normalize(o + w * tG);
                let ndl = max(dot(ng, sunDir), 0.0);
                L2 += T * (uniform.uGroundAlbedo / PI) * ndl * T_lut(RG, ndl);
            }
        }
    }
    L2 /= f32(NS * NS);
    fms /= f32(NS * NS);
    output.color = vec4f(L2 / max(vec3f(1.0) - fms, vec3f(1e-4)), 1.0);
    return output;
}
`;

// ---------------------------------------------------------------- 3. the sky
const GLSL_SKY_BODY = /* glsl */`
uniform sampler2D uTransmittance;
uniform sampler2D uMultiScatter;
uniform vec3  uSunDir;
uniform float uSunIntensity;
uniform float uMieG;
uniform float uSunDisc;      // 0 = no disc (the light-probe variant)
varying vec2 uv0;

vec3 T_lut(float r, float mu) { return texture(uTransmittance, transmittanceUv(r, mu)).rgb; }
vec3 MS_lut(float r, float mu) {
    vec2 uv = vec2(sign(mu) * sqrt(abs(mu)) * 0.5 + 0.5, sqrt(clamp((r - RG) / (RT - RG), 0.0, 1.0)));
    return texture(uMultiScatter, (clamp(uv, 0.0, 1.0) * vec2(63.0, 31.0) + 0.5) / vec2(64.0, 32.0)).rgb;
}

vec3 march(vec3 dir) {
    vec3 o = vec3(0.0, CAMERA_R, 0.0);
    float tTop = raySphere(o, dir, RT);
    float tG = raySphere(o, dir, RG);
    float tMax = tG > 0.0 ? tG : tTop;
    float mu = dot(dir, uSunDir);
    float phR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
    float g = uMieG;
    float phM = 3.0 / (8.0 * PI) * ((1.0 - g * g) * (1.0 + mu * mu)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * mu, 1.5));

    vec3 L = vec3(0.0), T = vec3(1.0);
    const int N = 40;
    float tPrev = 0.0;
    for (int i = 0; i < N; i++) {
        // quadratic spacing: fine steps in the dense air near the camera, coarse ones out at the top
        float f = (float(i) + 1.0) / float(N);
        float t = tMax * f * f;
        float dt = t - tPrev;
        vec3 p = o + dir * (0.5 * (t + tPrev));
        tPrev = t;
        float rp = length(p);
        vec3 sR, sT; float sM;
        medium(rp - RG, sR, sM, sT);
        vec3 up = p / rp;
        float mus = dot(up, uSunDir);
        float shadow = raySphere(p, uSunDir, RG) > 0.0 ? 0.0 : 1.0;
        vec3 Tsun = T_lut(rp, mus) * shadow;
        vec3 S = (sR * phR + vec3(sM * phM)) * Tsun + (sR + vec3(sM)) * MS_lut(rp, mus);
        vec3 Tstep = exp(-sT * dt);
        L += T * (S - S * Tstep) / max(sT, vec3(1e-7));
        T *= Tstep;
    }
    if (tG > 0.0) {
        vec3 ng = normalize(o + dir * tG);
        float ndl = max(dot(ng, uSunDir), 0.0);
        L += T * (uGroundAlbedo / PI) * ndl * T_lut(RG, ndl);
    }
    return L * uSunIntensity;
}

vec3 skyColor(vec3 dir) {
    vec3 col = march(dir);
    float theta = acos(clamp(dot(dir, uSunDir), -1.0, 1.0));
    // Earth solar angular radius. The surrounding aureole comes from Mie scattering.
    const float SUN_R = 0.00465;
    float edge = max(fwidth(theta), 0.0004);
    if (uSunDisc > 0.0 && raySphere(vec3(0.0, CAMERA_R, 0.0), dir, RG) < 0.0) {
        float limb = sqrt(max(1.0 - pow(min(theta / SUN_R, 1.0), 2.0), 0.0));
        float core = (1.0 - smoothstep(SUN_R - edge, SUN_R + edge, theta)) * (0.6 + 0.4 * limb) / 0.866667;
        col += core * uSunDisc * T_lut(CAMERA_R, dir.y);
    }
    // Preserve chromaticity when the physical solar radiance exceeds half-float range.
    float peak = max(max(col.r, col.g), col.b);
    return col * min(1.0, 40000.0 / max(peak, 1.0));
}

void main(void) {
    float phi = (uv0.x - 0.5) * 2.0 * PI;
    float theta = (0.5 - uv0.y) * PI;     // engine's toSphericalUv: "up" lives at v = 0
    vec3 dir = vec3(sin(phi) * cos(theta), sin(theta), cos(phi) * cos(theta));
    dir.x *= -1.0;
    gl_FragColor = vec4(skyColor(normalize(dir)), 1.0);
}
`;
const SKY_FS = GLSL_COMMON + GLSL_SKY_BODY;

const WGSL_SKY_BODY = /* wgsl */`
var uTransmittance: texture_2d<f32>;
var uTransmittanceSampler: sampler;
var uMultiScatter: texture_2d<f32>;
var uMultiScatterSampler: sampler;
uniform uSunDir: vec3f;
uniform uSunIntensity: f32;
uniform uMieG: f32;
uniform uSunDisc: f32;
varying uv0: vec2f;

fn T_lut(r: f32, mu: f32) -> vec3f { return textureSampleLevel(uTransmittance, uTransmittanceSampler, transmittanceUv(r, mu), 0.0).rgb; }
fn MS_lut(r: f32, mu: f32) -> vec3f {
    let uv = vec2f(sign(mu) * sqrt(abs(mu)) * 0.5 + 0.5, sqrt(clamp((r - RG) / (RT - RG), 0.0, 1.0)));
    return textureSampleLevel(uMultiScatter, uMultiScatterSampler, (clamp(uv, vec2f(0.0), vec2f(1.0)) * vec2f(63.0, 31.0) + 0.5) / vec2f(64.0, 32.0), 0.0).rgb;
}

fn march(dir: vec3f) -> vec3f {
    let o = vec3f(0.0, CAMERA_R, 0.0);
    let tTop = raySphere(o, dir, RT);
    let tG = raySphere(o, dir, RG);
    let tMax = select(tTop, tG, tG > 0.0);
    let mu = dot(dir, uniform.uSunDir);
    let phR = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
    let g = uniform.uMieG;
    let phM = 3.0 / (8.0 * PI) * ((1.0 - g * g) * (1.0 + mu * mu)) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * mu, 1.5));

    var L = vec3f(0.0);
    var T = vec3f(1.0);
    let N = 40;
    var tPrev = 0.0;
    for (var i = 0; i < N; i++) {
        let f = (f32(i) + 1.0) / f32(N);
        let t = tMax * f * f;
        let dt = t - tPrev;
        let p = o + dir * (0.5 * (t + tPrev));
        tPrev = t;
        let rp = length(p);
        let m = medium(rp - RG);
        let up = p / rp;
        let mus = dot(up, uniform.uSunDir);
        let shadow = select(1.0, 0.0, raySphere(p, uniform.uSunDir, RG) > 0.0);
        let Tsun = T_lut(rp, mus) * shadow;
        let S = (m.sR * phR + vec3f(m.sM * phM)) * Tsun + (m.sR + vec3f(m.sM)) * MS_lut(rp, mus);
        let Tstep = exp(-m.sT * dt);
        L += T * (S - S * Tstep) / max(m.sT, vec3f(1e-7));
        T *= Tstep;
    }
    if (tG > 0.0) {
        let ng = normalize(o + dir * tG);
        let ndl = max(dot(ng, uniform.uSunDir), 0.0);
        L += T * (uniform.uGroundAlbedo / PI) * ndl * T_lut(RG, ndl);
    }
    return L * uniform.uSunIntensity;
}

fn skyColor(dir: vec3f) -> vec3f {
    var col = march(dir);
    let theta = acos(clamp(dot(dir, uniform.uSunDir), -1.0, 1.0));
    const SUN_R: f32 = 0.00465;
    let edge = max(fwidth(theta), 0.0004);
    if (uniform.uSunDisc > 0.0 && raySphere(vec3f(0.0, CAMERA_R, 0.0), dir, RG) < 0.0) {
        let limb = sqrt(max(1.0 - pow(min(theta / SUN_R, 1.0), 2.0), 0.0));
        let core = (1.0 - smoothstep(SUN_R - edge, SUN_R + edge, theta)) * (0.6 + 0.4 * limb) / 0.866667;
        col += core * uniform.uSunDisc * T_lut(CAMERA_R, dir.y);
    }
    let peak = max(max(col.r, col.g), col.b);
    return col * min(1.0, 40000.0 / max(peak, 1.0));
}

@fragment fn fragmentMain(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;
    let phi = (input.uv0.x - 0.5) * 2.0 * PI;
    let theta = (0.5 - input.uv0.y) * PI;
    var dir = vec3f(sin(phi) * cos(theta), sin(theta), cos(phi) * cos(theta));
    dir.x *= -1.0;
    output.color = vec4f(skyColor(normalize(dir)), 1.0);
    return output;
}
`;
const SKY_FS_WGSL = WGSL_COMMON + WGSL_SKY_BODY;

/**
 * The same medium and transmittance integral on the CPU, for the sun's colour as a light source.
 * Matches the transmittance LUT to within the LUT's own sampling.
 *
 * @param {number[]} sunDir - Unit vector towards the sun.
 * @param {{rayleigh: number, mie: number, ozone: number}} p - Atmosphere multipliers.
 * @returns {number[]} Per-channel transmittance from ten metres up to the top of the atmosphere.
 */
function sunTransmittanceCPU(sunDir, p) {
    const RG = 6360, RT = 6460;
    const rayleighS = [5.802e-3, 13.558e-3, 33.1e-3];
    const mieS = 3.996e-3, mieA = 0.444e-3;
    const ozoneA = [0.650e-3, 1.881e-3, 0.085e-3];
    const mie = p.mie;
    const r = RG + 0.01;
    const mu = sunDir[1];
    const disc = r * r * (mu * mu - 1) + RT * RT;
    if (disc < 0) return [0, 0, 0];
    const tMax = Math.max(0, -r * mu + Math.sqrt(disc));
    if (raySphereHit(r, mu, RG)) return [0, 0, 0];
    const N = 64;
    let tPrev = 0;
    const tau = [0, 0, 0];
    for (let i = 0; i < N; i++) {
        const end = tMax * ((i + 1) / N) ** 2;
        const dt = end - tPrev;
        const t = (end + tPrev) * 0.5;
        tPrev = end;
        const rp = Math.sqrt(r * r + t * t + 2 * r * t * mu);
        const h = rp - RG;
        const dR = Math.exp(-h / 8), dM = Math.exp(-h / 1.2), dO = Math.max(0, 1 - Math.abs(h - 25) / 15);
        for (let c = 0; c < 3; c++) {
            tau[c] += (rayleighS[c] * p.rayleigh * dR + (mieS + mieA) * mie * dM + ozoneA[c] * p.ozone * dO) * dt;
        }
    }
    return tau.map(v => Math.exp(-v));
}

function raySphereHit(r, mu, R) {
    // from a point at radius r looking with cos-zenith mu: does the ray meet the sphere of radius R?
    if (mu >= 0) return false;
    const disc = r * r * (mu * mu - 1) + R * R;
    return disc >= 0;
}

/** Sun placement, atmospheric visibility, and one common scene exposure. */
const DEFAULT_SKY_PARAMS = Object.freeze({
    sunElevation: 25,      // degrees, positive above the horizon
    sunAzimuth: 165,       // degrees, 0 is +Z, 90 is +X
    haze: 1,              // aerosol density relative to the Earth reference atmosphere
    exposure: 0.55        // common scale for sky radiance and direct sunlight
});

const RANGES = {
    sunElevation: [-90, 90],
    sunAzimuth: [-Infinity, Infinity],
    haze: [0, 20],
    exposure: [0, 100]
};

/** Validate a complete update before changing any live state. */
function resolveSkyParams(patch, base = DEFAULT_SKY_PARAMS) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw new TypeError('Sky parameters must be an object.');
    }
    const next = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        if (!Object.hasOwn(RANGES, key)) throw new TypeError(`Unknown sky parameter: ${key}`);
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new TypeError(`Sky parameter ${key} must be a finite number.`);
        }
        const [min, max] = RANGES[key];
        if (value < min || value > max) {
            throw new RangeError(`Sky parameter ${key} must be between ${min} and ${max}.`);
        }
        next[key] = key === 'sunAzimuth' ? ((value + 180) % 360 + 360) % 360 - 180 : value;
    }
    return Object.freeze(next);
}

const SOLAR_IRRADIANCE = 18;
const AEROSOL_ASYMMETRY = 0.82;
const SUN_SOLID_ANGLE = Math.PI * Math.sin(0.00465) ** 2;

/**
 * Independent Earth atmosphere and environment lighting for PlayCanvas.
 *
 * The visible sky includes the sun. The environment excludes its disc because direct lighting
 * should supply solar illumination separately. Use getSunDirection()/getSunColor() for that light.
 * No camera, water surface, scene geometry, post processing, or directional light is created.
 *
 * GPU work runs in the next app frame, including the initial build. Assign onUpdate immediately
 * after construction to receive the first completed environment as well as subsequent changes.
 * Pass { attachToScene: false } as the third argument to manage scene assignment yourself.
 */
class Sky {
    constructor(app, params = {}, { attachToScene = true } = {}) {
        this._params = resolveSkyParams(params);
        if (typeof attachToScene !== 'boolean') throw new TypeError('attachToScene must be a boolean.');
        this.app = app;
        this.device = app.graphicsDevice;
        this._attachToScene = attachToScene;
        this._destroyed = false;
        this._previousScene = null;
        this._appliedExposure = null;
        this._ready = false;
        const device = this.device;

        const mkEquirect = (name, w, h) => new Texture(device, {
            name, width: w, height: h, format: PIXELFORMAT_RGBA16F, mipmaps: false,
            minFilter: FILTER_LINEAR, magFilter: FILTER_LINEAR,
            addressU: ADDRESS_REPEAT, addressV: ADDRESS_CLAMP_TO_EDGE,
            projection: TEXTUREPROJECTION_EQUIRECT
        });
        const mkLut = (name, w, h) => new Texture(device, {
            name, width: w, height: h, format: PIXELFORMAT_RGBA16F, mipmaps: false,
            minFilter: FILTER_LINEAR, magFilter: FILTER_LINEAR,
            addressU: ADDRESS_CLAMP_TO_EDGE, addressV: ADDRESS_CLAMP_TO_EDGE
        });

        this.transmittanceLut = mkLut('skyTransmittanceLUT', 256, 64);
        this.multiScatterLut = mkLut('skyMultiScatterLUT', 64, 32);
        this.rtTransmittance = new RenderTarget({ name: 'skyTransmittanceRT', colorBuffer: this.transmittanceLut, depth: false });
        this.rtMultiScatter = new RenderTarget({ name: 'skyMultiScatterRT', colorBuffer: this.multiScatterLut, depth: false });
        // Resolve the narrow sky band above the geometric horizon instead of averaging it with ground.
        this.lightingEquirect = mkEquirect('skyLightingEquirect', 2048, 1024);
        // Four thousand longitude samples keep the half-degree solar disc round after filtering.
        this.skyboxEquirect = mkEquirect('skyboxEquirect', 4096, 2048);
        this.rtLighting = new RenderTarget({ name: 'skyLightingRT', colorBuffer: this.lightingEquirect, depth: false });
        this.rtSkybox = new RenderTarget({ name: 'skyboxRT', colorBuffer: this.skyboxEquirect, depth: false });

        const mk = (name, glsl, wgsl) => ShaderUtils.createShader(device, {
            uniqueName: name,
            attributes: { aPosition: SEMANTIC_POSITION },
            vertexGLSL: ATMOS_VS, fragmentGLSL: glsl,
            vertexWGSL: ATMOS_VS_WGSL, fragmentWGSL: wgsl
        });
        this.transmittanceShader = mk('skyTransmittance', TRANSMITTANCE_FS, TRANSMITTANCE_FS_WGSL);
        this.multiScatterShader = mk('skyMultiScatter', MULTISCATTER_FS, MULTISCATTER_FS_WGSL);
        this.skyShader = mk('skyMarch', SKY_FS, SKY_FS_WGSL);

        this.sunDir = new Vec3();
        this.sunColor = new Color();
        this.envAtlas = null;
        this.lightingSource = null;
        this.skyboxCubemap = null;
        this.onUpdate = null;
        this._dirty = true;
        this._mediumDirty = true;
        this._skyDirty = true;
        this._updateSun();
        this._onFrame = () => {
            if (this._dirty && !this._destroyed) {
                this._dirty = false;
                this._rebuild();
            }
        };
        app.on('update', this._onFrame);
    }

    /** Immutable current configuration. Use setParams to change it. */
    get params() { return this._params; }
    get ready() { return this._ready; }
    getParams() { return { ...this._params }; }

    /** Linear lighting outputs. Radiance excludes the solar disc; exposure is applied by consumers. */
    get environment() {
        return Object.freeze({
            atlas: this.envAtlas,
            radiance: this._ready ? this.lightingEquirect : null,
            sunDirection: this.getSunDirection(),
            sunColor: this.getSunColor(),
            exposure: this._params.exposure,
            hazeDensity: this.aerialDensity
        });
    }

    /** Luminance-weighted atmospheric extinction at the observer, in inverse metres. */
    get aerialDensity() {
        const molecular = (5.802e-3 * 0.2126 + 13.558e-3 * 0.7152 + 33.1e-3 * 0.0722) * Math.exp(-0.01 / 8);
        const aerosol = 4.440e-3 * this._params.haze * Math.exp(-0.01 / 1.2);
        return (molecular + aerosol) / 1000;
    }

    /** Validate and merge an update; expensive work is coalesced into the next app frame. */
    setParams(patch) {
        if (this._destroyed) throw new Error('Sky has been destroyed.');
        const next = resolveSkyParams(patch, this._params);
        const changed = Object.keys(next).filter(key => next[key] !== this._params[key]);
        if (!changed.length) return this;
        this._mediumDirty ||= changed.includes('haze');
        this._skyDirty ||= changed.some(key => key !== 'exposure');
        this._params = next;
        this._dirty = true;
        this._updateSun();
        return this;
    }

    /** Apply a complete configuration from defaults, so omitted fields cannot leak between scenes. */
    resetParams(patch = {}) {
        return this.setParams(resolveSkyParams(patch));
    }

    _updateSun() {
        const p = this._params;
        const el = p.sunElevation * Math.PI / 180;
        const az = p.sunAzimuth * Math.PI / 180;
        this.sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
        const T = sunTransmittanceCPU([this.sunDir.x, this.sunDir.y, this.sunDir.z], { rayleigh: 1, mie: p.haze, ozone: 1 });
        const k = SOLAR_IRRADIANCE * p.exposure;
        this.sunColor.set(T[0] * k, T[1] * k, T[2] * k);
    }

    _setAtmosphere() {
        const p = this._params;
        const scope = this.device.scope;
        scope.resolve('uRayleigh').setValue(1);
        scope.resolve('uMie').setValue(p.haze);
        scope.resolve('uOzone').setValue(1);
        scope.resolve('uGroundAlbedo').setValue(0.1);
    }

    _setSky(withDisc) {
        const { sunDir } = this;
        const scope = this.device.scope;
        scope.resolve('uTransmittance').setValue(this.transmittanceLut);
        scope.resolve('uMultiScatter').setValue(this.multiScatterLut);
        scope.resolve('uSunDir').setValue([sunDir.x, sunDir.y, sunDir.z]);
        scope.resolve('uSunIntensity').setValue(SOLAR_IRRADIANCE);
        scope.resolve('uMieG').setValue(AEROSOL_ASYMMETRY);
        scope.resolve('uSunDisc').setValue(withDisc ? SOLAR_IRRADIANCE / SUN_SOLID_ANGLE : 0);
    }

    _rebuild() {
        const { device, app } = this;
        this._setAtmosphere();
        if (this._mediumDirty) {
            drawQuadWithShader(device, this.rtTransmittance, this.transmittanceShader);
            device.scope.resolve('uTransmittance').setValue(this.transmittanceLut);
            drawQuadWithShader(device, this.rtMultiScatter, this.multiScatterShader);
            this._mediumDirty = false;
        }

        let oldSource, oldAtlas, oldSkybox;
        if (this._skyDirty) {
            this._setSky(false);
            drawQuadWithShader(device, this.rtLighting, this.skyShader);
            this._setSky(true);
            drawQuadWithShader(device, this.rtSkybox, this.skyShader);
            oldSource = this.lightingSource;
            oldAtlas = this.envAtlas;
            oldSkybox = this.skyboxCubemap;
            // Recreate prefiltered targets: updating them in place can alias engine render passes.
            this.lightingSource = EnvLighting.generateLightingSource(this.lightingEquirect, { size: 256 });
            this.envAtlas = EnvLighting.generateAtlas(this.lightingSource, { numReflectionSamples: 1024, numAmbientSamples: 2048 });
            this.skyboxCubemap = EnvLighting.generateSkyboxCubemap(this.skyboxEquirect, 1024);
            this._skyDirty = false;
        }
        if (this._attachToScene) {
            const scene = app.scene;
            this._previousScene ??= {
                envAtlas: scene.envAtlas,
                prefilteredCubemaps: [...scene.prefilteredCubemaps],
                skybox: scene.skybox,
                intensity: scene.skyboxIntensity,
                mip: scene.skyboxMip
            };
            scene.envAtlas = this.envAtlas;
            scene.skybox = this.skyboxCubemap;
            scene.skyboxIntensity = this._params.exposure;
            scene.skyboxMip = 0;
            this._appliedExposure = this._params.exposure;
        }
        this._ready = true;
        // Notify before releasing the previous atlas so consumers can detach it safely.
        try {
            this.onUpdate?.(this);
        } finally {
            oldSource?.destroy();
            oldAtlas?.destroy();
            oldSkybox?.destroy();
        }
    }

    /** Average linear radiance just above the horizon, before exposure. Null before the first frame. */
    readHorizonColor() { return this._readRow((this.lightingEquirect.height >> 1) - 1); }
    /** Average linear radiance 25 degrees below the zenith, before exposure. */
    readZenithColor() { return this._readRow(Math.round(this.lightingEquirect.height * 0.14)); }

    async _readRow(y) {
        if (!this._ready || this._destroyed) return null;
        const t = this.lightingEquirect;
        const W = t.width;
        const data = await t.read(0, y, W, 1);
        if (!data || this._destroyed) return null;
        const values = data instanceof Uint16Array ? data : new Uint16Array(data.buffer ?? data, data.byteOffset ?? 0, W * 4);
        const h2f = (h) => {
            const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 0x1f, m = h & 0x3ff;
            if (e === 0) return s * m * 2 ** -24;
            if (e === 31) return 0;
            return s * (1 + m / 1024) * 2 ** (e - 15);
        };
        const c = [0, 0, 0];
        for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) c[k] += h2f(values[x * 4 + k]);
        return c.map(v => v / W);
    }

    /** Release owned resources; restore scene lighting only where this sky still owns it. */
    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this._ready = false;
        this.app.off('update', this._onFrame);
        const scene = this.app.scene, previous = this._previousScene;
        if (previous) {
            if (scene.envAtlas === this.envAtlas) {
                if (previous.prefilteredCubemaps.length) scene.prefilteredCubemaps = previous.prefilteredCubemaps;
                else scene.envAtlas = previous.envAtlas;
            }
            if (scene.skybox === this.skyboxCubemap) {
                scene.skybox = previous.skybox;
                if (scene.skyboxIntensity === this._appliedExposure) scene.skyboxIntensity = previous.intensity;
                if (scene.skyboxMip === 0) scene.skyboxMip = previous.mip;
            }
        }
        [this.rtLighting, this.rtSkybox, this.rtTransmittance, this.rtMultiScatter].forEach(rt => rt?.destroy());
        [this.lightingEquirect, this.skyboxEquirect, this.transmittanceLut, this.multiScatterLut,
            this.lightingSource, this.envAtlas, this.skyboxCubemap].forEach(t => t?.destroy());
        this.onUpdate = null;
    }

    /** Direction towards the sun in world space. The returned vector belongs to the caller. */
    getSunDirection() { return this.sunDir.clone(); }
    /** Direct solar irradiance in linear scene units, including atmospheric extinction and exposure. */
    getSunColor() { return this.sunColor.clone(); }
}

/** Gallery art direction. All entries use only the supported water and sky controls. */
const DEMO_PRESETS = {
    "Glass": {
        water: {
            wind: {"speed": 1.8, "direction": 20},
            swell: {"strength": 0.12, "direction": -60},
            waves: {"amplitude": 0.6, "choppiness": 0.45},
            roughness: 0.025,
            volume: {"color": [0.004, 0.07, 0.115], "visibility": 16},
            foam: 0.05,
            caustics: {"enabled": false},
        },
        sky: {"sunElevation": 12, "sunAzimuth": 108, "haze": 0.6, "exposure": 0.333333},
        grade: {"saturation": 1.02, "contrast": 1.02, "bloom": 0.02}
    },
    "Breeze": {
        water: {
            wind: {"speed": 9, "direction": 35},
            swell: {"strength": 0.6, "direction": -20},
            waves: {"amplitude": 1, "choppiness": 1.4},
            roughness: 0.06,
            volume: {"color": [0.003, 0.075, 0.11], "visibility": 10},
            foam: 1,
            caustics: {"enabled": false},
        },
        sky: {"sunElevation": 25, "sunAzimuth": 165, "haze": 0.5, "exposure": 0.6},
        grade: {"saturation": 1.05, "contrast": 1.03, "bloom": 0.025}
    },
    "Golden hour": {
        water: {
            wind: {"speed": 10.5, "direction": 158},
            swell: {"strength": 0.8, "direction": 150},
            waves: {"amplitude": 1.05, "choppiness": 1.5},
            roughness: 0.055,
            volume: {"color": [0.003, 0.045, 0.075], "visibility": 10},
            foam: 0.8,
            caustics: {"enabled": false},
        },
        sky: {"sunElevation": 2.2, "sunAzimuth": 160, "haze": 1.1, "exposure": 0.444444},
        grade: {"saturation": 1.06, "contrast": 1.05, "bloom": 0.045}
    },
    "Storm": {
        water: {
            wind: {"speed": 22, "direction": 60},
            swell: {"strength": 1.1, "direction": 30},
            waves: {"amplitude": 0.8, "choppiness": 1.2},
            roughness: 0.14,
            volume: {"color": [0.008, 0.05, 0.065], "visibility": 7},
            foam: 0.9,
            caustics: {"enabled": false},
        },
        sky: {"sunElevation": 9, "sunAzimuth": 25, "haze": 6, "exposure": 0.416667},
        grade: {"saturation": 0.25, "contrast": 0.98, "bloom": 0.02, "tint": [0.96, 0.99, 1]}
    },
    "Tropical shallows": {
        water: {
            wind: {"speed": 4.5, "direction": -10},
            swell: {"strength": 0.25, "direction": -40},
            waves: {"amplitude": 0.65, "choppiness": 0.8},
            roughness: 0.05,
            volume: {"color": [0.014, 0.112, 0.1295], "visibility": 14},
            foam: 0.25,
            caustics: {"enabled": true, "strength": 1.2, "scale": 0.55},
        },
        sky: {"sunElevation": 52, "sunAzimuth": 55, "haze": 0.35, "exposure": 0.222222},
        grade: {"saturation": 1.14, "contrast": 1.02, "bloom": 0.03}
    },
    "Afterglow": {
        water: {
            wind: {"speed": 8, "direction": -160},
            swell: {"strength": 0.7, "direction": -170},
            waves: {"amplitude": 0.95, "choppiness": 1.3},
            roughness: 0.05,
            volume: {"color": [0.0096, 0.048, 0.0992], "visibility": 10},
            foam: 0.7,
            caustics: {"enabled": false},
        },
        sky: {"sunElevation": -2, "sunAzimuth": 15, "haze": 0.7, "exposure": 1.6},
        grade: {"saturation": 1.04, "contrast": 0.98, "bloom": 0.018}
    },
};

/**
 * Apply a complete gallery look. Resetting through the libraries prevents previous edits or
 * presets from leaking into this scene; hardware quality and attached bathymetry are retained.
 *
 * @param {import('../src/water/Water.js').Water} water
 * @param {import('../src/sky/Sky.js').Sky} sky
 * @param {string} name
 * @param {object} [cameraFrame] PlayCanvas CameraFrame to receive the presentation grade.
 */
function applyPreset(water, sky, name, cameraFrame) {
    const preset = DEMO_PRESETS[name];
    if (!preset) throw new RangeError(`Unknown demo preset: ${name}`);
    water.reset({ ...preset.water, quality: water.config.quality });
    sky.resetParams(preset.sky);

    if (cameraFrame) {
        const grade = preset.grade ?? {};
        cameraFrame.grading.saturation = grade.saturation ?? 1;
        cameraFrame.grading.contrast = grade.contrast ?? 1;
        cameraFrame.grading.brightness = grade.brightness ?? 1;
        cameraFrame.grading.tint.set(...(grade.tint ?? [1, 1, 1]));
        cameraFrame.bloom.intensity = grade.bloom ?? 0;
    }
}

// ---------------------------------------------------------------------------------------------
// Procedural props. An empty sea has no scale: without something in it whose size you already
// know, a two metre chop and a twenty metre swell look identical. Everything here exists to give
// the eye that reference — and to give the reflections, the foam and the depth something to catch on.
// ---------------------------------------------------------------------------------------------

function hash(n) {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
}

function material(diffuse, gloss, metalness = 0) {
    const m = new StandardMaterial();
    m.diffuse = new Color(...diffuse);
    m.gloss = gloss;
    m.useMetalness = true;
    m.metalness = metalness;
    m.update();
    return m;
}

// The engine's default torus has a very thick tube, which makes small metal rings look inflated.
const ringMeshes = new WeakMap();
function ringMesh(device) {
    if (!ringMeshes.has(device)) {
        ringMeshes.set(device, Mesh.fromGeometry(device, new TorusGeometry({
            ringRadius: 0.465, tubeRadius: 0.035, segments: 32, sides: 8
        })));
    }
    return ringMeshes.get(device);
}

/**
 * A steel channel buoy: a welded can with a conical collar, a lattice tower and a lantern. Built from
 * the parts a real one has, because that is what makes an object read as equipment rather than as a
 * primitive with a colour on it.
 *
 * @param {import('playcanvas').GraphicsDevice} device - Graphics device.
 * @param {number} scale - Overall size; 1 is roughly a 2 m buoy.
 * @param {object} mats - Shared materials.
 * @returns {Entity} The buoy, with its waterline at y = 0.
 */
function createBuoy(device, scale, mats) {
    const root = new Entity('Buoy');
    const s = scale;
    const part = (name, type, mat, pos, sc, rot) => {
        const e = new Entity(name);
        e.addComponent('render', type === 'torus'
            ? { meshInstances: [new MeshInstance(ringMesh(device), mat)], castShadows: true }
            : { type, material: mat, castShadows: true });
        e.setLocalPosition(pos[0] * s, pos[1] * s, pos[2] * s);
        e.setLocalScale(sc[0] * s, sc[1] * s, sc[2] * s);
        if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
        root.addChild(e);
        return e;
    };

    // hull: a squat can with a rolled rim, sitting a third out of the water
    part('can', 'cylinder', mats.hull, [0, 0.18, 0], [1.5, 0.62, 1.5]);
    part('rim', 'torus', mats.rust, [0, 0.48, 0], [1.5, 1.5, 1.5]);
    // the conical skirt below, which is what keeps it upright
    part('skirt', 'cone', mats.rust, [0, -0.62, 0], [1.45, 1.05, 1.45], [180, 0, 0]);
    // counterweight tube trailing under it
    part('tail', 'cylinder', mats.rust, [0, -1.5, 0], [0.3, 1.1, 0.3]);

    // Connect actual beam endpoints, so the tower remains a continuous welded structure.
    // The lower collar overlaps the can's top at 0.49 m; the platform carries the lantern.
    part('deck-collar', 'cylinder', mats.rust, [0, 0.51, 0], [0.72, 0.10, 0.72]);
    const beam = (name, from, to, diameter) => {
        const d = new Vec3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
        const length = d.length();
        d.divScalar(length);
        const e = part(name, 'cylinder', mats.steel,
            from.map((v, i) => (v + to[i]) * 0.5), [diameter, length, diameter]);
        const axis = new Vec3(d.z, 0, -d.x);
        if (axis.length() > 1e-6) {
            e.setLocalRotation(new Quat().setFromAxisAngle(axis.normalize(), Math.acos(d.y) * 180 / Math.PI));
        }
        return e;
    };
    const foot = [], crown = [];
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI * 0.5 + Math.PI * 0.25;
        foot.push([Math.cos(a) * 0.30, 0.54, Math.sin(a) * 0.30]);
        crown.push([Math.cos(a) * 0.16, 1.85, Math.sin(a) * 0.16]);
        beam(`leg${i}`, foot[i], crown[i], 0.065);
    }
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        beam(`brace${i}`, foot[i], crown[j], 0.036);
    }
    part('lower-ring', 'torus', mats.steel, [0, 0.57, 0], [0.65, 0.65, 0.65]);
    part('upper-ring', 'torus', mats.steel, [0, 1.83, 0], [0.38, 0.38, 0.38]);
    part('lantern-platform', 'cylinder', mats.steel, [0, 1.87, 0], [0.44, 0.10, 0.44]);
    part('lantern', 'cylinder', mats.lamp, [0, 2.045, 0], [0.28, 0.26, 0.28]);
    part('cap', 'cone', mats.steel, [0, 2.255, 0], [0.36, 0.18, 0.36]);

    return root;
}

/**
 * A cluster of weathered timber piles — a mooring dolphin. Three or four leaning trunks bound at the
 * top, standing in a couple of metres of water: an unmistakable piece of coast, and a vertical the
 * eye can measure the swell against.
 *
 * @param {import('playcanvas').GraphicsDevice} device - Graphics device.
 * @param {number[]} at - World XZ to stand it at.
 * @param {number} seabedY - Sea-bed height there, so the piles reach the bottom.
 * @param {object} mats - Shared materials.
 * @returns {Entity} The dolphin.
 */
function createPiles(device, at, seabedY, mats) {
    const root = new Entity('Piles');
    root.setPosition(at[0], 0, at[1]);
    const n = 4;
    const height = -seabedY + 3.4;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.7;
        const r = 0.75;
        const lean = 5 + hash(i + at[0]) * 4;
        const h = height * (0.86 + hash(i * 3.1 + at[1]) * 0.22);
        const p = new Entity(`pile${i}`);
        p.addComponent('render', { type: 'cylinder', material: mats.timber, castShadows: true });
        p.setLocalScale(0.34, h, 0.34);
        p.setLocalPosition(Math.cos(a) * r, seabedY + h * 0.5, Math.sin(a) * r);
        p.setLocalEulerAngles(-Math.sin(a) * lean, 0, Math.cos(a) * lean);
        root.addChild(p);
    }
    // the band that holds them together, just above the waterline
    const band = new Entity('band');
    band.addComponent('render', { meshInstances: [new MeshInstance(ringMesh(device), mats.rust)], castShadows: true });
    band.setLocalScale(1.5, 1.5, 1.5);
    band.setLocalPosition(0, 2.3, 0);
    root.addChild(band);
    return root;
}

/**
 * Gulls. Two wings and a body, wheeling on long slow circles and flapping now and then. Almost
 * nothing on screen, and the single cheapest way to put a sky in motion and a sea in scale.
 */
class Birds {
    /**
     * @param {import('playcanvas').AppBase} app - The application.
     * @param {number} [count] - How many.
     */
    constructor(app, count = 7) {
        const mat = material([0.86, 0.87, 0.9], 0.25);
        const dark = material([0.16, 0.17, 0.2], 0.25);
        this.items = [];
        for (let i = 0; i < count; i++) {
            const root = new Entity(`Gull${i}`);
            const body = new Entity('body');
            body.addComponent('render', { type: 'capsule', material: mat, castShadows: false });
            body.setLocalScale(0.16, 0.42, 0.16);
            body.setLocalEulerAngles(90, 0, 0);
            root.addChild(body);

            const wings = [];
            for (const side of [-1, 1]) {
                const w = new Entity('wing');
                w.addComponent('render', { type: 'box', material: mat, castShadows: false });
                w.setLocalScale(0.62, 0.03, 0.2);
                w.setLocalPosition(side * 0.34, 0, 0);
                const tip = new Entity('wingtip');
                tip.addComponent('render', { type: 'box', material: dark, castShadows: false });
                tip.setLocalScale(0.3, 1.05, 1);
                tip.setLocalPosition(side * 0.38, 0, 0);
                w.addChild(tip);
                root.addChild(w);
                wings.push({ e: w, side });
            }
            app.root.addChild(root);
            this.items.push({
                root, wings,
                centre: [(hash(i) - 0.5) * 260, (hash(i + 9) - 0.5) * 260],
                radius: 40 + hash(i + 3) * 90,
                height: 14 + hash(i + 5) * 34,
                speed: 0.09 + hash(i + 7) * 0.07,
                phase: hash(i + 11) * 6.283,
                flap: 1.6 + hash(i + 13) * 1.4
            });
        }
        this._p = new Vec3();
        this.time = 0;
    }

    /** @param {number} dt - Frame delta time. */
    update(dt, camera = null) {
        this.time += dt;
        for (const b of this.items) {
            const a = this.time * b.speed + b.phase;
            const x = b.centre[0] + Math.cos(a) * b.radius;
            const z = b.centre[1] + Math.sin(a) * b.radius;
            const y = b.height + Math.sin(a * 2.3) * 2.5;
            b.root.setPosition(x, y, z);
            b.root.enabled = this._visible !== false && (!camera || b.root.getPosition().distance(camera.getPosition()) > 90);
            // face along the tangent of the circle
            b.root.lookAt(x - Math.sin(a), y + Math.cos(a * 2.3) * 5.75 / b.radius, z + Math.cos(a));
            b.root.rotateLocal(0, 0, -8);
            // a burst of flapping between long glides
            const cycle = (Math.sin(a * 3.1) + 1) * 0.5;
            const beat = Math.sin(this.time * b.flap * 6.0) * Math.max(0, cycle - 0.45) * 2.0;
            for (const w of b.wings) w.e.setLocalEulerAngles(0, 0, w.side * beat * 26);
        }
    }

    set visible(value) {
        if (this._visible === value) return;
        this._visible = value;
        for (const { root } of this.items) root.enabled = value;
    }
}

// ---------------------------------------------------------------------------------------------
// Materials for the coast, built on the engine's StandardMaterial through chunk overrides so the
// terrain and the rocks keep its lights, cascaded shadows, environment lighting and fog.
//
//   terrain   three scanned PBR sets (sand, scrub,
//             rock face) are projected along the world axes and blended by the normal (with the
//             tangent-space normals re-oriented per projection — Golus' whiteout blend), then
//             blended by height, slope and the bpy-authored bedrock mask. Wet sand along the swash.
//   rock      the scanned rock models keep their own UVs and maps; the override only adds the
//             dark, wet intertidal band below the high-water line.
//
// Every chunk is written twice, GLSL and WGSL, as the rest of this project does.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------- terrain
const TERRAIN_GLSL = {
    diffusePS: /* glsl */`
uniform float uSeaLevel;
uniform vec3  uTexScale;        // tiles per metre: sand, grass, rock
uniform sampler2D uSandAlbedo;  uniform sampler2D uSandNormal;
uniform sampler2D uGrassAlbedo; uniform sampler2D uGrassNormal;
uniform sampler2D uRockAlbedo;  uniform sampler2D uRockNormal;  uniform sampler2D uRockArm;

vec3 gW;                           // triplanar weights
float gRock, gGrass, gWet, gRough, gFar, gNear;

// Smooth domain variation keeps PBR channels registered while breaking the tile grid.
float terrainNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec4 h = fract(sin(vec4(dot(i, vec2(127.1, 311.7)), dot(i + vec2(1,0), vec2(127.1,311.7)),
        dot(i + vec2(0,1), vec2(127.1,311.7)), dot(i + vec2(1,1), vec2(127.1,311.7)))) * 43758.5453);
    return mix(mix(h.x,h.y,u.x), mix(h.z,h.w,u.x), u.y);
}
vec2 terrainUv(vec2 p) {
    return p + (vec2(terrainNoise(p * 0.17), terrainNoise(p * 0.17 + vec2(19.3,7.1))) - 0.5) * 2.4;
}

vec3 triWeights(vec3 n) {
    vec3 w = pow(abs(n), vec3(5.0));
    return w / (w.x + w.y + w.z);
}
vec4 triSample(sampler2D t, vec3 p, vec3 w) {
    return texture(t, terrainUv(p.zy)) * w.x + texture(t, terrainUv(p.xz)) * w.y + texture(t, terrainUv(p.xy)) * w.z;
}
vec3 triNormal(sampler2D t, vec3 p, vec3 w, vec3 n) {
    vec3 tx = texture(t, terrainUv(p.zy)).xyz * 2.0 - 1.0;
    vec3 ty = texture(t, terrainUv(p.xz)).xyz * 2.0 - 1.0;
    vec3 tz = texture(t, terrainUv(p.xy)).xyz * 2.0 - 1.0;
    tx = vec3(tx.xy + n.zy, abs(tx.z) * n.x);
    ty = vec3(ty.xy + n.xz, abs(ty.z) * n.y);
    tz = vec3(tz.xy + n.xy, abs(tz.z) * n.z);
    return normalize(tx.zyx * w.x + ty.xzy * w.y + tz.xyz * w.z);
}

void getAlbedo() {
    vec3 n = normalize(dVertexNormalW);
    gW = triWeights(n);
    float h = vPositionW.y - uSeaLevel;
    float slope = 1.0 - n.y;

    // a slow field breaks the bands so the scrub line and the rock line wander
    float wander = 0.6 * sin(vPositionW.x * 0.031 + 1.7) * sin(vPositionW.z * 0.027) + 0.4 * sin(vPositionW.x * 0.071 + vPositionW.z * 0.043);
    float hb = h + wander * 4.0;

    gRock = smoothstep(0.30, 0.52, slope + wander * 0.12);
    gRock = max(gRock, smoothstep(15.0, 24.0, hb) * smoothstep(0.08, 0.25, slope));
    gRock = max(gRock, (1.0 - smoothstep(-80.0, 20.0, vPositionW.x)) * smoothstep(0.0, 3.0, h) * 0.9);
    gRock = max(gRock, vVertexColor.r);
    gGrass = smoothstep(3.2, 6.5, hb) * (1.0 - smoothstep(0.16, 0.36, slope)) * (1.0 - gRock);
    // wet sand: darker and glossier from the swash zone down
    gWet = (1.0 - smoothstep(0.1, 1.1, h)) * (1.0 - gRock) * (1.0 - gGrass);

    vec3 ps = vPositionW * uTexScale.x, pg = vPositionW * uTexScale.y, pr = vPositionW * uTexScale.z;
    // the rock tile is small enough to read close up and so repeats across a cliff; past 50 m it
    // is cross-faded to the same map at a 5x larger tile, and a slow tonal variation is laid over
    gFar = smoothstep(50.0, 180.0, distance(vPositionW, view_position));
    vec4 sand = mix(triSample(uSandAlbedo, ps, gW), triSample(uSandAlbedo, ps * 0.713 + vec3(0.37, 0.0, 0.61), gW), 0.5);
    // a close-range grain: the sand map again at a 12x smaller tile, fading out past a few metres
    gNear = 1.0 - smoothstep(3.0, 12.0, distance(vPositionW, view_position));
    sand.rgb *= 1.0 + (triSample(uSandAlbedo, ps * 12.0, gW).g * 2.0 - 1.0) * 0.22 * gNear;
    sand.rgb = mix(sand.rgb, mix(vec3(0.48, 0.42, 0.32), sand.rgb, 0.25), 1.0 - smoothstep(-0.5, 0.5, h));
    vec4 grass = triSample(uGrassAlbedo, pg, gW);
    vec4 rock = mix(triSample(uRockAlbedo, pr, gW), triSample(uRockAlbedo, pr * 0.2, gW), gFar);
    rock.rgb *= mix(0.85, 1.1, triSample(uRockAlbedo, pr * 0.045, gW).g) * vec3(0.75, 0.82, 0.88);
    // sand and scrub are matte and open; only the rock's own AO / roughness map is worth sampling
    vec4 rockArm = triSample(uRockArm, pr, gW);
    gRough = mix(mix(0.78, 0.85, gGrass), rockArm.g, gRock);
    float ao = mix(1.0, rockArm.r, gRock);

    vec3 c = mix(mix(sand.rgb, grass.rgb, gGrass), rock.rgb, gRock) * ao;
    c *= mix(1.0, 0.5, gWet);
    // sand goes a little greener as it goes under, the way wet silica does through a metre of water
    c *= mix(vec3(1.0), vec3(0.85, 0.95, 0.9), clamp(-h * 0.25, 0.0, 1.0) * (1.0 - gRock));
    c *= mix(1.0, 0.55, gRock * (1.0 - smoothstep(-0.4, 1.0, h)));
    dAlbedo = c;
}
`,
    normalMapPS: /* glsl */`
void getNormal() {
    vec3 n = normalize(dVertexNormalW);
    vec3 ps = vPositionW * uTexScale.x, pr = vPositionW * uTexScale.z;
    vec3 ns = triNormal(uSandNormal, ps, gW, n);
    float phase = vPositionW.x * 8.0 + sin(vPositionW.z * 0.43 + sin(vPositionW.x * 0.19)) * 3.0;
    float sedimentPatch = smoothstep(-0.2, 0.7, sin(vPositionW.x * 0.21) * sin(vPositionW.z * 0.17 + 1.4));
    float ripple = sin(phase) * sedimentPatch * (1.0 - smoothstep(0.4, 2.0, fwidth(phase)));
    ns = normalize(mix(n, ns, 0.18) + vec3(ripple * 0.045, 0.0, ripple * 0.012));
    vec3 ng = triNormal(uGrassNormal, vPositionW * uTexScale.y, gW, n);
    vec3 nr = normalize(mix(n, triNormal(uRockNormal, pr, gW, n), 0.65));
    dNormalW = normalize(mix(mix(ns, ng, gGrass), nr, gRock));
}
`,
    glossPS: /* glsl */`
void getGlossiness() {
    dGlossiness = mix(1.0 - gRough, mix(0.12, 0.55, smoothstep(-0.2, 0.4, vPositionW.y - uSeaLevel)), gWet) + 0.0000001;
}
`
};

const TERRAIN_WGSL = {
    diffusePS: /* wgsl */`
uniform uSeaLevel: f32;
uniform uTexScale: vec3f;
var uSandAlbedo: texture_2d<f32>;
var uSandAlbedoSampler: sampler;
var uSandNormal: texture_2d<f32>;
var uSandNormalSampler: sampler;
var uGrassAlbedo: texture_2d<f32>;
var uGrassAlbedoSampler: sampler;
var uGrassNormal: texture_2d<f32>;
var uGrassNormalSampler: sampler;
var uRockAlbedo: texture_2d<f32>;
var uRockAlbedoSampler: sampler;
var uRockNormal: texture_2d<f32>;
var uRockNormalSampler: sampler;
var uRockArm: texture_2d<f32>;
var uRockArmSampler: sampler;

var<private> gW: vec3f;
var<private> gRock: f32;
var<private> gGrass: f32;
var<private> gWet: f32;
var<private> gRough: f32;
var<private> gFar: f32;
var<private> gNear: f32;

fn terrainNoise(p: vec2f) -> f32 {
    let i = floor(p); let f = fract(p);
    let u = f * f * (3.0 - 2.0 * f);
    let h = fract(sin(vec4f(dot(i, vec2f(127.1,311.7)), dot(i + vec2f(1,0), vec2f(127.1,311.7)),
        dot(i + vec2f(0,1), vec2f(127.1,311.7)), dot(i + vec2f(1,1), vec2f(127.1,311.7)))) * 43758.5453);
    return mix(mix(h.x,h.y,u.x), mix(h.z,h.w,u.x), u.y);
}
fn terrainUv(p: vec2f) -> vec2f {
    return p + (vec2f(terrainNoise(p * 0.17), terrainNoise(p * 0.17 + vec2f(19.3,7.1))) - 0.5) * 2.4;
}

fn triWeights(n: vec3f) -> vec3f {
    let w = pow(abs(n), vec3f(5.0));
    return w / (w.x + w.y + w.z);
}
fn triSample(t: texture_2d<f32>, s: sampler, p: vec3f, w: vec3f) -> vec4f {
    return textureSample(t, s, terrainUv(p.zy)) * w.x + textureSample(t, s, terrainUv(p.xz)) * w.y + textureSample(t, s, terrainUv(p.xy)) * w.z;
}
fn triNormal(t: texture_2d<f32>, s: sampler, p: vec3f, w: vec3f, n: vec3f) -> vec3f {
    var tx = textureSample(t, s, terrainUv(p.zy)).xyz * 2.0 - 1.0;
    var ty = textureSample(t, s, terrainUv(p.xz)).xyz * 2.0 - 1.0;
    var tz = textureSample(t, s, terrainUv(p.xy)).xyz * 2.0 - 1.0;
    tx = vec3f(tx.xy + n.zy, abs(tx.z) * n.x);
    ty = vec3f(ty.xy + n.xz, abs(ty.z) * n.y);
    tz = vec3f(tz.xy + n.xy, abs(tz.z) * n.z);
    return normalize(tx.zyx * w.x + ty.xzy * w.y + tz.xyz * w.z);
}

fn getAlbedo() {
    let n = normalize(dVertexNormalW);
    gW = triWeights(n);
    let h = vPositionW.y - uniform.uSeaLevel;
    let slope = 1.0 - n.y;

    let wander = 0.6 * sin(vPositionW.x * 0.031 + 1.7) * sin(vPositionW.z * 0.027) + 0.4 * sin(vPositionW.x * 0.071 + vPositionW.z * 0.043);
    let hb = h + wander * 4.0;

    gRock = smoothstep(0.30, 0.52, slope + wander * 0.12);
    gRock = max(gRock, smoothstep(15.0, 24.0, hb) * smoothstep(0.08, 0.25, slope));
    gRock = max(gRock, (1.0 - smoothstep(-80.0, 20.0, vPositionW.x)) * smoothstep(0.0, 3.0, h) * 0.9);
    gRock = max(gRock, vVertexColor.r);
    gGrass = smoothstep(3.2, 6.5, hb) * (1.0 - smoothstep(0.16, 0.36, slope)) * (1.0 - gRock);
    gWet = (1.0 - smoothstep(0.1, 1.1, h)) * (1.0 - gRock) * (1.0 - gGrass);

    let ps = vPositionW * uniform.uTexScale.x;
    let pg = vPositionW * uniform.uTexScale.y;
    let pr = vPositionW * uniform.uTexScale.z;
    let dist = distance(vPositionW, uniform.view_position);
    gFar = smoothstep(50.0, 180.0, dist);
    gNear = 1.0 - smoothstep(3.0, 12.0, dist);
    var sand = mix(triSample(uSandAlbedo, uSandAlbedoSampler, ps, gW), triSample(uSandAlbedo, uSandAlbedoSampler, ps * 0.713 + vec3f(0.37, 0.0, 0.61), gW), 0.5);
    sand = vec4f(sand.rgb * (1.0 + (triSample(uSandAlbedo, uSandAlbedoSampler, ps * 12.0, gW).g * 2.0 - 1.0) * 0.22 * gNear), sand.a);
    sand = vec4f(mix(sand.rgb, mix(vec3f(0.48, 0.42, 0.32), sand.rgb, 0.25), 1.0 - smoothstep(-0.5, 0.5, h)), sand.a);
    let grass = triSample(uGrassAlbedo, uGrassAlbedoSampler, pg, gW);
    var rock = mix(triSample(uRockAlbedo, uRockAlbedoSampler, pr, gW), triSample(uRockAlbedo, uRockAlbedoSampler, pr * 0.2, gW), gFar);
    rock = vec4f(rock.rgb * mix(0.85, 1.1, triSample(uRockAlbedo, uRockAlbedoSampler, pr * 0.045, gW).g) * vec3f(0.75, 0.82, 0.88), rock.a);
    let rockArm = triSample(uRockArm, uRockArmSampler, pr, gW);
    gRough = mix(mix(0.78, 0.85, gGrass), rockArm.g, gRock);
    let ao = mix(1.0, rockArm.r, gRock);

    var c = mix(mix(sand.rgb, grass.rgb, gGrass), rock.rgb, gRock) * ao;
    c = c * mix(1.0, 0.5, gWet);
    c = c * mix(vec3f(1.0), vec3f(0.85, 0.95, 0.9), clamp(-h * 0.25, 0.0, 1.0) * (1.0 - gRock));
    c = c * mix(1.0, 0.55, gRock * (1.0 - smoothstep(-0.4, 1.0, h)));
    dAlbedo = c;
}
`,
    normalMapPS: /* wgsl */`
fn getNormal() {
    let n = normalize(dVertexNormalW);
    let ps = vPositionW * uniform.uTexScale.x;
    let pr = vPositionW * uniform.uTexScale.z;
    var ns = triNormal(uSandNormal, uSandNormalSampler, ps, gW, n);
    let phase = vPositionW.x * 8.0 + sin(vPositionW.z * 0.43 + sin(vPositionW.x * 0.19)) * 3.0;
    let sedimentPatch = smoothstep(-0.2, 0.7, sin(vPositionW.x * 0.21) * sin(vPositionW.z * 0.17 + 1.4));
    let ripple = sin(phase) * sedimentPatch * (1.0 - smoothstep(0.4, 2.0, fwidth(phase)));
    ns = normalize(mix(n, ns, 0.18) + vec3f(ripple * 0.045, 0.0, ripple * 0.012));
    let ng = triNormal(uGrassNormal, uGrassNormalSampler, vPositionW * uniform.uTexScale.y, gW, n);
    let nr = normalize(mix(n, triNormal(uRockNormal, uRockNormalSampler, pr, gW, n), 0.65));
    dNormalW = normalize(mix(mix(ns, ng, gGrass), nr, gRock));
}
`,
    glossPS: /* wgsl */`
fn getGlossiness() {
    dGlossiness = mix(1.0 - gRough, mix(0.12, 0.55, smoothstep(-0.2, 0.4, vPositionW.y - uniform.uSeaLevel)), gWet) + 0.0000001;
}
`
};

/**
 * Turn a StandardMaterial into the triplanar terrain material.
 *
 * @param {import('playcanvas').StandardMaterial} mat - Material to modify in place.
 * @param {object} opts - Options.
 * @param {{albedo: Texture, normal: Texture, arm: Texture}} opts.sand - Sand set.
 * @param {{albedo: Texture, normal: Texture, arm: Texture}} opts.grass - Scrub set.
 * @param {{albedo: Texture, normal: Texture, arm: Texture}} opts.rock - Rock face set.
 * @param {number[]} opts.tileMetres - Metres covered by one tile of each set: [sand, grass, rock].
 * @param {number} [opts.seaLevel] - World Y of the sea, for the wet band.
 */
function applyTerrain(mat, { sand, grass, rock, tileMetres, seaLevel = 0 }) {
    mat.diffuseVertexColor = true; // Authored bedrock/sediment mask, consumed by our albedo chunk.
    mat.shaderChunks.version = '2.22';
    for (const [k, v] of Object.entries(TERRAIN_GLSL)) mat.shaderChunks.glsl.set(k, v);
    for (const [k, v] of Object.entries(TERRAIN_WGSL)) mat.shaderChunks.wgsl.set(k, v);
    mat.setParameter('uSeaLevel', seaLevel);
    mat.setParameter('uTexScale', tileMetres.map(m => 1 / m));
    for (const [name, set] of [['Sand', sand], ['Grass', grass], ['Rock', rock]]) {
        mat.setParameter(`u${name}Albedo`, set.albedo);
        mat.setParameter(`u${name}Normal`, set.normal);
    }
    mat.setParameter('uRockArm', rock.arm);
    mat.update();
}

// ---------------------------------------------------------------- scanned rocks
// The engine's own albedo and gloss stages, with the intertidal band added at the end of each.
const ROCK_GLSL = {
    diffusePS: /* glsl */`
uniform vec3 material_diffuse;
uniform float uSeaLevel;
float gWet;
void getAlbedo() {
    dAlbedo = material_diffuse.rgb;
    #ifdef STD_DIFFUSE_TEXTURE
        dAlbedo *= {STD_DIFFUSE_TEXTURE_DECODE}(texture2DBias({STD_DIFFUSE_TEXTURE_NAME}, {STD_DIFFUSE_TEXTURE_UV}, textureBias)).{STD_DIFFUSE_TEXTURE_CHANNEL};
    #endif
    #ifdef STD_DIFFUSE_VERTEX
        dAlbedo *= saturate(vVertexColor.{STD_DIFFUSE_VERTEX_CHANNEL});
    #endif
    // wet, weed-darkened rock below the high-water line
    gWet = 1.0 - smoothstep(0.4, 1.5, vPositionW.y - uSeaLevel);
    dAlbedo *= mix(1.0, 0.4, gWet) * mix(vec3(1.0), vec3(0.8, 0.92, 0.85), gWet * 0.5);
}
`,
    glossPS: /* glsl */`
#ifdef STD_GLOSS_CONSTANT
uniform float material_gloss;
#endif
void getGlossiness() {
    dGlossiness = 1.0;
    #ifdef STD_GLOSS_CONSTANT
    dGlossiness *= material_gloss;
    #endif
    #ifdef STD_GLOSS_TEXTURE
    dGlossiness *= texture2DBias({STD_GLOSS_TEXTURE_NAME}, {STD_GLOSS_TEXTURE_UV}, textureBias).{STD_GLOSS_TEXTURE_CHANNEL};
    #endif
    #ifdef STD_GLOSS_VERTEX
    dGlossiness *= saturate(vVertexColor.{STD_GLOSS_VERTEX_CHANNEL});
    #endif
    #ifdef STD_GLOSS_INVERT
    dGlossiness = 1.0 - dGlossiness;
    #endif
    dGlossiness = mix(dGlossiness, 0.75, gWet) + 0.0000001;
}
`
};

const ROCK_WGSL = {
    diffusePS: /* wgsl */`
uniform material_diffuse: vec3f;
uniform uSeaLevel: f32;
var<private> gWet: f32;
fn getAlbedo() {
    dAlbedo = uniform.material_diffuse.rgb;
    #ifdef STD_DIFFUSE_TEXTURE
        dAlbedo = dAlbedo * {STD_DIFFUSE_TEXTURE_DECODE}(textureSampleBias({STD_DIFFUSE_TEXTURE_NAME}, {STD_DIFFUSE_TEXTURE_NAME}Sampler, {STD_DIFFUSE_TEXTURE_UV}, uniform.textureBias)).{STD_DIFFUSE_TEXTURE_CHANNEL};
    #endif
    #ifdef STD_DIFFUSE_VERTEX
        dAlbedo = dAlbedo * saturate3(vVertexColor.{STD_DIFFUSE_VERTEX_CHANNEL});
    #endif
    gWet = 1.0 - smoothstep(0.4, 1.5, vPositionW.y - uniform.uSeaLevel);
    dAlbedo = dAlbedo * mix(1.0, 0.4, gWet) * mix(vec3f(1.0), vec3f(0.8, 0.92, 0.85), gWet * 0.5);
}
`,
    glossPS: /* wgsl */`
#ifdef STD_GLOSS_CONSTANT
    uniform material_gloss: f32;
#endif
fn getGlossiness() {
    dGlossiness = 1.0;
    #ifdef STD_GLOSS_CONSTANT
    dGlossiness = dGlossiness * uniform.material_gloss;
    #endif
    #ifdef STD_GLOSS_TEXTURE
    dGlossiness = dGlossiness * textureSampleBias({STD_GLOSS_TEXTURE_NAME}, {STD_GLOSS_TEXTURE_NAME}Sampler, {STD_GLOSS_TEXTURE_UV}, uniform.textureBias).{STD_GLOSS_TEXTURE_CHANNEL};
    #endif
    #ifdef STD_GLOSS_VERTEX
    dGlossiness = dGlossiness * saturate(vVertexColor.{STD_GLOSS_VERTEX_CHANNEL});
    #endif
    #ifdef STD_GLOSS_INVERT
    dGlossiness = 1.0 - dGlossiness;
    #endif
    dGlossiness = mix(dGlossiness, 0.75, gWet) + 0.0000001;
}
`
};

/**
 * Add the intertidal band to a scanned rock's material.
 *
 * @param {import('playcanvas').StandardMaterial} mat - Material from the glTF, modified in place.
 * @param {number} [seaLevel] - World Y of the sea.
 */
function applyRockWaterline(mat, seaLevel = 0) {
    mat.shaderChunks.version = '2.22';
    for (const [k, v] of Object.entries(ROCK_GLSL)) mat.shaderChunks.glsl.set(k, v);
    for (const [k, v] of Object.entries(ROCK_WGSL)) mat.shaderChunks.wgsl.set(k, v);
    mat.setParameter('uSeaLevel', seaLevel);
    mat.update();
}

/** Demo-owned height data raycast from the Blender delivery meshes. */
let sampleHeight = null;
function createHeightSampler(metadata, buffer) {
    const { origin, step, resolution, heightMin, heightRange } = metadata;
    if (!(step > 0) || resolution < 2 || buffer.byteLength !== resolution * resolution * 2)
        throw new Error('Invalid coast bathymetry');
    const samples = new DataView(buffer);
    const at = (x, z) => heightMin + samples.getUint16((z * resolution + x) * 2, true) * heightRange / 65535;
    return (x, z) => {
        const u = (x - origin[0]) / step, v = (z - origin[1]) / step;
        if (u < 0 || v < 0 || u > resolution - 1 || v > resolution - 1) return -50;
        const ix = Math.min(resolution - 2, Math.floor(u)), iz = Math.min(resolution - 2, Math.floor(v));
        const fx = u - ix, fz = v - iz;
        return (at(ix, iz) * (1-fx) + at(ix+1, iz) * fx) * (1-fz) +
            (at(ix, iz+1) * (1-fx) + at(ix+1, iz+1) * fx) * fz;
    };
}
function installBathymetry(metadata, buffer) { sampleHeight = createHeightSampler(metadata, buffer); }
function seabedHeight(x, z) {
    if (!sampleHeight) throw new Error('Load the authored coast before sampling its seabed');
    return sampleHeight(x, z);
}
async function loadBathymetry(base) {
    const [metadata, heights] = await Promise.all(['bathymetry.json', 'bathymetry.u16'].map(async file => {
        const response = await fetch(`${base}/${file}`);
        if (!response.ok) throw new Error(`Unable to load coast ${file}: ${response.status}`);
        return file.endsWith('.json') ? response.json() : response.arrayBuffer();
    }));
    installBathymetry(metadata, heights);
}

const ASSETS = `${"https://marklundin.github.io/water/"}demo/assets`;
const GROUND = {
  sand: { id: "coast_sand_01", tile: 3 },
  grass: { id: "coast_land_rocks_01", tile: 20 },
  rock: { id: "rock_face_03", tile: 2.7, arm: true }
  // only the rock's AO / roughness map is used
};
function loadAsset(app, asset) {
  return new Promise((resolve, reject) => {
    asset.once("load", () => resolve(asset));
    asset.once("error", (err) => reject(new Error(`${asset.name}: ${err}`)));
    app.assets.add(asset);
    app.assets.load(asset);
  });
}
async function loadGroundSet(app, { id, tile, arm: arm_ = false }, assets = ASSETS) {
  const tex = async (map, srgb) => {
    const a = await loadAsset(app, new Asset(
      `${id}_${map}`,
      "texture",
      { url: `${assets}/textures/${id}/${id}_${map}_2k.jpg` },
      { srgb, mipmaps: true, anisotropy: 4 }
    ));
    a.resource.addressU = ADDRESS_REPEAT;
    a.resource.addressV = ADDRESS_REPEAT;
    return a.resource;
  };
  const [albedo, normal, arm] = await Promise.all([tex("diffuse", true), tex("nor_gl", false), arm_ ? tex("arm", false) : null]);
  return { albedo, normal, arm, tile };
}
async function buildSeabed(app, device, seaLevel = 0, assets = ASSETS) {
  const [sand, grass, rock, coast] = await Promise.all([
    loadGroundSet(app, GROUND.sand, assets),
    loadGroundSet(app, GROUND.grass, assets),
    loadGroundSet(app, GROUND.rock, assets),
    loadAsset(app, new Asset("Authored coast", "container", { url: `${assets}/coast/coast.glb` })),
    loadBathymetry(`${assets}/coast`)
  ]);
  const mat = new StandardMaterial();
  mat.diffuse = new Color(1, 1, 1);
  mat.metalness = 0;
  mat.useMetalness = true;
  applyTerrain(mat, { sand, grass, rock, tileMetres: [sand.tile, grass.tile, rock.tile], seaLevel });
  const terrain = coast.resource.instantiateRenderEntity();
  terrain.name = "Authored coast";
  const rockMaterials = /* @__PURE__ */ new Set();
  for (const rc of terrain.findComponents("render")) {
    rc.castShadows = true;
    rc.receiveShadows = true;
    for (const mi of rc.meshInstances) {
      if (mi.material.name === "CoastTerrain") mi.material = mat;
      else rockMaterials.add(mi.material);
    }
  }
  for (const material2 of rockMaterials) applyRockWaterline(material2, seaLevel);
  app.root.addChild(terrain);
  const mats = { timber: material([0.3, 0.24, 0.17], 0.22), rust: material([0.36, 0.17, 0.1], 0.3) };
  for (const at of [[92, 62], [118, 30]])
    app.root.addChild(createPiles(device, at, seabedHeight(at[0], at[1]), mats));
  return { terrain, material: mat };
}
class Floaters {
  /**
   * @param {import('playcanvas').AppBase} app - The application.
   * @param {import('../src/index.js').Water} water - Water to float on.
   */
  constructor(app, water) {
    this.app = app;
    this.water = water;
    this.items = [];
    const mats = {
      hull: material([0.6, 0.1, 0.05], 0.42),
      hullB: material([0.78, 0.55, 0.06], 0.42),
      hullG: material([0.1, 0.42, 0.22], 0.42),
      rust: material([0.34, 0.16, 0.09], 0.28),
      steel: material([0.4, 0.42, 0.44], 0.55, 0.6),
      lamp: material([0.85, 0.88, 0.9], 0.8),
      timber: material([0.3, 0.24, 0.17], 0.22)
    };
    const specs = [
      { at: [-2, -2], scale: 1, hull: mats.hull },
      { at: [18, 31], scale: 0.85, hull: mats.hullG },
      { at: [80, 74], scale: 0.85, hull: mats.hullB },
      { at: [112, 48], scale: 0.7, hull: mats.hull }
    ];
    for (const spec of specs) {
      const root = createBuoy(app.graphicsDevice, spec.scale, { ...mats, hull: spec.hull });
      app.root.addChild(root);
      this.items.push({
        root,
        x: spec.at[0],
        z: spec.at[1],
        draft: 0,
        span: 1.1 * spec.scale,
        quat: new Quat()
      });
    }
    this._a = new Vec3();
    this._b = new Vec3();
    this._n = new Vec3();
    this._q = new Quat();
    this._up = new Vec3(0, 1, 0);
    this._axis = new Vec3();
  }
  /**
   * @param {number} dt - Frame delta time.
   */
  update(dt) {
    const w = this.water;
    const k = Math.min(1, dt * 6);
    for (const it of this.items) {
      const c = w.getSurfaceAt(it.x, it.z);
      const sx = w.getSurfaceAt(it.x + it.span, it.z);
      const sz = w.getSurfaceAt(it.x, it.z + it.span);
      const p = it.root.getPosition();
      const targetY = c.position.y - it.draft;
      it.root.setPosition(it.x, p.y + (targetY - p.y) * k, it.z);
      this._a.set(it.span, sx.position.y - c.position.y, 0);
      this._b.set(0, sz.position.y - c.position.y, it.span);
      this._n.cross(this._b, this._a).normalize();
      this._n.lerp(this._up, this._n, 0.55).normalize();
      const axis = this._axis.cross(this._up, this._n);
      const angle = Math.acos(Math.max(-1, Math.min(1, this._up.dot(this._n)))) * 180 / Math.PI;
      if (axis.length() > 1e-5) this._q.setFromAxisAngle(axis.normalize(), angle);
      else this._q.copy(Quat.IDENTITY);
      it.quat.slerp(it.quat, this._q, k);
      it.root.setRotation(it.quat);
    }
  }
}

/** Reveal a new study only after its lighting and at least two complete frames agree. */
class ShotTransition {
    constructor(element) {
        this.element = element;
        this.active = false;
        this.frames = 0;
        this.elapsed = 0;
    }
    begin() {
        this.active = true;
        this.frames = 0;
        this.elapsed = 0;
        this.element.classList.add('covered');
    }
    frame(dt, ready) {
        if (!this.active) return;
        this.elapsed += dt;
        this.frames = ready ? this.frames + 1 : 0;
        if (this.frames >= 3 && this.elapsed >= 0.18) {
            this.active = false;
            this.element.classList.remove('covered');
        }
    }
}

const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Gallery art direction. Each example owns a distinct visual question and a camera composition.
 * `intent` describes what should be legible in a render; it is deliberately not a water setting.
 * Stable ids also identify examples in URLs and render captures.
 */
const SHOTS = [
    {
        id: 'stillwater', name: 'Stillwater', preset: 'Glass',
        sub: 'Sheltered water · long reflections',
        intent: 'A quiet silver-blue surface, with reflected rock silhouettes and almost no whitecaps.',
        duration: 18,
        from: [-78, 3.3, 143], to: [-64, 2.6, 128],
        lookFrom: [-26, 0.5, 23], lookTo: [-22, 0.5, 16],
        focus: 115, focusRange: 180, blur: 0.5, fov: 44, drift: 0.2
    },
    {
        id: 'open-water', name: 'Open water', preset: 'Breeze',
        sub: 'Wind and swell · deep ocean',
        intent: 'Open horizon and layered blue wind waves; no coast or props to hide the wave field.',
        duration: 18,
        from: [-156, 6.0, 205], to: [-144, 4.2, 224],
        lookFrom: [-265, 1.5, 420], lookTo: [-258, 1.0, 438],
        focus: 80, focusRange: 180, blur: 0.5, fov: 48, drift: 0.5
    },
    {
        id: 'golden-hour', name: 'Glitter path', preset: 'Golden hour',
        sub: 'Low sun · amber light',
        intent: 'The low warm sun and a continuous, broken reflection path reach the waterline camera.',
        duration: 19,
        from: [-70, 2.4, 120], to: [-68, 2.4, 117],
        lookFrom: [32.6, 6.4, -161.7], lookTo: [34.6, 6.4, -164.7],
        focus: 100, focusRange: 180, blur: 0.5, fov: 44, drift: 0.15
    },
    {
        id: 'shallows', name: 'The turquoise shelf', preset: 'Tropical shallows',
        sub: 'Clear water · sand and caustics',
        intent: 'An elevated oblique view reads the sand-to-turquoise-to-deep-blue depth gradient.',
        duration: 20,
        from: [22, 58, 142], to: [36, 46, 119],
        lookFrom: [80, -2, 96], lookTo: [82, -2, 78],
        focus: 85, focusRange: 140, blur: 0.5, fov: 48, drift: 0.1
    },
    {
        id: 'beneath', name: 'Beneath the surface', preset: 'Tropical shallows',
        sub: "Snell's window · submerged light",
        intent: 'A bright window opens to the sky; beyond its edge, the surface reflects the sea back into itself.',
        duration: 16,
        from: [101, -2.8, 20], to: [106, -2.2, 29],
        lookFrom: [118, 5, 13], lookTo: [122, 4, 21],
        focus: 12, focusRange: 35, blur: 0.5, fov: 70, drift: 0.08
    },
    {
        id: 'caustics', name: 'Focused light', preset: 'Tropical shallows',
        sub: 'Refracted sunlight · moving caustics',
        intent: 'Curved ribbons of concentrated sunlight move across the sand. Toggle Caustics in Studio to compare the receiving surface.',
        duration: 18,
        from: [104, -0.9, 34], to: [108, -0.8, 30],
        lookFrom: [112, -5, 28], lookTo: [116, -5, 24],
        focus: 5, focusRange: 20, blur: 0.5, fov: 48, drift: 0.04
    },
    {
        id: 'weather', name: 'Heavy weather', preset: 'Storm',
        sub: 'Breaking crests · 22 m/s wind',
        intent: 'Strong wind raises steep, overlapping crests. Whitecaps linger against a hazy slate horizon.',
        duration: 18,
        from: [-148, 8, -104], to: [-144, 7, -120],
        lookFrom: [-420, 2, -120], lookTo: [-430, 2, -130],
        focus: 90, focusRange: 160, blur: 0.5, fov: 52, drift: 0.65
    },
    {
        id: 'adrift', name: 'Adrift', preset: 'Glass',
        sub: 'Buoyancy · reflected colour',
        intent: 'A close buoy provides metre-scale evidence of wave motion and coloured scene reflections.',
        duration: 18,
        from: [7, 2.2, 12], to: [3, 1.6, 9],
        lookFrom: [-2, 0.8, -2], lookTo: [-2, 0.8, -2],
        focus: 14, focusRange: 24, blur: 1.0, fov: 38, drift: 0.12
    },
    {
        id: 'blue-hour', name: 'Afterglow', preset: 'Afterglow',
        sub: 'After sunset · atmospheric light',
        intent: 'The sun has set, but the atmosphere still glows. Violet-blue reflections carry the shape of the sea.',
        duration: 18,
        from: [-190, 3.8, 150], to: [-175, 3.0, 168],
        lookFrom: [-136, 10, 351], lookTo: [-121, 9, 369],
        focus: 90, focusRange: 180, blur: 0.5, fov: 42, drift: 0.25
    }
];

/** Plays, pauses and seeks the demo's camera sequence without adding camera policy to Water. */
class Director {
    constructor({ camera, water, sky, cameraFrame, applyPreset, onShot }) {
        this.camera = camera;
        this.water = water;
        this.sky = sky;
        this.frame = cameraFrame;
        this.applyPreset = applyPreset;
        this.onShot = onShot;
        this.index = -1;
        this.t = 0;
        this.active = true;
        this.paused = false;
        this._pos = new Vec3();
        this._look = new Vec3();
        this.next();
    }

    /** Jump by index (wrapping) or stable shot id and immediately apply its starting pose. */
    go(shot) {
        const i = typeof shot === 'string' ? SHOTS.findIndex(s => s.id === shot) : shot;
        if (!Number.isInteger(i) || (typeof shot === 'string' && i < 0)) {
            throw new RangeError(`Unknown demo shot: ${shot}`);
        }
        this.index = ((i % SHOTS.length) + SHOTS.length) % SHOTS.length;
        this.t = 0;
        const s = SHOTS[this.index];
        this.applyPreset(this.water, this.sky, s.preset, this.frame);
        this.camera.camera.fov = s.fov;
        this._pose();
        this.onShot?.(s, this.index);
    }

    next() { this.go(this.index + 1); }
    prev() { this.go(this.index - 1); }
    release() { this.active = false; }
    resume() { this.active = true; this.paused = false; this.go(this.index); }

    /** Freeze the camera at a repeatable time within the current shot; water keeps simulating. */
    seek(seconds) {
        if (!Number.isFinite(seconds)) throw new TypeError('Shot time must be finite.');
        this.t = Math.max(0, Math.min(seconds, SHOTS[this.index].duration));
        this.paused = true;
        this._pose();
    }

    _pose() {
        const s = SHOTS[this.index];
        const u = smooth(Math.min(this.t / s.duration, 1));
        const p = this._pos.set(
            lerp(s.from[0], s.to[0], u),
            lerp(s.from[1], s.to[1], u),
            lerp(s.from[2], s.to[2], u)
        );
        const w = this.t, drift = s.drift ?? 0;
        p.x += (Math.sin(w * 0.31) * 0.5 + Math.sin(w * 0.11) * 0.9) * drift;
        p.y += Math.sin(w * 0.27 + 1.3) * 0.16 * drift;
        p.z += Math.cos(w * 0.23 + 0.7) * 0.5 * drift;
        this.camera.setPosition(p);
        this._look.set(
            lerp(s.lookFrom[0], s.lookTo[0], u),
            lerp(s.lookFrom[1], s.lookTo[1], u),
            lerp(s.lookFrom[2], s.lookTo[2], u)
        );
        this.camera.lookAt(this._look);
        Object.assign(this.frame.dof, {
            focusDistance: s.focus, focusRange: s.focusRange, blurRadius: s.blur
        });
        this.fade = this.paused ? 1 : Math.min(1, this.t / 1.2) * Math.min(1, (s.duration - this.t) / 2);
    }

    update(dt) {
        if (!this.active || this.paused) return;
        this.t += dt;
        if (this.t >= SHOTS[this.index].duration) { this.next(); return; }
        this._pose();
    }
}

/** Minimal fly camera: drag to look, WASD / QE to move, shift to sprint, wheel to change speed. */
class FlyCamera {
    constructor(app, entity) {
        this.app = app;
        this.entity = entity;
        this.speed = 12;
        this.keys = new Set();
        this.dragging = false;
        this.last = { x: 0, y: 0 };
        const e = entity.getEulerAngles();
        this.pitch = e.x;
        this.yaw = e.y;

        const canvas = app.graphicsDevice.canvas;
        canvas.addEventListener('pointerdown', (ev) => { if (ev.button === 0) { this.dragging = true; this.last = { x: ev.clientX, y: ev.clientY }; canvas.setPointerCapture(ev.pointerId); } });
        canvas.addEventListener('pointerup', () => { this.dragging = false; });
        canvas.addEventListener('pointermove', (ev) => {
            if (!this.dragging) return;
            const dx = ev.clientX - this.last.x, dy = ev.clientY - this.last.y;
            this.last = { x: ev.clientX, y: ev.clientY };
            this.yaw -= dx * 0.15;
            this.pitch = Math.max(-89, Math.min(89, this.pitch - dy * 0.15));
        });
        canvas.addEventListener('wheel', (ev) => { this.speed *= ev.deltaY > 0 ? 0.8 : 1.25; this.speed = Math.max(0.5, Math.min(500, this.speed)); }, { passive: true });
        window.addEventListener('keydown', (ev) => { if (!ev.target.closest('.lil-gui')) this.keys.add(ev.code); });
        window.addEventListener('keyup', (ev) => this.keys.delete(ev.code));
        window.addEventListener('blur', () => this.keys.clear());
        this._q = new Quat();
        this._v = new Vec3();
    }

    /** Adopt the entity's current orientation, so taking over from a scripted camera doesn't snap. */
    syncFrom(entity) {
        const e = entity.getEulerAngles();
        this.pitch = e.x;
        this.yaw = e.y;
    }

    update(dt) {
        const e = this.entity;
        e.setEulerAngles(this.pitch, this.yaw, 0);
        const k = this.keys;
        const s = this.speed * dt * (k.has('ShiftLeft') || k.has('ShiftRight') ? 4 : 1);
        const v = this._v.set(0, 0, 0);
        if (k.has('KeyW') || k.has('ArrowUp')) v.add(e.forward);
        if (k.has('KeyS') || k.has('ArrowDown')) v.sub(e.forward);
        if (k.has('KeyD') || k.has('ArrowRight')) v.add(e.right);
        if (k.has('KeyA') || k.has('ArrowLeft')) v.sub(e.right);
        if (k.has('KeyE')) v.y += 1;
        if (k.has('KeyQ')) v.y -= 1;
        if (v.length() > 0) e.translate(v.normalize().mulScalar(s));
    }
}

/** Small demo adapter: authored studies provide the look; these controls let visitors explore it. */
function buildGui({ water, sky, director, post, onReset }) {
    const panel = document.createElement('aside');
    panel.className = 'studio-panel';
    panel.setAttribute('aria-label', 'Studio');
    panel.hidden = true;
    panel.innerHTML = `<header><span>Studio</span><button type="button" class="studio-reset">Reset</button></header>`;
    const controls = [];
    const range = (name, min, max, step, read, write, format = v => String(v)) => {
        const label = document.createElement('label');
        label.className = 'studio-range';
        label.innerHTML = `<span>${name}<output></output></span><input type="range" min="${min}" max="${max}" step="${step}" aria-label="${name}">`;
        const input = label.querySelector('input'), output = label.querySelector('output');
        const refresh = () => { input.value = read(); output.textContent = format(read()); };
        input.addEventListener('input', () => { write(Number(input.value)); refresh(); });
        controls.push(refresh);
        panel.append(label);
    };
    range('Wind', 0, 28, 0.1, () => water.config.wind.speed, v => water.set({ wind: { speed: v } }), v => `${v.toFixed(1)} m/s`);
    range('Swell', 0, 1.5, .01, () => water.config.swell.strength, v => water.set({ swell: { strength: v } }), v => `${Math.round(v * 100)}%`);
    range('Clarity', 2, 40, 1, () => water.config.volume.visibility, v => water.set({ volume: { visibility: v } }), v => `${Math.round(v)} m`);
    const divider = document.createElement('hr'); panel.append(divider);
    range('Sun', -6, 70, .1, () => sky.params.sunElevation, v => sky.setParams({ sunElevation: v }), v => `${v.toFixed(1)}°`);
    range('Haze', 0, 6, .1, () => sky.params.haze, v => sky.setParams({ haze: v }), v => v.toFixed(1));
    const toggle = (name, read, write) => {
        const label = document.createElement('label'); label.className = 'studio-option';
        label.innerHTML = `<span>${name}</span><input type="checkbox" aria-label="${name}">`;
        const input = label.querySelector('input');
        input.addEventListener('change', () => write(input.checked));
        controls.push(() => { input.checked = read(); }); panel.append(label);
    };
    toggle('Caustics', () => water.config.caustics.enabled, v => water.set({ caustics: { enabled: v } }));
    toggle('Cinematic', () => post.cinematic, v => { post.cinematic = v; });
    const quality = document.createElement('label'); quality.className = 'studio-option';
    quality.innerHTML = `<span>Quality</span><select aria-label="Quality"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>`;
    const select = quality.querySelector('select');
    select.addEventListener('change', () => water.set({ quality: select.value }));
    controls.push(() => { select.value = water.config.quality; }); panel.append(quality);
    panel.querySelector('.studio-reset').addEventListener('click', () => { onReset(SHOTS[director.index]); controls.forEach(fn => fn()); });
    document.body.append(panel);
    return {
        refresh() { controls.forEach(fn => fn()); },
        show() { panel.hidden = false; },
        hide() { panel.hidden = true; },
        destroy() { panel.remove(); }
    };
}

async function mountGallery({ app: suppliedApp, cameraEntity, sunEntity, baseUrl = "https://marklundin.github.io/water/", query = location.search } = {}) {
  const canvas = suppliedApp?.graphicsDevice.canvas ?? document.getElementById("app");
  const params = new URLSearchParams(query);
  const el = (id) => document.getElementById(id);
  const requested = params.get("gfx");
  const deviceTypes = requested === "webgl2" ? [DEVICETYPE_WEBGL2] : requested === "webgpu" ? [DEVICETYPE_WEBGPU] : [DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2];
  const device = suppliedApp?.graphicsDevice ?? await createGraphicsDevice(canvas, { deviceTypes, antialias: false, alpha: false });
  device.maxPixelRatio = Math.min(window.devicePixelRatio, 2);
  const app = suppliedApp ?? new AppBase(canvas);
  const opts = new AppOptions();
  opts.graphicsDevice = device;
  opts.componentSystems = [RenderComponentSystem, CameraComponentSystem, LightComponentSystem, ScriptComponentSystem];
  opts.resourceHandlers = [TextureHandler, ContainerHandler];
  dracoInitialize({ jsUrl: `${baseUrl}demo/lib/draco/draco.wasm.js`, wasmUrl: `${baseUrl}demo/lib/draco/draco.wasm.wasm`, numWorkers: 2 });
  basisInitialize({ glueUrl: `${baseUrl}demo/lib/basis/basis.wasm.js`, wasmUrl: `${baseUrl}demo/lib/basis/basis.wasm.wasm`, fallbackUrl: `${baseUrl}demo/lib/basis/basis.js` });
  if (!suppliedApp) app.init(opts);
  app.setCanvasFillMode("FILL_WINDOW");
  app.setCanvasResolution("AUTO");
  window.addEventListener("resize", () => app.resizeCanvas());
  const camera = cameraEntity ?? new Entity("Camera");
  if (camera.camera) camera.removeComponent("camera");
  camera.addComponent("camera", {
    clearColor: new Color(0.02, 0.04, 0.08),
    nearClip: 0.25,
    farClip: 6e4,
    fov: 42
  });
  camera.camera.enabled = false;
  camera.setPosition(0, 6, 40);
  camera.lookAt(0, 1, 0);
  if (!camera.parent) app.root.addChild(camera);
  const fly = new FlyCamera(app, camera);
  if (!camera.script) camera.addComponent("script");
  const frame = camera.script.create(CinematicFrame);
  frame.rendering.renderFormat = "rgba16";
  frame.rendering.samples = 4;
  frame.rendering.sceneColorMap = true;
  frame.rendering.sceneDepthMap = true;
  frame.rendering.toneMapping = "aces2";
  frame.rendering.sharpness = 0.15;
  frame.bloom.enabled = true;
  frame.bloom.intensity = 0.022;
  frame.bloom.blurLevel = 7;
  frame.dof.enabled = false;
  frame.dof.nearBlur = true;
  frame.dof.highQuality = true;
  frame.dof.focusDistance = 14;
  frame.dof.focusRange = 7;
  frame.dof.blurRadius = 4;
  frame.vignette.enabled = true;
  frame.vignette.inner = 0.5;
  frame.vignette.outer = 1.35;
  frame.vignette.curvature = 0.7;
  frame.vignette.intensity = 0.22;
  frame.fringing.enabled = false;
  frame.fringing.intensity = 0.3;
  frame.grading.enabled = true;
  frame.colorEnhance.enabled = true;
  frame.colorEnhance.vibrance = 0.04;
  frame.colorEnhance.shadows = 0.02;
  frame.colorEnhance.highlights = -0.02;
  frame.taa.enabled = false;
  const post = { volumetric: false, cinematic: params.get("cinematic") !== "off" };
  const sky = new Sky(app);
  const sun = sunEntity ?? new Entity("Sun");
  if (sun.light) sun.removeComponent("light");
  sun.addComponent("light", {
    type: "directional",
    castShadows: true,
    shadowResolution: 2048,
    shadowDistance: 180,
    shadowBias: 0.2,
    normalOffsetBias: 0.05,
    shadowType: SHADOW_PCF3_32F,
    numCascades: 3
  });
  if (!sun.parent) app.root.addChild(sun);
  frame.volumetricFog.enabled = false;
  frame.volumetricFog.light = sun;
  frame.volumetricFog.density = 12e-4;
  frame.volumetricFog.heightBase = 0;
  frame.volumetricFog.heightFalloff = 0.08;
  frame.volumetricFog.extinction = 0;
  frame.volumetricFog.anisotropy = 0.84;
  frame.volumetricFog.intensity = 0.4;
  frame.volumetricFog.ambientIntensity = 0;
  frame.volumetricFog.maxDistance = 260;
  frame.volumetricFog.scale = 0.5;
  app.scene.fog.type = FOG_EXP2;
  app.scene.fog.color = new Color(0.45, 0.5, 0.55);
  app.scene.fog.density = 13e-5;
  const water = new Water(app, {
    quality: params.get("size") === "128" || params.get("mesh") === "low" ? "low" : params.get("size") === "512" ? "high" : "medium"
  });
  const _axis = new Vec3(), _up = new Vec3(0, 1, 0), _q = new Quat();
  const syncSun = () => {
    const d = sky.getSunDirection();
    _axis.cross(_up, d);
    const angle = Math.acos(Math.max(-1, Math.min(1, _up.dot(d)))) * 180 / Math.PI;
    if (_axis.length() > 1e-5) sun.setRotation(_q.setFromAxisAngle(_axis.normalize(), angle));
    else sun.setRotation(Quat.IDENTITY);
    const c = sky.getSunColor();
    const mx = Math.max(c.r, c.g, c.b, 1e-3);
    sun.light.color = new Color(c.r / mx, c.g / mx, c.b / mx);
    sun.light.intensity = mx;
    if (sky.ready) water.setEnvironment(sky.environment);
    frame.volumetricFog.tint.set(c.r / mx, c.g / mx, c.b / mx);
  };
  const horizon = new Color(0.45, 0.5, 0.55), zenith = new Color(0.2, 0.35, 0.6);
  const skyLayer = app.scene.layers.getLayerByName("Skybox");
  let lightingRevision = 0, lightingReady = null;
  sky.onUpdate = () => {
    syncSun();
    const revision = ++lightingRevision, settings = sky.params;
    Promise.all([sky.readHorizonColor(), sky.readZenithColor()]).then(([h, z]) => {
      if (revision !== lightingRevision) return;
      if (h) horizon.set(...h);
      if (z) zenith.set(...z);
      lightingReady = settings;
    });
  };
  syncSun();
  await buildSeabed(app, device, 0, `${baseUrl}demo/assets`);
  water.setShoreMap(bakeShoreMap(device, {
    origin: [-700, -700],
    size: [1600, 1600],
    heightAt: seabedHeight,
    maxDepth: 36,
    resolution: 512
  }));
  const floaters = new Floaters(app, water);
  const birds = new Birds(app, 7);
  const receivers = new Set(app.root.findComponents("render").flatMap((rc) => rc.meshInstances.map((mi) => mi.material)));
  for (const material of receivers) {
    if (material instanceof StandardMaterial) water.addReceiver(material);
  }
  const shotEl = el("shot");
  const dots = el("dots");
  SHOTS.forEach((s, i) => {
    const d = document.createElement("button");
    d.type = "button";
    d.title = s.intent || s.sub;
    d.setAttribute("aria-label", s.name);
    d.innerHTML = `<span class="num">${String(i + 1).padStart(2, "0")}</span><span class="label">${s.name}</span>`;
    d.addEventListener("click", () => {
      giveBack();
      director.go(i);
      if (params.has("still")) {
        director.seek(s.duration * 0.35);
        setPlayback(false);
      }
    });
    dots.appendChild(d);
  });
  const transition = new ShotTransition(el("study-transition"));
  app.on("frameend", () => transition.frame(1 / 60, lightingReady === sky.params));
  let gui;
  const director = new Director({
    camera,
    water,
    sky,
    cameraFrame: frame,
    applyPreset,
    onShot: (s, i) => {
      transition.begin();
      shotEl.querySelector(".idx").textContent = `Study ${String(i + 1).padStart(2, "0")} / ${String(SHOTS.length).padStart(2, "0")}`;
      shotEl.querySelector(".name").textContent = s.name;
      shotEl.querySelector(".sub").textContent = s.sub;
      shotEl.querySelector(".intent").textContent = s.intent || "";
      [...dots.children].forEach((d, j) => {
        d.classList.toggle("on", j === i);
        d.setAttribute("aria-current", j === i ? "true" : "false");
      });
      dots.children[i]?.scrollIntoView({ block: "nearest", inline: "nearest" });
      gui?.refresh(s.preset);
      if (params.get("caustics") === "off") water.set({ caustics: { enabled: false } });
      el("capture").textContent = "Capture";
    }
  });
  let manual = false;
  const takeControl = () => {
    if (manual) return;
    manual = true;
    birds.visible = false;
    director.release();
    document.body.classList.add("free");
    document.body.classList.remove("cinematic");
    el("hud-hint").textContent = "wasd / qe move · drag look · space return";
    fly.syncFrom(camera);
    el("fly-toggle").setAttribute("aria-pressed", "true");
    el("fly-toggle").textContent = "Return";
    el("play-toggle").textContent = "Play";
    el("play-toggle").setAttribute("aria-pressed", "true");
  };
  const giveBack = () => {
    if (!manual) return;
    manual = false;
    director.resume();
    document.body.classList.remove("free");
    document.body.classList.add("cinematic");
    el("hud-hint").textContent = "← → studies · space explore · h studio";
    el("fly-toggle").setAttribute("aria-pressed", "false");
    el("fly-toggle").textContent = "Explore";
    el("play-toggle").textContent = "Pause";
    el("play-toggle").setAttribute("aria-pressed", "false");
  };
  canvas.addEventListener("pointermove", (ev) => {
    if (ev.buttons) takeControl();
  });
  const MOVE_KEYS = /* @__PURE__ */ new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyQ",
    "KeyE",
    "ArrowUp",
    "ArrowDown"
  ]);
  const setPlayback = (playing) => {
    if (manual) giveBack();
    director.paused = !playing;
    el("play-toggle").textContent = playing ? "Pause" : "Play";
    el("play-toggle").setAttribute("aria-pressed", String(!playing));
    gui?.refresh();
  };
  gui = buildGui({
    water,
    sky,
    director,
    post,
    onReset: (shot) => {
      director.go(shot.id);
      director.seek(shot.duration * 0.35);
      setPlayback(false);
    }
  });
  gui.hide();
  let guiShown = false;
  const togglePanel = () => {
    guiShown = !guiShown;
    guiShown ? (gui.refresh(), gui.show()) : gui.hide();
    el("panel-toggle").setAttribute("aria-pressed", String(guiShown));
  };
  el("panel-toggle").addEventListener("click", togglePanel);
  el("fly-toggle").addEventListener("click", () => manual ? giveBack() : takeControl());
  el("play-toggle").addEventListener("click", () => setPlayback(director.paused || !director.active));
  const requestedShot = params.get("shot");
  if (requestedShot) {
    const index = SHOTS.findIndex((s) => s.id === requestedShot);
    if (index >= 0) director.go(index);
  }
  if (params.has("still")) {
    director.seek(SHOTS[director.index].duration * 0.35);
    setPlayback(false);
  }
  if (params.has("clean")) document.body.classList.add("clean");
  let capturePending = params.get("capture") || null;
  let renderedFrames = 0;
  el("capture").addEventListener("click", () => {
    capturePending = `study-${SHOTS[director.index].id}-${device.isWebGPU ? "webgpu" : "webgl2"}`;
    el("capture").textContent = "Saving…";
  });
  app.on("frameend", () => {
    renderedFrames++;
    if (!capturePending || renderedFrames < 90) return;
    const name = capturePending;
    capturePending = null;
    canvas.toBlob(async (blob) => {
      if (!blob) {
        el("capture").textContent = "Capture failed";
        return;
      }
      try {
        if (false) ; else {
          const url = URL.createObjectURL(blob), link = document.createElement("a");
          link.href = url;
          link.download = `${name}.png`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1e3);
        }
        el("capture").textContent = "Saved";
        document.body.dataset.captured = name;
      } catch (error) {
        console.error(error);
        el("capture").textContent = "Capture failed";
      }
    }, "image/png");
  });
  el("hud-backend").textContent = device.isWebGPU ? "WebGPU · compute FFT" : "WebGL2 · fragment FFT";
  const fpsEl = el("hud-fps");
  window.addEventListener("keydown", (ev) => {
    if (ev.target.closest?.(".studio-panel")) return;
    if (ev.code === "KeyH") togglePanel();
    else if (ev.code === "KeyP") setPlayback(director.paused);
    else if (ev.code === "Space") {
      ev.preventDefault();
      manual ? giveBack() : takeControl();
    } else if (ev.code === "ArrowRight" && !manual) director.next();
    else if (ev.code === "ArrowLeft" && !manual) director.prev();
    else if (MOVE_KEYS.has(ev.code)) takeControl();
  });
  let acc = 0, frames = 0;
  const buoyFocus = new Vec3(-2, 0.8, -2);
  app.on("update", (dt) => {
    const step = params.has("still") ? 1 / 60 : Math.min(dt, 0.05);
    if (!transition.active) director.update(step);
    if (manual) fly.update(dt);
    water.update(step, camera);
    floaters.update(step);
    birds.update(step, camera);
    const submerged = camera.getPosition().y < water.seaLevel;
    birds.visible = !manual && !submerged;
    const vol = water.config.volume;
    skyLayer.enabled = !submerged;
    if (submerged) {
      const ext = [3.2, 1, 0.6].map((e) => e / vol.visibility);
      const sunC = sky.getSunColor(), sunUp = Math.max(sky.getSunDirection().y, 0);
      const sc = vol.color;
      app.scene.fog.type = FOG_EXP;
      app.scene.fog.density = (ext[0] + ext[1] + ext[2]) / 3;
      const amb = (z, h) => (z * 0.65 + h * 0.35) * sky.params.exposure;
      app.scene.fog.color.set(
        sc[0] * (amb(zenith.r, horizon.r) + sunC.r * sunUp * 0.318),
        sc[1] * (amb(zenith.g, horizon.g) + sunC.g * sunUp * 0.318),
        sc[2] * (amb(zenith.b, horizon.b) + sunC.b * sunUp * 0.318)
      );
      camera.camera.clearColor.copy(app.scene.fog.color);
    } else {
      app.scene.fog.type = FOG_EXP2;
      app.scene.fog.density = sky.aerialDensity;
      app.scene.fog.color.copy(horizon);
    }
    const cinematic = post.cinematic;
    const closeFocus = cinematic && !manual && SHOTS[director.index]?.id === "adrift" && !submerged;
    frame.waterFocus = closeFocus;
    frame.seaLevel = water.seaLevel;
    frame.dof.enabled = closeFocus;
    if (closeFocus) {
      frame.dof.focusDistance = camera.getPosition().distance(buoyFocus);
      frame.dof.focusRange = 7;
      frame.dof.blurRadius = 4;
    }
    frame.bloom.enabled = cinematic;
    frame.bloom.blurLevel = 6;
    frame.vignette.enabled = cinematic;
    frame.vignette.intensity = 0.18;
    frame.colorEnhance.enabled = cinematic;
    frame.colorEnhance.vibrance = 0.035;
    frame.colorEnhance.shadows = -0.01;
    frame.colorEnhance.highlights = -0.035;
    frame.grading.enabled = cinematic;
    frame.rendering.sharpness = cinematic ? 0.03 : 0;
    frame.volumetricFog.enabled = post.volumetric;
    if (director.active) shotEl.classList.toggle("show", (director.fade ?? 0) > 0.5);
    else shotEl.classList.remove("show");
    acc += dt;
    frames++;
    if (acc > 0.5) {
      fpsEl.textContent = Math.round(frames / acc);
      acc = 0;
      frames = 0;
    }
  });
  window.__water = { app, water, sky, camera, device, frame, director };
  water.update(1 / 60, camera);
  camera.camera.enabled = true;
  if (!suppliedApp) app.start();
  let ready = 0;
  const reveal = () => {
    if (++ready < 12) {
      requestAnimationFrame(reveal);
      return;
    }
    el("loader").classList.add("gone");
    setTimeout(() => el("loader").remove(), 1e3);
  };
  requestAnimationFrame(reveal);
  return { app, water, sky, camera, sun, director };
}

const page = "<!doctype html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"utf-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n    <meta name=\"theme-color\" content=\"#080e14\" />\n    <meta name=\"description\" content=\"Nine real-time water and atmospheric scattering studies for PlayCanvas. Explore waves, reflections, caustics and underwater light.\" />\n    <title>Water — studies in light & motion</title>\n    <style>\n        :root { color-scheme:dark; --ui:'Helvetica Neue',Arial,sans-serif; --ink:#eef5f5; --muted:#9caeb5; }\n        * { box-sizing:border-box; }\n        html,body { margin:0; width:100%; height:100%; overflow:hidden; background:#080e14; font-family:var(--ui); color:var(--ink); }\n        canvas#app { display:block; width:100%; height:100%; touch-action:none; }\n        button { color:inherit; font:inherit; cursor:pointer; }\n        button:focus-visible,a:focus-visible { outline:2px solid #cffbf1; outline-offset:6px; }\n        .bar { position:fixed; left:0; right:0; height:0; background:#080d12; z-index:4; pointer-events:none; transition:height .6s; }\n        .bar.top { top:0; } .bar.bottom { bottom:0; }\n        body.cinematic .bar.top { height:62px; }\n        body.cinematic .bar.bottom { height:82px; }\n        #brand { position:fixed; left:34px; top:22px; z-index:6; display:flex; gap:22px; align-items:baseline; pointer-events:none; }\n        #brand .t { font-size:14px; letter-spacing:.34em; text-transform:uppercase; }\n        #brand .s { color:var(--muted); font-size:10px; letter-spacing:.13em; text-transform:uppercase; }\n        #toolbar { position:fixed; top:16px; right:30px; z-index:7; display:flex; align-items:center; gap:6px; }\n        #toolbar button,#toolbar a { border:0; background:transparent; font-size:10px; letter-spacing:.1em; padding:9px 12px; text-transform:uppercase; border-radius:2px; text-decoration:none; color:inherit; }\n        #toolbar a:hover,#toolbar button:hover,#toolbar button[aria-pressed=true] { background:#ffffff15; }\n        #shot { position:fixed; left:4vw; bottom:102px; z-index:6; max-width:430px; pointer-events:none; text-shadow:0 2px 20px #0009; transition:opacity .5s; }\n        #shot::before { content:\"\"; position:absolute; inset:-40px -60px -35px -4vw; background:radial-gradient(ellipse at bottom left,#000b,transparent 75%); z-index:-1; }\n        #shot .idx { font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:#e1edeea8; }\n        #shot .name { font-family:Georgia,'Times New Roman',serif; font-weight:400; font-size:clamp(32px,3.8vw,52px); line-height:1.12; letter-spacing:-.035em; margin:10px 0 12px; }\n        #shot .sub { font-size:11px; letter-spacing:.06em; color:#edf7f2c7; }\n        #shot .intent { font-size:12px; line-height:1.6; max-width:360px; color:#f3f8f4b3; margin-top:12px; }\n        #hud { position:fixed; right:34px; bottom:115px; z-index:6; text-align:right; font-size:9px; letter-spacing:.1em; text-transform:uppercase; color:#ffffffa6; text-shadow:0 1px 8px #000; pointer-events:none; line-height:1.9; }\n        #hud b { font-weight:400; }\n        #dots { overflow-x:auto; scrollbar-width:none; position:fixed; bottom:0; left:30px; right:30px; height:82px; z-index:6; display:flex; align-items:stretch; gap:2px; }\n        #dots button { flex:1 0 108px; min-width:max-content; border:0; border-top:1px solid #ffffff14; background:transparent; text-align:left; padding:17px 12px 14px; color:#9fafb6; transition:color .2s,background .2s; }\n        #dots .num { display:block; font-size:9px; letter-spacing:.1em; opacity:.6; margin-bottom:7px; }\n        #dots .label { display:block; font-size:11px; white-space:nowrap; }\n        #dots button:hover { color:#fff; background:#ffffff06; }\n        #dots button.on { color:#e9f9f5; border-top-color:#bdede1; }\n        body.free #shot,body.free #dots { opacity:0; pointer-events:none; }\n        body.free #brand .s { display:none; }\n        body.free #hud { bottom:25px; }\n        body.clean #brand,body.clean #toolbar,body.clean #shot,body.clean #dots,body.clean #hud,body.clean .bar { visibility:hidden; }\n        #study-transition { position:fixed; inset:0; z-index:5; pointer-events:none; background:#080e14; opacity:0; transition:opacity .3s; }\n        #study-transition.covered { opacity:1; transition:none; }\n        #loader { position:fixed; inset:0; z-index:20; background:#080e14; display:grid; place-items:center; transition:opacity .8s; }\n        #loader.gone { opacity:0; pointer-events:none; }\n        #loader .w { text-align:center; }\n        #loader .t { font:30px Georgia,serif; letter-spacing:-.02em; }\n        #loader p { font-size:10px; color:var(--muted); letter-spacing:.16em; text-transform:uppercase; margin-top:16px; }\n        #loader .l { width:180px; height:1px; background:#ffffff12; margin:24px auto; overflow:hidden; }\n        #loader .l s { display:block; height:100%; width:40%; background:#bbdbd4; animation:sweep 1.2s ease-in-out infinite; }\n        @keyframes sweep { from { transform:translateX(-100%); } to { transform:translateX(350%); } }\n        #err { position:fixed; inset:0; z-index:30; margin:0; padding:6vh 6vw; background:#0a0d12; color:#ffb1a9; font:12px/1.6 monospace; white-space:pre-wrap; overflow:auto; display:none; }\n        .studio-panel { position:fixed; z-index:10; top:72px; right:24px; width:248px; max-height:calc(100dvh - 165px); overflow:auto; padding:18px 20px; background:#101a22ed; border:1px solid #ffffff15; border-radius:8px; box-shadow:0 18px 60px #0005; backdrop-filter:blur(18px); font-size:12px; }\n        .studio-panel[hidden] { display:none; }\n        .studio-panel header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; font-size:13px; }\n        .studio-reset { border:0; background:none; color:#9db7bc; font-size:11px; padding:0; }\n        .studio-range { display:block; margin:16px 0; }\n        .studio-range > span { display:flex; justify-content:space-between; margin-bottom:8px; }\n        .studio-range output { font-variant-numeric:tabular-nums; color:#8ea9b2; font-size:11px; }\n        .studio-panel input[type=range] { width:100%; height:3px; margin:0; accent-color:#b3dcd3; cursor:pointer; }\n        .studio-panel hr { border:0; border-top:1px solid #ffffff12; margin:21px 0; }\n        .studio-option { display:flex; align-items:center; justify-content:space-between; min-height:34px; }\n        .studio-option input { accent-color:#b3dcd3; width:15px; height:15px; }\n        .studio-option select { font:inherit; font-size:11px; color:#b3dcd3; background:#1a2932; border:0; border-radius:3px; padding:5px; }\n        body.clean .studio-panel { visibility:hidden; }\n        @media(max-width:1050px) { #brand { left:20px; } #brand .s { display:none; } #toolbar { right:8px; } #toolbar button,#toolbar a { padding:9px 8px; } #dots { left:12px; right:12px; overflow:auto; } #dots button { min-width:96px; } #shot { left:24px; bottom:102px; max-width:70vw; } #shot .intent { display:none; } #hud { right:22px; bottom:99px; font-size:8px; } }\n        @media(max-width:580px) { #capture,#toolbar a { display:none; } }\n        @media(prefers-reduced-motion:reduce) { * { transition:none!important; } }\n    </style>\n</head>\n<body class=\"cinematic\">\n    <canvas id=\"app\" aria-label=\"Animated ocean and atmospheric sky\"></canvas>\n    <div class=\"bar top\"></div><div class=\"bar bottom\"></div>\n    <div id=\"study-transition\" aria-hidden=\"true\"></div>\n    <div id=\"brand\"><div class=\"t\">Water</div><div class=\"s\">Studies in light & motion</div></div>\n    <div id=\"toolbar\" aria-label=\"Demo controls\">\n        <a href=\"./demo/sky.html\">Atmosphere ↗</a>\n        <a href=\"https://github.com/marklundin/water\" target=\"_blank\" rel=\"noopener noreferrer\">GitHub ↗</a>\n        <a id=\"editor-link\" href=\"https://playcanvas.com/editor/scene/2591939\" target=\"_blank\" rel=\"noopener noreferrer\">Editor ↗</a>\n        <button id=\"play-toggle\" type=\"button\" aria-pressed=\"false\">Pause</button>\n        <button id=\"fly-toggle\" type=\"button\" aria-pressed=\"false\">Explore</button>\n        <button id=\"panel-toggle\" type=\"button\" aria-pressed=\"false\">Studio</button>\n        <button id=\"capture\" type=\"button\" title=\"Save the current render\">Capture</button>\n    </div>\n    <nav id=\"dots\" aria-label=\"Water studies\"></nav>\n    <div id=\"shot\"><div class=\"idx\"></div><div class=\"name\"></div><div class=\"sub\"></div><div class=\"intent\"></div></div>\n    <div id=\"hud\"><span id=\"hud-backend\"></span> · <b id=\"hud-fps\">–</b> fps<br><span id=\"hud-hint\">← → studies · space explore · h studio</span></div>\n    <div id=\"loader\"><div class=\"w\"><div class=\"t\">Building the sea.</div><p>Waves · atmosphere · light</p><div class=\"l\"><s></s></div></div></div>\n    <pre id=\"err\" role=\"alert\"></pre>\n    <script type=\"module\" src=\"/demo/start.js\"></script>\n</body>\n</html>\n";

/** The gallery application, separate from the reusable water and atmosphere components. */
export class WaterGallery extends Script {
    static scriptName = 'waterGallery';

    /**
     * @attribute
     * @type {Entity}
     */
    cameraEntity;

    /**
     * @attribute
     * @type {Entity}
     */
    sunEntity;

    /**
     * Root URL of the published demo assets, ending in a slash.
     * @attribute
     * @type {string}
     */
    assetRoot = 'https://marklundin.github.io/water/';

    /**
     * Initial study: stillwater, open-water, golden-hour, shallows, beneath, caustics, weather, adrift or blue-hour.
     * @attribute
     * @type {string}
     */
    study = 'stillwater';

    initialize() {
        // Runs inside the Editor's existing application and canvas. No iframe or second engine.
        // The coast, bathymetry and material maps use the same published files as the website.
        const template = new DOMParser().parseFromString(page, 'text/html');
        template.querySelectorAll('canvas, script').forEach(element => element.remove());
        template.querySelector('a[href="./demo/sky.html"]').href = `${this.assetRoot}demo/sky.html`;
        const style = document.createElement('style');
        style.textContent = template.querySelector('style').textContent;
        document.head.append(style);
        const overlay = document.createElement('div');
        overlay.id = 'water-gallery';
        overlay.innerHTML = template.body.innerHTML;
        document.body.append(overlay);
        document.body.classList.add('cinematic');
        const query = new URLSearchParams(location.search);
        if (!query.has('shot')) query.set('shot', this.study);
        this.ready = mountGallery({
            app: this.app,
            cameraEntity: this.cameraEntity,
            sunEntity: this.sunEntity,
            baseUrl: this.assetRoot.replace(/\/?$/, '/'),
            query: query.toString()
        }).then(gallery => {
            this.gallery = gallery;
            this.fire('gallery:ready', gallery);
            return gallery;
        }).catch(error => {
            console.error(error);
            const box = overlay.querySelector('#err');
            box.style.display = 'block';
            box.textContent = error.stack || String(error);
            overlay.querySelector('#loader')?.remove();
        });
        this.app.once('destroy', () => { overlay.remove(); style.remove(); });
    }
}

