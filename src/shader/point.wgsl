#include "scene.module.wgsl"

#include "spheriod.module.wgsl"

#include "depth.module.wgsl"

struct VSInput {
    @location(0) quadpos: vec2f,
    @location(1) quaduv: vec2f,
    @location(2) pointpos: vec3f,
    @location(3) pointpos_high: vec3f,
    @location(4) pointpos_low: vec3f,
    @location(5) color: vec4f,
    @location(6) size: f32,
    @location(7) stroke: u32,
    @location(8) strokewidth: f32,
    @location(9) strokecolor: vec4f
};

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) quadpos: vec4f,
    @location(1) quaduv: vec2f,
    @location(2) center: vec4f,
    @location(3) size: f32,
    @location(4) color: vec4f,
    @location(5) strokewidth: f32,
    @location(6) strokecolor: vec4f,
    @location(7) relviewz_high: f32,
    @location(8) relviewz_low: f32
};

struct ClampToGround {
    isEnabled: u32,
    offset: f32
};

@group(1) @binding(0) var<uniform> clampToGround : ClampToGround;

@vertex fn vs(input: VSInput) -> VSOutput {

    var output: VSOutput;

    var worldpointpos = dfvec3(input.pointpos_high, input.pointpos_low);

    if(clampToGround.isEnabled > 0u) {
        worldpointpos = clamp_to_ground_df(worldpointpos, SPHERIOD_WGS84_df, df(clampToGround.offset));
    }

    let relworldpointpos = dfv3t4(relativeDF(worldpointpos), df(1.0));
    var relviewpointpos = dfvec4_mul(sceneDF.camera.relviewmtx, relworldpointpos);
    relviewpointpos = dfvec4_normw(relviewpointpos);
    let ndcpointpos: vec4f = dfvec4_out(dfvec4_normw(dfvec4_mul(sceneDF.projection.projmtx, relviewpointpos)));
    let ndcpointpos2d = ndcpointpos.xy;
    let quadpos2d: vec2f = ndcpointpos2d + input.quadpos / scene.viewport.viewport * vec2f(input.size, input.size);
    let quadpos: vec4f = vec4f(quadpos2d, ndcpointpos.zw);

    output.position = quadpos;
    output.quadpos = quadpos;
    output.quaduv = input.quaduv;
    output.center = ndcpointpos;
    output.size = input.size;
    output.color = input.color;
    output.strokewidth = input.strokewidth;
    output.strokecolor = input.strokecolor;
    output.relviewz_high = dfvec4_z(relviewpointpos).high;
    output.relviewz_low = dfvec4_z(relviewpointpos).low;

    return output;

}

fn isStroke(size: f32, strokewidth: f32, radius: f32) -> f32 {
    let r = radius + strokewidth - (size / 2);
    return step(0.0, r);
}

struct FSOutput {
    @location(0) color : vec4<f32>,
    @builtin(frag_depth) depth : f32
};

@fragment fn fs(input: VSOutput) -> FSOutput {

    let radius: f32 = length((input.quadpos.xy - input.center.xy) * scene.viewport.viewport); // in pixel
    if(radius >= input.size / 2) {
        discard;
    }
    var output: FSOutput;

    //color
    let stroke = isStroke(input.size, input.strokewidth, radius);
    let color = mix(input.color, input.strokecolor, stroke);

    var viewz: dfloat;

    if(clampToGround.isEnabled > 0u) {

        var worldpos = dfvec4_mul(dfmat4_mul(sceneDF.camera.relviewmtxInv, sceneDF.projection.projmtxInv), dfv4(input.quadpos));
        worldpos = dfvec4_normw(worldpos);
        var worldpos3d = absoluteDF(dfvec4_force3(worldpos));
        worldpos3d = clamp_to_ground_df(worldpos3d, SPHERIOD_WGS84_df, df(clampToGround.offset));
        worldpos3d = relativeDF(worldpos3d);
        var viewpos = dfvec4_mul(sceneDF.camera.relviewmtx, dfv3t4(worldpos3d, df(1.0)));
        viewpos = dfvec4_normw(viewpos);
        viewz = dfvec4_z(viewpos);

    } else {
        viewz = dfloat(input.relviewz_high, input.relviewz_low);
    }
    //TODO check if log depth
    let depth = dfloat_out(frag_depth_log_df(sceneDF.depth.logDepthC, sceneDF.projection.near, sceneDF.projection.far, viewz));
    
    output.color = color;
    output.depth = depth;
    return output;  

}

