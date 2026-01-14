// wideLineString.wgsl

#include "dfloat.module.wgsl"

#include "color.module.wgsl"

#include "spheriod.module.wgsl"

#include "scene.module.wgsl"

#include "depth.module.wgsl"

override ENABLE_LOG_DEPTH : bool = true;

struct ClampToGround {
    isEnabled: u32,
    offset: f32
};

@group(1) @binding(0) var<uniform> clampToGround : ClampToGround;

struct VSInput {
    @location(0) lastpos: vec4f,
    @location(1) nextpos: vec4f,
    @location(2) position: vec4f,
    @location(3) lastpos_high: vec3f,
    @location(4) lastpos_low: vec3f,
    @location(5) nextpos_high: vec3f,
    @location(6) nextpos_low: vec3f,
    @location(7) position_high: vec3f,
    @location(8) position_low: vec3f,
    @location(9) side: f32,
    @location(10) entityid: f32,
    @location(11) color: vec4f,
    @location(12) linewidth: f32,
    @location(13) normlen: f32
};

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) depth: f32,
    @location(1) relworldpos_high: vec4f,
    @location(2) relworldpos_low: vec4f,
    @location(3) relviewpos_high: vec4f,
    @location(4) relviewpos_low: vec4f,
    @location(5) entityid: f32,
    @location(6) color: vec4f
};

const leftRot90: mat2x2f = mat2x2f(
    0.0, -1.0,
    1.0, 0.0
);
const rightRot90: mat2x2f = mat2x2f(
    0.0, 1.0,
    -1.0, 0.0
);

@vertex
fn vs(input:VSInput) -> VSOutput {

    var output: VSOutput;

    var worldpos = dfv3t4(dfvec3(input.position_high, input.position_low), df(1.0)); 
    var last_worldpos = dfv3t4(dfvec3(input.lastpos_high, input.lastpos_low), df(1.0));
    var next_worldpos = dfv3t4(dfvec3(input.nextpos_high, input.nextpos_low), df(1.0));

    if(clampToGround.isEnabled > 0u) {
        worldpos = dfv3t4(clamp_to_ground_df(dfv4t3(worldpos), SPHERIOD_WGS84_df, df(clampToGround.offset)), df(1.0));
        last_worldpos = dfv3t4(clamp_to_ground_df(dfv4t3(last_worldpos), SPHERIOD_WGS84_df, df(clampToGround.offset)), df(1.0));
        next_worldpos = dfv3t4(clamp_to_ground_df(dfv4t3(next_worldpos), SPHERIOD_WGS84_df, df(clampToGround.offset)), df(1.0));
    }

    let relworldpos = dfv3t4(relativeDF(dfv4t3(worldpos)), df(1.0));
    let last_relworldpos = dfv3t4(relativeDF(dfv4t3(last_worldpos)), df(1.0));
    let next_relworldpos = dfv3t4(relativeDF(dfv4t3(next_worldpos)), df(1.0));

    let spv = dfmat4_mul(sceneDF.viewport.viewportmtx, dfmat4_mul(sceneDF.projection.projmtx, sceneDF.camera.relviewmtx));

    var relndspos = dfvec4_mul(spv, relworldpos);
    relndspos = dfvec4_normabsw(relndspos); // p /= abs(p.w) if the position is behind the camera, w will small than zero!

    var last_relndspos = dfvec4_mul(spv, last_relworldpos);
    last_relndspos = dfvec4_normabsw(last_relndspos); // p /= abs(p.w)  if the position is behind the camera, w will small than zero!

    var next_relndspos = dfvec4_mul(spv, next_relworldpos);
    next_relndspos = dfvec4_normabsw(next_relndspos);  // p /= abs(p.w)  if the position is behind the camera, w will small than zero!

    var ld = dfvec2_out(dfvec2_sub(dfvec4_force2(last_relndspos), dfvec4_force2(relndspos)));
    var nd = dfvec2_out(dfvec2_sub(dfvec4_force2(next_relndspos), dfvec4_force2(relndspos)));
    var d: vec2f;

    var w = input.linewidth;

    let minRes = 1.0;

    if(length(ld) < minRes && length(nd) < minRes) {
        d = vec2f(0.0, 0.0);
    } else if(length(ld) < minRes) {
        d = normalize(rightRot90 * normalize(nd));
    } else if(length(nd) < minRes) {
        d = normalize(leftRot90 * normalize(ld));    
    } else {
        ld = normalize(ld);
        nd = normalize(nd);
        if(abs(dot(ld,nd)) >= 0.95) {
            d = normalize(rightRot90 * normalize(nd));
        } else {
            let rd = normalize(rightRot90 * normalize(nd));
            w = input.linewidth / sin(acos(dot(ld,nd)) / 2.0);
            d = normalize(ld + nd);
            d = (2.0 * step(0.0, dot(d, rd)) - 1.0) * d; // dot(d, rd)) >= 0.0 d esle -d
        }
    }

    let offset = input.side * w * d;

    let newp = vec4(dfvec2_out(dfvec4_force2(relndspos)) + offset, dfloat_out(dfvec4_z(relndspos)), 1.0);
    let new_ndspos = dfv4(newp);

    let new_ndcpos = dfvec4_normw(dfvec4_mul(dfmat4_inv(sceneDF.viewport.viewportmtx), new_ndspos));

    let new_viewpos = dfvec4_normw(dfvec4_mul(dfmat4_inv(sceneDF.projection.projmtx), new_ndcpos));

    let new_worldpos = dfvec4_normw(dfvec4_mul(dfmat4_inv(sceneDF.camera.relviewmtx), new_viewpos));

    let new_ndcpos_vec4f = dfvec4_out(new_ndcpos);

    output.position = new_ndcpos_vec4f;
    output.depth = new_ndcpos_vec4f.z;
    output.relviewpos_high = new_viewpos.high;
    output.relviewpos_low = new_viewpos.low;
    output.relworldpos_high = new_worldpos.high;
    output.relworldpos_low = new_worldpos.low;
    output.entityid = input.entityid;
    output.color = input.color;

    return output;

}

