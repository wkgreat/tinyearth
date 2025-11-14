#version 300 es
precision highp float;

#define __DEFINE_REPLACE__

#include "dfloat.glsl"

#include "depth.glsl"

#include "spheriod.glsl"

#include "scene.glsl"

in dfvec4 v_relworldpos;
in dfvec4 v_relviewpos;
in float v_entityid;
in vec4 v_color;

out vec4 fragColor;

void main() {

    // entityid is not integer, means this pixel is between two entites, need discard
    if(abs(fract(v_entityid)) > 1E-5) { 
        discard;
    } 

    #ifdef LOG_DEPTH
        dfvec4 viewpos = v_relviewpos;
    #else
        dfvec4 ndspos;
        dfmat4 spv = dfmat4_mul(u_scene_df.viewportmtx, dfmat4_mul(u_projection_df.projmtx, u_camera_df.relviewmtx));
    #endif

    if(u_clampToGround) {
        dfvec3 worldpos = relative(clamp_to_ground_df(absolute(dfv4t3(v_relworldpos)), SPHERIOD_WGS84_df, df(u_clampToGroundOffset)));
        #ifdef LOG_DEPTH
            viewpos = dfvec4_normw(dfvec4_mul(u_camera_df.relviewmtx, dfv3t4(worldpos, df(1.0))));
            gl_FragDepth = dfloat_out(frag_depth_log_df(u_scene_df.logDepthC, u_projection_df.far, dfvec4_z(viewpos)));
        #else    
            ndspos = dfvec4_normw(dfvec4_mul(spv, dfv3t4(worldpos, df(1.0))));
            gl_FragDepth = dfloat_out(dfvec4_z(ndspos));
        #endif
    } else {
        #ifdef LOG_DEPTH
            gl_FragDepth = dfloat_out(frag_depth_log_df(u_scene_df.logDepthC, u_projection_df.far, dfvec4_z(v_relviewpos)));
        #else
        #endif

    }


    fragColor = v_color;


}