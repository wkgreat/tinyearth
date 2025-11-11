#version 300 es
precision highp float;

#include "spheriod.glsl"

#include "scene.glsl"

in vec4 a_position;
in vec2 a_texcoord;
in vec3 a_normal;

out vec2 v_texcoord;
out vec3 v_normal;
out vec4 v_worldPos;
out float v_viewz;

void main() {

    vec4 position = a_position;

    vec4 viewpos = u_camera.viewmtx * a_position;

    gl_Position = u_projection.projmtx * viewpos;

    v_worldPos = position;

    v_texcoord = a_texcoord;
    
    v_normal = normalize(a_normal);

    v_viewz = viewpos.z;

}