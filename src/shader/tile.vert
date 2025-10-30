#version 300 es
precision highp float;

#include "scene.glsl"

in vec4 a_position;
in vec2 a_texcoord;
in vec3 a_normal;

uniform Projection u_projection;
uniform Camera u_camera;
uniform mat4 u_modelMtx;

out vec2 v_texcoord;
out vec3 v_normal;
out vec4 v_worldPos;
out float v_logz;

void main() {

    vec4 viewPos = u_camera.viewmtx * u_modelMtx * a_position;

    gl_Position = u_projection.projmtx * viewPos;

    v_worldPos = u_modelMtx * a_position;

    v_texcoord = a_texcoord;
    
    v_normal = normalize(a_normal);

    float z = -viewPos.z;

    v_logz = log2(max(1.0, z + 1.0));
}