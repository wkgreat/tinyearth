//scene.module.wgsl

#include "dfloat.module.wgsl"

struct Camera {
    eye: vec4f,
    center: vec4f,
    up: vec4f,
    viewmtx: mat4x4f,
    viewmtrxInv: mat4x4f,
    relviewmtx: mat4x4f,
    relviewmtxInv: mat4x4f,
    height: f32
};

struct Projection {
    near: f32,
    far: f32,
    projmtx: mat4x4f,
    projmtxInv: mat4x4f
};

struct Sun {
    position: vec3f,
    color: vec4f
};

struct Model {
    modelmtx: mat4x4f
};

struct Viewport {
    viewport: vec2f,
    viewportmtx: mat4x4f
};

struct Depth {
    logDepthC: f32,
    neardepth: f32,
    fardepth: f32
}

struct Scene {
    camera: Camera,
    projection: Projection,
    sun: Sun,
    model: Model,
    viewport: Viewport,
    depth: Depth
};

struct CameraDF {
    eye: dfvec4,
    center: dfvec4,
    up: dfvec4,
    viewmtx: dfmat4,
    viewmtxInv: dfmat4,
    relviewmtx: dfmat4,
    relviewmtxInv: dfmat4,
    height: dfloat
};

struct ProjectionDF {
    near: dfloat,
    far: dfloat,
    projmtx: dfmat4,
    projmtxInv: dfmat4
};

struct SunDF {
    position: dfvec3,
    color: vec4f
};

struct ModelDF {
    modelmtx: dfmat4
};

struct ViewportDF {
    viewport: dfvec2,
    viewportmtx: dfmat4,
}

struct DepthDF {
    logDepthC: dfloat,
    neardepth: f32,
    fardepth: f32
}

struct SceneDF {
    camera: CameraDF,
    projection: ProjectionDF,
    sun: SunDF,
    model: ModelDF,
    viewport: ViewportDF,
    depth: DepthDF
};

fn relative(pos: vec3f) -> vec3f {
    return pos - scene.camera.eye.xyz;
}

fn absolute(pos: vec3f) -> vec3f {
    return pos + scene.camera.eye.xyz;
}

fn relativeDF(pos: dfvec3) -> dfvec3 {
    return dfvec3_sub(pos, dfvec4_force3(sceneDF.camera.eye));
}

fn absoluteDF(pos: dfvec3) -> dfvec3 {
    return dfvec3_add(pos, dfvec4_force3(sceneDF.camera.eye));
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(0) @binding(1) var<uniform> sceneDF : SceneDF;
