struct Camera {
    vec4 from;
    vec4 to;
    vec4 up;
    mat4 viewmtx;
};

struct Projection {
    float near;
    float far;
    mat4 projmtx;
    float logDepthConstant;
};

struct Sun {
    vec3 position;
    vec4 color;
};

struct Model {
    mat4 modelmtx;
};

struct Scene {
    vec2 viewport;
    mat4 viewportmtx;
};

uniform Camera u_camera;
uniform Projection u_projection;
uniform Sun u_sun;
uniform Model u_model;
uniform Scene u_scene;
