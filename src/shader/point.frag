#version 300 es
precision highp float;

#define __DEFINE_REPLACE__

#include "scene.glsl"

in float v_size;
in vec4 v_color;
in float v_strokewidth;
in vec4 v_strokecolor;

in float v_logz;

uniform Projection u_projection;

out vec4 fragColor;

bool isStroke(float size, float strokewidth, float radius) {
    float r = 0.5 - strokewidth / size / 2.0;
    return radius >= r;
}


#ifdef DEBUG_DEPTH

void main() {

    vec2 coord = gl_PointCoord - vec2(0.5f);
    if(length(coord) > 0.5f) {
        discard;
    }
    float depth = gl_FragCoord.z;
    fragColor = vec4(mix(vec3(1.0,0.0,0.0),vec3(0.0,1.0,0.0), depth),1.0);

}

#else

void main() {

    vec2 coord = gl_PointCoord - vec2(0.5f);
    float radius = length(coord);

    if(radius > 0.5f) {
        discard;
    }

    bool stroke = isStroke(v_size, v_strokewidth, radius);

    if(stroke) {
        fragColor = v_strokecolor;
    } else {
        fragColor = v_color;
    }

    gl_FragDepth = v_logz / log2(u_projection.far + 1.0);

}

#endif

