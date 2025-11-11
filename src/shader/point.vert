#version 300 es
precision highp float;

#include "scene.glsl"

#include "spheriod.glsl"

in vec4 a_position;

in vec4 a_color;
in float a_size;
in int a_stroke;
in float a_strokewidth;
in vec4 a_strokecolor;

uniform bool u_clampToGround;

out float v_size;
out vec4 v_color;
out float v_strokewidth;
out vec4 v_strokecolor;
out float v_viewz;

void main() {

    vec4 position;

    if(u_clampToGround) {
        position = vec4(clamp_to_ground(a_position.xyz, SPHERIOD_WGS84, 0.0),1.0);
    } else {
        position = a_position;
    }

    vec4 viewpos = u_camera.viewmtx * position;

    gl_Position = u_projection.projmtx * viewpos;
    gl_PointSize = a_size;

    v_size = a_size;
    v_color = a_color;
    v_strokewidth = a_strokewidth;
    v_strokecolor = a_strokecolor;
    
    v_viewz = viewpos.z;

    
}