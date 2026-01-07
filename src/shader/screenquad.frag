#version 300 es
precision highp float;

#include "scene.glsl"

in vec2 v_texcoord;

uniform sampler2D u_texture;

out vec4 fragColor;

void main() {

    vec4 texcolor = texture(u_texture, v_texcoord);
    fragColor = vec4(texcolor.rgb,1.0);
    gl_FragDepth = u_scene.neardepth;
}