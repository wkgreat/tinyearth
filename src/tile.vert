attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;

uniform mat4 u_modelMtx;
uniform mat4 u_viewMtx;
uniform mat4 u_projMtx;

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec4 v_worldPos;

void main() {
    gl_Position = u_projMtx * u_viewMtx * u_modelMtx * a_position;
    v_worldPos = u_modelMtx * a_position;
    v_texcoord = a_texcoord;
    v_normal = normalize(a_normal);
}