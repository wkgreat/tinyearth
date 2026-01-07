#version 300 es
precision highp float;

#define __DEFINE_REPLACE__

#include "depth.glsl"

#include "scene.glsl"

#include "color.glsl"

uniform sampler2D u_image;
uniform float u_opacity;
uniform bool u_enableNight;
uniform bool u_isNight;

in dfvec4 v_relworldpos;
in vec2 v_texcoord;
in dfvec3 v_normal;
in dfloat v_relviewz;
in float v_needskip;
#ifdef WIREFRAME
    in vec3 v_baryccord;
#endif

struct Material {
    vec4 ambient; //ka
    vec4 diffuse; //kd
    vec4 specular; //ks
    vec4 emission; //ke
    float shininess; //ns
};

uniform Material material;

out vec4 fragColor;

vec4 surfanceColor(vec4 texcolor, vec3 location, vec3 norm, vec3 cameraPosition, Sun light) {
    //TODO should use dfloat?
    vec3 vlight = normalize(light.position - location);
    vec3 vsight = normalize(cameraPosition - location);
    vec3 vhalf = normalize(vlight + vsight);
    vec3 color = vec3(0, 0, 0);
    vec3 ds = vec3(texcolor);
    color += ds * vec3(light.color) * max(0.1f, dot(norm, vlight));
    vec3 ks = vec3(0.5f, 0.5f, 0.5f);
    float shininess = 100.0f;
    color += ks * vec3(light.color) * pow(max(0.0f, dot(norm, vhalf)), shininess);
    return vec4(color, 1.0f);
}

vec4 nightSurfaceColor(vec4 texcolor, vec3 location, vec3 norm, vec3 cameraPosition, Sun light) {
    //TODO should use dfloat?
    vec3 vlight = normalize(light.position - location);
    vec3 color = vec3(0, 0, 0);
    vec3 ds = vec3(texcolor);
    color += ds * vec3(light.color) * max(0.0f, -dot(norm, vlight));
    float x = -dot(norm, vlight);

    float a = max(0.0f, x);

    return vec4(color, a);
}

float rand(float x) {
    return fract(sin(x) * 43758.5453123);
}

void main() {

    if(v_needskip > 0.0) {
        discard;
    }

    vec3 pos = dfvec3_out(dfvec4_force3(v_relworldpos));
    vec3 eye = dfvec3_out(dfv3(vec3(0.0,0.0,0.0)));
    vec3 norm = dfvec3_out(v_normal);

    vec4 texcolor = vec4(0, 0, 0, 1);

    texcolor = texture(u_image, v_texcoord);

    if(u_enableNight) {
        if(u_isNight) {
            fragColor = nightSurfaceColor(texcolor, pos, norm, eye, u_sun);
        } else {
            fragColor = surfanceColor(texcolor, pos, norm, eye, u_sun);
        }
    } else {
        fragColor = texcolor;
    }

    #ifdef WIREFRAME
    float d = min(v_baryccord.x,min(v_baryccord.y, v_baryccord.z));
    if(d<=0.02) {
        fragColor = COLOR_RED;
    }
    #endif
    
    #ifdef LOG_DEPTH
        gl_FragDepth = dfloat_out(frag_depth_log_df(u_scene_df.logDepthC, u_projection_df.near, u_projection_df.far, v_relviewz));
    #endif

}