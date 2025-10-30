#version 300 es
precision highp float;

#include "scene.glsl"

in vec4 a_position;

in vec4 a_color;
in float a_size;
in int a_stroke;
in float a_strokewidth;
in vec4 a_strokecolor;

uniform Camera u_camera;
uniform Projection u_projection;

out float v_size;
out vec4 v_color;
out float v_strokewidth;
out vec4 v_strokecolor;
out float v_logz;

void main() {

    vec4 viewpos = u_camera.viewmtx * a_position;

    gl_Position = u_projection.projmtx * viewpos;
    gl_PointSize = a_size;

    v_size = a_size;
    v_color = a_color;
    v_strokewidth = a_strokewidth;
    v_strokecolor = a_strokecolor;
    
    float z = -viewpos.z;
    v_logz = log2(max(1.0, z + 1.0));
    
}