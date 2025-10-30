#version 300 es
precision highp float;

#define __DEFINE_REPLACE__

#include "scene.glsl"

uniform sampler2D u_image;
uniform float u_opacity;
uniform bool u_enableNight;
uniform bool u_isNight;

in vec4 v_worldPos;
in vec2 v_texcoord;
in vec3 v_normal;
in float v_logz;

struct Sun {
    vec3 position;
    vec4 color;
};

struct Material {
    vec4 ambient; //ka
    vec4 diffuse; //kd
    vec4 specular; //ks
    vec4 emission; //ke
    float shininess; //ns
};

uniform Material material;
uniform Sun sun;
uniform Camera u_camera;
uniform Projection u_projection;

out vec4 fragColor;

vec4 surfanceColor(vec4 texcolor, vec3 location, Sun light, vec3 cameraPosition) {

    vec3 vlight = normalize(light.position - location);
    vec3 vsight = normalize(cameraPosition - location);
    vec3 vhalf = normalize(vlight + vsight);
    vec3 color = vec3(0, 0, 0);
    vec3 ds = vec3(texcolor);
    color += ds * vec3(light.color) * max(0.1f, dot(v_normal, vlight));
    vec3 ks = vec3(0.5f, 0.5f, 0.5f);
    float shininess = 100.0f;
    color += ks * vec3(light.color) * pow(max(0.0f, dot(v_normal, vhalf)), shininess);
    return vec4(color, 1.0f);
}

vec4 nightSurfaceColor(vec4 texcolor, vec3 location, Sun light, vec3 cameraPosition) {

    vec3 vlight = normalize(light.position - location);
    vec3 color = vec3(0, 0, 0);
    vec3 ds = vec3(texcolor);
    color += ds * vec3(light.color) * max(0.0f, -dot(v_normal, vlight));
    float x = -dot(v_normal, vlight);

    float a = max(0.0f, x);

    return vec4(color, a);
}

#ifdef DEBUG_DEPTH

void main() {

    float depth = v_logz / log2(u_projection.far + 1.0);

    fragColor = vec4(mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), depth), 1.0);
}

#else

void main() {

    vec3 pos = v_worldPos.xyz;
    vec3 eye = vec3(u_camera.from);
    vec4 texcolor = vec4(0, 0, 0, 1);

    texcolor = texture(u_image, v_texcoord);

    if(u_enableNight) {
        if(u_isNight) {
            fragColor = nightSurfaceColor(texcolor, pos, sun, eye);
        } else {
            fragColor = surfanceColor(texcolor, pos, sun, eye);
        }
    } else {
        fragColor = texcolor;
    }

    gl_FragDepth = v_logz / log2(u_projection.far + 1.0);

}

#endif