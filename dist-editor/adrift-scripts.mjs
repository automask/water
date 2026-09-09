import { Script, CameraFrame as CameraFrame$1, Color, PIXELFORMAT_111110F, TONEMAP_LINEAR, PIXELFORMAT_RGBA8, PIXELFORMAT_RGBA16F, PIXELFORMAT_RGBA32F, TONEMAP_FILMIC, TONEMAP_HEJL, TONEMAP_ACES, TONEMAP_ACES2, TONEMAP_NEUTRAL, FramePassCameraFrame, ShaderUtils, SEMANTIC_POSITION, PROJECTION_PERSPECTIVE, Vec3, Quat, ADDRESS_REPEAT, StandardMaterial } from 'playcanvas';

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

