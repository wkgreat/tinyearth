#version 300 es
precision highp float;

#include "scene.glsl"

in vec4 v_worldpos;
in float v_entityid;
in vec4 v_color;
in float v_logz;

uniform sampler2D u_groundDepthTexture;
uniform vec2 u_resolution; 

out vec4 fragColor;

void main() {

    // entityid is not integer, means this pixel is between two entites, need discard
    if(abs(fract(v_entityid)) > 1E-5) { 
        discard;
    }

    vec3 n = normalize(v_worldpos.xyz);
    vec3 e = normalize(u_camera.from.xyz - v_worldpos.xyz);
    if(dot(n,e)<0.0) {
        discard;
    }

    vec2 uv = gl_FragCoord.xy / u_resolution;

    float groundDepth = texture(u_groundDepthTexture, uv).r;

    float depth = v_logz / log2(u_projection.far + 1.0);

    gl_FragDepth = groundDepth;

    fragColor = v_color;


}