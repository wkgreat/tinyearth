#ifndef SCENE_GLSL_
#define SCENE_GLSL_

#include "dfloat.glsl"

struct Camera {
    vec4 from;
    vec4 to;
    vec4 up;
    mat4 viewmtx;
    mat4 relviewmtx;
    float height;
};

struct Projection {
    float near;
    float far;
    mat4 projmtx;
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
    float logDepthC;
    float neardepth;
    float fardepth;
};

uniform Camera u_camera;
uniform Projection u_projection;
uniform Sun u_sun;
uniform Model u_model;
uniform Scene u_scene;

////
struct Camera_df {
    dfvec4 from;
    dfvec4 to;
    dfvec4 up;
    dfmat4 viewmtx;
    dfmat4 relviewmtx;
    dfloat height;
};

struct Projection_df {
    dfloat near;
    dfloat far;
    dfmat4 projmtx;
};

struct Sun_df {
    dfvec3 position;
    vec4 color;
};

struct Model_df {
    dfmat4 modelmtx;
};

struct Scene_df {
    dfvec2 viewport;
    dfmat4 viewportmtx;
    dfloat logDepthC;
    float neardepth;
    float fardepth;
};

uniform Camera_df u_camera_df;
uniform Projection_df u_projection_df;
uniform Sun_df u_sun_df;
uniform Model_df u_model_df;
uniform Scene_df u_scene_df;

uniform bool u_clampToGround;
uniform float u_clampToGroundOffset;

dfvec3 relative(dfvec3 pos) {
    return dfvec3_sub(pos, dfvec4_force3(u_camera_df.from));
}

dfvec3 absolute(dfvec3 pos) {
    return dfvec3_add(pos, dfvec4_force3(u_camera_df.from));
}

#endif
