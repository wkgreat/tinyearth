precision highp float;

uniform sampler2D u_image;
uniform float u_opacity;
uniform bool u_isNight;

varying vec4 v_worldPos;
varying vec2 v_texcoord;
varying vec3 v_normal;

struct Light {
    vec3 position;
    vec4 color;
};

struct Camera {
    vec3 position;
};

struct Material {
    vec4 ambient; //ka
    vec4 diffuse; //kd
    vec4 specular; //ks
    vec4 emission; //ke
    float shininess; //ns
};

uniform Material material;
uniform Light light;
uniform Camera camera;

vec4 shadeColorWithTexture(Material material, Light light, vec4 texcolor, vec4 ambient, vec3 normal, vec3 position, vec3 eye) {

    float diffuseAlpha = 1.0;

    vec3 vlgt = normalize(light.position - position);
    vec3 veye = normalize(eye - position);
    vec3 vhalf = normalize(vlgt + veye);

    vec4 ambientColor = material.ambient * ambient;
    vec4 diffuseColor = mix(material.diffuse, texcolor, diffuseAlpha) * light.color * max(dot(normal, vlgt), 0.05);

    vec4 color = ambientColor + diffuseColor + material.emission;
    color =  clamp(color, 0.0, 1.0);
    color = vec4(color.rgb, u_opacity);
    return color;
}

void main() {

    vec3 pos = v_worldPos.xyz;
    vec3 eye = camera.position;
    vec4 ambient = vec4(1, 1, 1, 1); //环境光
    vec4 texcolor = vec4(0, 0, 0, 1);

    texcolor = texture2D(u_image, v_texcoord);

    if(u_isNight) {
        float alpha = 1.0;
        vec3 vlgt = normalize(light.position - pos);
        float night = pow(((-1.0 * dot(v_normal, vlgt)) + 1.0) / 2.0, alpha);
        vec4 color = vec4(texcolor.rgb, night);
        gl_FragColor = color;
    } else {
        gl_FragColor = shadeColorWithTexture(material, light, texcolor, ambient, v_normal, pos, eye);
    }

    
}