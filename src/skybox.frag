#version 300 es
precision highp float;

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
uniform samplerCube u_skybox;

in vec3 v_direction;

out vec4 fragColor;

float earth_radius(vec3 dir) {
    float a = 6378137.0f;   // radius A 
    float b = 6356752.3f;   // radius B
    dir = normalize(dir);
    float r = 1.0f / sqrt((dir.x * dir.x + dir.y * dir.y) / (a * a) + (dir.z * dir.z) / (b * b));
    return r;
}

void main() {

    vec3 f = vec3(u_camera.from);
    vec3 d = normalize(v_direction);
    vec3 c = vec3(0, 0, 0); // earth center
    float m = dot((c - f), d);
    vec3 p = f + m * d;
    vec3 v = p - c;
    float r = earth_radius(v); // earth radius
    float H = m > 0.0f ? length(v) : length(f); // ray to earth center height
    float h = (H - r) / (1E-2f * length(f)); // ray to earth surface height
    float w = pow(2.0f, -h); // surface light weight

    vec3 ringcolor = vec3(0.529f, 0.808f, 0.922f);
    vec3 starcolor = texture(u_skybox, v_direction).rgb;
    vec3 skycolor = mix(starcolor, ringcolor, w);
    skycolor = m > 0.0f && h <= 0.0f ? vec3(0, 0, 0) : skycolor;

    fragColor = vec4(skycolor, 1.0f);
}