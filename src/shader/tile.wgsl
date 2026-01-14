//tile.wgsl

#include "dfloat.module.wgsl"

#include "spheriod.module.wgsl"

#include "scene.module.wgsl"

#include "depth.module.wgsl"

#include "color.module.wgsl"

override ENABLE_LOG_DEPTH : bool = true;

struct TileUniform {
    opacity: f32,
    enableNight: u32,
    isNight: u32
};

@group(1) @binding(0) var image: texture_2d<f32>;
@group(1) @binding(1) var theSampler: sampler;
@group(1) @binding(2) var<uniform> tileUniform: TileUniform;

struct VSInput {
    @location(0) position: vec3f,
    @location(1) position_high: vec3f,
    @location(2) position_low: vec3f,
    @location(3) texcoord: vec2f,
    @location(4) normal: vec3f,
    @location(5) normal_high: vec3f,
    @location(6) normal_low: vec3f
};

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) depth: f32,
    @location(1) texcoord: vec2f,
    @location(2) normal: vec3f,
    @location(3) relworldpos: vec3f,
    @location(4) relviewz_high: f32,
    @location(5) relviewz_low: f32,
    @location(6) needskip: f32
};

@vertex fn vs(input: VSInput) -> VSOutput {

    var output: VSOutput;

    let relworldpos = dfvec3_force4(dfvec3_sub(dfvec3(input.position_high, input.position_low), dfvec4_force3(sceneDF.camera.eye)), df(1.0));
    let relviewpos = dfvec4_mul(sceneDF.camera.relviewmtx, relworldpos);
    let relndcpos = dfvec4_mul(sceneDF.projection.projmtx, relviewpos);
    output.needskip = 1.0 - step(0.0, dfloat_out(dfvec4_w(relndcpos)));
    let normal = dfvec3(input.normal_high, input.normal_low);

    let relndcposVec4f = dfvec4_out(relndcpos);

    output.position = relndcposVec4f;

    output.depth = relndcposVec4f.z / relndcposVec4f.w;

    output.relworldpos = dfvec3_out(dfvec4_force3(relworldpos));

    output.texcoord = input.texcoord;
    
    output.normal = dfvec3_out(dfvec3_normalize(normal));

    let rvz = dfvec4_z(relviewpos);
    output.relviewz_high = rvz.high;
    output.relviewz_low = rvz.low;

    return output;

}

fn surfanceColor(texcolor: vec4f, location: vec3f, norm: vec3f, cameraPosition: vec3f, light: Sun) -> vec4f {

    let vlight = normalize(light.position - location);
    let vsight = normalize(cameraPosition - location);
    let vhalf = normalize(vlight + vsight);
    var color = vec3f(0, 0, 0);
    let ds = vec3f(texcolor.rgb);
    color += ds * vec3f(light.color.rgb) * max(0.1f, dot(norm, vlight));
    let ks = vec3f(0.5f, 0.5f, 0.5f);
    let shininess = 100.0f;
    color += ks * vec3f(light.color.rgb) * pow(max(0.0f, dot(norm, vhalf)), shininess);
    return vec4f(color, 1.0f);
}

fn nightSurfaceColor(texcolor: vec4f, location: vec3f, norm: vec3f, cameraPosition: vec3f, light: Sun) -> vec4f {
    let vlight = normalize(light.position - location);
    var color = vec3f(0, 0, 0);
    let ds = vec3f(texcolor.rgb);
    color += ds * vec3f(light.color.rgb) * max(0.0f, -dot(norm, vlight));
    let x: f32 = -dot(norm, vlight);

    let a: f32 = max(0.0f, x);

    return vec4f(color, a);
}

struct FSOutput {
    @location(0) color : vec4<f32>,
    @builtin(frag_depth) depth : f32
};

@fragment fn fs(input: VSOutput) -> FSOutput {

    if(input.needskip > 0.0) {
        discard;
    }

    var output: FSOutput;

    let pos: vec3f = input.relworldpos;
    let eye: vec3f = vec3<f32>(0.0,0.0,0.0);
    let norm: vec3f = input.normal;

    var texcolor: vec4f = vec4(0, 0, 0, 1);
    texcolor = textureSample(image, theSampler, input.texcoord);

    var fragcolor: vec4f = vec4f(0,0,0,1);
    var fragdepth: f32 = 1.0;

    if(tileUniform.enableNight != 0u) {
        if(tileUniform.isNight != 0u) {
            fragcolor = nightSurfaceColor(texcolor, pos, norm, eye, scene.sun);
        } else {
            fragcolor = surfanceColor(texcolor, pos, norm, eye, scene.sun);
        }
    } else {
        fragcolor = texcolor;
    }

    if(ENABLE_LOG_DEPTH) {
        let rvz = dfloat(input.relviewz_high, input.relviewz_low);
        fragdepth = dfloat_out(frag_depth_log_df(sceneDF.depth.logDepthC, sceneDF.projection.near, sceneDF.projection.far, rvz));
    } else {
        fragdepth = input.depth;
    }


    output.color = fragcolor;
    output.depth = fragdepth;

    return output;

}