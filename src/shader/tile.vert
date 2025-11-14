#version 300 es
precision highp float;

#define __DEFINE_REPLACE__

#include "dfloat.glsl"

#include "spheriod.glsl"

#include "scene.glsl"

in vec3 a_position;
in vec3 a_position_high;
in vec3 a_position_low;

in vec2 a_texcoord;

in vec3 a_normal;
in vec3 a_normal_high;
in vec3 a_normal_low;

out vec2 v_texcoord;
out dfvec3 v_normal;
out dfvec4 v_relworldpos;
out dfloat v_relviewz;
out float v_needskip;

#ifdef WIREFRAME
    out vec3 v_baryccord;
#endif

float roundN(float x, int n) {
    float factor = pow(10.0, float(n)); // 10^n
    return round(x * factor) / factor;
}

void main() {
    dfvec4 relworldpos = dfvec3_force4(dfvec3_sub(dfvec3(a_position_high, a_position_low), dfvec4_force3(u_camera_df.from)), df(1.0));
    dfvec4 relviewpos = dfvec4_mul(u_camera_df.relviewmtx, relworldpos);
    dfvec4 relndcpos = dfvec4_mul(u_projection_df.projmtx, relviewpos);
    v_needskip = 1.0 - step(0.0, dfloat_out(dfvec4_w(relndcpos)));
    dfvec3 normal = dfvec3(a_normal_high, a_normal_low);

    gl_Position = dfvec4_out(relndcpos);

    v_relworldpos = relworldpos;

    v_texcoord = a_texcoord;
    
    v_normal = dfvec3_normalize(normal);

    v_relviewz = dfvec4_z(relviewpos);

    #ifdef WIREFRAME
        int id = gl_VertexID;
        int r = id % 3;
        if(r==0) {
            v_baryccord = vec3(1.0,0.0,0.0);
        } else if (r==1) {
            v_baryccord = vec3(0.0,1.0,0.0);
        } else {
            v_baryccord = vec3(0.0,0.0,1.0);
        }
    #endif

}