struct FSOutput {
    @location(0) color : vec4<f32>,
    @builtin(frag_depth) depth : f32
};

@fragment
fn fs(input: VSOutput) -> FSOutput {

    // entityid is not integer, means this pixel is between two entites, need discard
    if(abs(fract(input.entityid)) > 1E-5) { 
        discard;
    } 

    var output: FSOutput;

    if(clampToGround.isEnabled > 0u) {
        let relworldpos = dfvec4(input.relworldpos_high, input.relworldpos_low);
        let worldpos = relativeDF(clamp_to_ground_df(absoluteDF(dfv4t3(relworldpos)), SPHERIOD_WGS84_df, df(clampToGround.offset)));
        if(ENABLE_LOG_DEPTH) {
            var viewpos =  dfvec4(input.relviewpos_high, input.relviewpos_low);
            viewpos = dfvec4_normw(dfvec4_mul(sceneDF.camera.relviewmtx, dfv3t4(worldpos, df(1.0))));
            output.depth = dfloat_out(frag_depth_log_df(sceneDF.depth.logDepthC, sceneDF.projection.near, sceneDF.projection.far, dfvec4_z(viewpos)));
        } else {    
            let spv: dfmat4 = dfmat4_mul(sceneDF.viewport.viewportmtx, dfmat4_mul(sceneDF.projection.projmtx, sceneDF.camera.relviewmtx));
            let ndspos = dfvec4_normw(dfvec4_mul(spv, dfv3t4(worldpos, df(1.0))));
            output.depth = dfloat_out(dfvec4_z(ndspos));
        }
    } else {
        
        if(ENABLE_LOG_DEPTH) {
            let relviewpos = dfvec4(input.relviewpos_high, input.relviewpos_low);
            output.depth = dfloat_out(frag_depth_log_df(sceneDF.depth.logDepthC, sceneDF.projection.near, sceneDF.projection.far, dfvec4_z(relviewpos)));
        } else {
            output.depth = input.depth;
        }
    }

    output.color = input.color;

    return output;

}