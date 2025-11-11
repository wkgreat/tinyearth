#version 300 es
precision highp float;

#define __DEFINE_REPLACE__

#include "depth.glsl"

#include "scene.glsl"

in float v_size;
in vec4 v_color;
in float v_strokewidth;
in vec4 v_strokecolor;
in float v_viewz;

out vec4 fragColor;

float isStroke(float size, float strokewidth, float radius) {
    float r = 0.5 - strokewidth / size / 2.0;
    return step(r,radius);
}

void main() {

    vec2 coord = gl_PointCoord - vec2(0.5f);
    float radius = length(coord);

    if(radius > 0.5f) {
        discard;
    }

    float stroke = isStroke(v_size, v_strokewidth, radius);

    fragColor = mix(v_color, v_strokecolor, stroke);

    gl_FragDepth = frag_depth_log(u_scene.logDepthC, u_projection.far, v_viewz);

}

