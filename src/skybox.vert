#version 300 es
precision highp float;

in vec4 a_position; // clip space
in vec3 a_direction; // clip space

struct Camera {
    vec4 from;
    vec4 to;
    vec4 up;
    mat4 viewmtx;
};

struct Projection {
    mat4 projmtx;
};

uniform Camera u_camera;
uniform Projection u_projection;

out vec3 v_direction;
// out vec3 world_direction;

void main() {
    v_direction = a_direction;
    gl_Position = a_position;

    // vec4 d = vec4(a_direction, 0.0f);
    // d = inverse(u_projection.projmtx) * d;
    // vec3 view_direction = normalize(d.xyz);

    // world_direction = normalize((inverse(u_camera.viewmtx) * vec4(view_direction, 0.0f)).xyz);

}