#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform float u_opacity;
uniform bool u_enableNight;
uniform bool u_isNight;

in vec4 v_worldPos;
in vec2 v_texcoord;
in vec3 v_normal;

struct Sun {
    vec3 position;
    vec4 color;
};

struct Camera {
    vec4 from;
    vec4 to;
    vec4 up;
    mat4 viewmtx;
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
uniform Camera camera;

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

void main() {

    vec3 pos = v_worldPos.xyz;
    vec3 eye = vec3(camera.from);
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

}