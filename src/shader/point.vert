#version 300 es
precision highp float;

#define __DEFINE_REPLACE__

#include "scene.glsl"

#include "spheriod.glsl"

in vec3 a_position;
in vec3 a_position_high;
in vec3 a_position_low;

in vec4 a_color;
in float a_size;
in int a_stroke;
in float a_strokewidth;
in vec4 a_strokecolor;

out float v_size;
out vec4 v_color;
out float v_strokewidth;
out vec4 v_strokecolor;
out dfvec3 v_worldpos;
out dfloat v_relviewz;

void main() {

    dfvec3 worldpos = dfvec3(a_position_high, a_position_low);

    if(u_clampToGround) {
        worldpos = clamp_to_ground_df(
                    worldpos, 
                    SPHERIOD_WGS84_df,
                    df(u_clampToGroundOffset));
    }

    dfvec4 relworldpos = dfv3t4(relative(worldpos), df(1.0));

    dfvec4 relviewpos = dfvec4_mul(u_camera_df.relviewmtx, relworldpos);
    relviewpos = dfvec4_normw(relviewpos);

    dfvec4 ndcpos = dfvec4_normw(dfvec4_mul(u_projection_df.projmtx, relviewpos));

    gl_Position = dfvec4_out(ndcpos);
    gl_PointSize = a_size;

    v_size = a_size;
    v_color = a_color;
    v_strokewidth = a_strokewidth;
    v_strokecolor = a_strokecolor;
    v_worldpos = worldpos;
    v_relviewz = dfvec4_z(relviewpos);

    
}