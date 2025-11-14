#version 300 es
precision highp float;

#define __DEFINE_REPLACE__

#include "dfloat.glsl"

#include "color.glsl"

#include "spheriod.glsl"

#include "scene.glsl"

in vec4 a_lastpos;
in vec4 a_nextpos;
in vec4 a_position;

in vec3 a_lastpos_high;
in vec3 a_lastpos_low;
in vec3 a_nextpos_high;
in vec3 a_nextpos_low;
in vec3 a_position_high;
in vec3 a_position_low;

in float a_side;

in float a_entityid;
in vec4 a_color;
in float a_linewidth;
in float a_normlen;

out dfvec4 v_relworldpos;
out dfvec4 v_relviewpos;
out float v_entityid;
out vec4 v_color;

const mat2 leftRot90 = mat2(
    0.0, -1.0,
    1.0, 0.0
);
const mat2 rightRot90 = mat2(
    0.0, 1.0,
    -1.0, 0.0
);

void main() {

    v_color = a_color;

    dfvec4 worldpos = dfv3t4(dfvec3(a_position_high, a_position_low), df(1.0));
    dfvec4 last_worldpos = dfv3t4(dfvec3(a_lastpos_high, a_lastpos_low), df(1.0));
    dfvec4 next_worldpos = dfv3t4(dfvec3(a_nextpos_high, a_nextpos_low), df(1.0));

    if(u_clampToGround) {
        worldpos = dfv3t4(clamp_to_ground_df(dfv4t3(worldpos), SPHERIOD_WGS84_df, df(u_clampToGroundOffset)), df(1.0));
        last_worldpos = dfv3t4(clamp_to_ground_df(dfv4t3(last_worldpos), SPHERIOD_WGS84_df, df(u_clampToGroundOffset)), df(1.0));
        next_worldpos = dfv3t4(clamp_to_ground_df(dfv4t3(next_worldpos), SPHERIOD_WGS84_df, df(u_clampToGroundOffset)), df(1.0));
    }

    dfvec4 relworldpos = dfv3t4(relative(dfv4t3(worldpos)), df(1.0));
    dfvec4 last_relworldpos = dfv3t4(relative(dfv4t3(last_worldpos)), df(1.0));
    dfvec4 next_relworldpos = dfv3t4(relative(dfv4t3(next_worldpos)), df(1.0));

    dfmat4 spv = dfmat4_mul(u_scene_df.viewportmtx, dfmat4_mul(u_projection_df.projmtx, u_camera_df.relviewmtx));

    dfvec4 relndspos = dfvec4_mul(spv, relworldpos);
    relndspos = dfvec4_normabsw(relndspos); // p /= abs(p.w) if the position is behind the camera, w will small than zero!

    dfvec4 last_relndspos = dfvec4_mul(spv, last_relworldpos);
    last_relndspos = dfvec4_normabsw(last_relndspos); // p /= abs(p.w)  if the position is behind the camera, w will small than zero!

    dfvec4 next_relndspos = dfvec4_mul(spv, next_relworldpos);
    next_relndspos = dfvec4_normabsw(next_relndspos);  // p /= abs(p.w)  if the position is behind the camera, w will small than zero!

    

    vec2 ld = dfvec2_out(dfvec2_sub(dfvec4_force2(last_relndspos), dfvec4_force2(relndspos)));
    vec2 nd = dfvec2_out(dfvec2_sub(dfvec4_force2(next_relndspos), dfvec4_force2(relndspos)));
    vec2 d;

    float w = a_linewidth;

    float minRes = 1.0;

    if(length(ld) < minRes && length(nd) < minRes) {
        d = vec2(0.0, 0.0);
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
            vec2 rd = normalize(rightRot90 * normalize(nd));
            w = a_linewidth / sin(acos(dot(ld,nd)) / 2.0);
            d = normalize(ld + nd);
            d = (2.0 * step(0.0, dot(d, rd)) - 1.0) * d; // dot(d, rd)) >= 0.0 d esle -d
        }
    }

    vec2 offset = a_side * w * d;

    vec4 newp = vec4(dfvec2_out(dfvec4_force2(relndspos)) + offset, dfloat_out(dfvec4_z(relndspos)), 1.0);
    dfvec4 new_ndspos = dfv4(newp);

    dfvec4 new_ndcpos = dfvec4_normw(dfvec4_mul(dfmat4_inv(u_scene_df.viewportmtx), new_ndspos));

    dfvec4 new_viewpos = dfvec4_normw(dfvec4_mul(dfmat4_inv(u_projection_df.projmtx), new_ndcpos));

    dfvec4 new_worldpos = dfvec4_normw(dfvec4_mul(dfmat4_inv(u_camera_df.relviewmtx), new_viewpos));

    gl_Position = dfvec4_out(new_ndcpos);

    v_relviewpos = new_viewpos;

    v_relworldpos = new_worldpos;
    
    v_entityid = a_entityid;

}