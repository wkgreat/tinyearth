#version 300 es
precision highp float;

#include "spheriod.glsl"

#include "scene.glsl"

in vec4 a_position;
in float a_entityid;
in vec4 a_color;
in float a_lineWidth;

uniform bool u_clampToGround;

out vec4 v_worldpos;
out float v_entityid;
out vec4 v_color;
out float v_logz;

void main() {

    vec4 position;
    
    if(u_clampToGround) {
        position = vec4(clamp_to_ground(a_position.xyz, SPHERIOD_WGS84, 0.0), 1.0);
    } else {
        position = a_position;
    }

    v_worldpos = position;

    vec4 viewpos = u_camera.viewmtx * position;

    gl_Position = u_projection.projmtx * viewpos;
    
    v_entityid = a_entityid;

    v_color = a_color;

    v_logz = log2(max(1.0, -viewpos.z + 1.0));

}