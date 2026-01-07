#version 300 es
precision highp float;

#define __DEFINE_REPLACE__

#include "depth.glsl"

#include "scene.glsl"

#include "spheriod.glsl"

in float v_size;
in vec4 v_color;
in float v_strokewidth;
in vec4 v_strokecolor;
in dfvec3 v_worldpos;
in dfloat v_relviewz;

out vec4 fragColor;

float isStroke(float size, float strokewidth, float radius) {
    float r = 0.5 - strokewidth / size / 2.0;
    return step(r,radius);
}

void main() {

    vec2 coord = gl_PointCoord - vec2(0.5f);
    float radius = length(coord);

    if(radius > 0.5f) {
        discard;
    }

    float stroke = isStroke(v_size, v_strokewidth, radius);

    fragColor = mix(v_color, v_strokecolor, stroke);

    #ifdef LOG_DEPTH
        dfloat viewz = v_relviewz;
    #else
        dfvec4 ndspos;
        dfmat4 spv = dfmat4_mul(u_scene_df.viewportmtx, dfmat4_mul(u_projection_df.projmtx, u_camera_df.relviewmtx));
    #endif

    if(u_clampToGround) {
        dfvec3 worldpos = relative(clamp_to_ground_df(v_worldpos, SPHERIOD_WGS84_df, df(u_clampToGroundOffset)));
        #ifdef LOG_DEPTH
            viewz = dfvec4_z(dfvec4_normw(dfvec4_mul(u_camera_df.relviewmtx, dfv3t4(worldpos, df(1.0)))));
            gl_FragDepth = dfloat_out(frag_depth_log_df(u_scene_df.logDepthC, u_projection_df.near, u_projection_df.far, viewz));
        #else    
            ndspos = dfvec4_normw(dfvec4_mul(spv, dfv3t4(worldpos, df(1.0))));
            gl_FragDepth = dfloat_out(dfvec4_z(ndspos));
        #endif
    } else {
        #ifdef LOG_DEPTH
            gl_FragDepth = dfloat_out(frag_depth_log_df(u_scene_df.logDepthC, u_projection_df.near, u_projection_df.far, viewz));
        #else
        #endif
        
    }

    

}

