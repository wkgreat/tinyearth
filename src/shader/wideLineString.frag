#version 300 es
precision highp float;

#include "depth.glsl"

#include "spheriod.glsl"

#include "scene.glsl"

in vec4 v_worldpos;
in vec4 v_viewpos;
in float v_entityid;
in vec4 v_color;
in float v_logz;

uniform bool u_clampToGround;

out vec4 fragColor;

void main() {

    // entityid is not integer, means this pixel is between two entites, need discard
    if(abs(fract(v_entityid)) > 1E-5) { 
        discard;
    }

    float z = v_viewpos.z;

    if(u_clampToGround) {
        vec4 worldpos = vec4(clamp_to_ground(v_worldpos.xyz, SPHERIOD_WGS84, 5.0), 1.0);
        vec4 viewpos = u_camera.viewmtx * worldpos;
        viewpos /= viewpos.w;
        z = viewpos.z;
    } else {
        z = v_viewpos.z;
    }

    gl_FragDepth = frag_depth_log(u_scene.logDepthC, u_projection.far, z);

    fragColor = v_color;


}