#version 300 es
precision highp float;

in vec4 a_position; // clip space
in vec3 a_direction; // world space

out vec3 v_direction;

void main() {
    v_direction = a_direction;
    gl_Position = a_position;
}