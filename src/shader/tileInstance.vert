#version 300 es
precision highp float;

#include "scene.glsl"

in vec2 a_position; // (x,y,z=0) in EPSG:3857 of tile(0,0,0)
in vec2 a_texcoord; // (u,v)
in vec3 a_tilekey;  // (x,y,z) of tile index

uniform mat4 u_modelMtx;

out vec2 v_texcoord;
out vec3 v_normal;
out vec4 v_worldPos;
out float v_logz;

flat out int v_texindex;

vec2 calcTilePosition(vec2 position, vec3 tilekey) {

    float vmin = -20037508.3427892;
    float vmax = 20037508.3427892;

    float d = pow(2.0, tilekey.z);
    float tsize = (vmax - vmin) / d;
    float xoffset = tilekey.x * tsize;
    float yoffset = -1.0 * tilekey.y * tsize;

    float x = (position.x / d) + xoffset;
    float y = (position.y / d) + yoffset; 

    return vec2(x, y);
}

float PI = 3.1415926535897932384626433832795;
float WGS_A = 6378137.0;
float WGS_B = 6356752.314245;
float WGS_F = 1.0 / 298.257223563;
float WGS_E2 = 0.00669437999014;

float toDegrees(float r) {
    
    return r * 180.0 / PI;
}
float toRadians(float d) {

    return d * PI / 180.0;
}

vec3 web_to_wgs84(vec2 p) {

    float r = WGS_A;
    float x0 = p.x;
    float y0 = p.y;
    float z0 = 0.0;

    float x1 = toDegrees(x0 / r);
    float y1 = toDegrees(2.0 * atan(exp(y0 / r)) - PI / 2.0);
    float z1 = z0;
    return vec3(x1,y1,z1);
}

vec3 wgs84_to_ecef(vec3 p) {
    float a = WGS_A;
    float e2 = WGS_E2;

    float x0 = toRadians(p.x);
    float y0 = toRadians(p.y);
    float z0 = p.z;

    float N = a / sqrt(1.0 - e2 * pow(sin(y0), 2.0));
    float x1 = (N + z0) * cos(y0) * cos(x0);
    float y1 = (N + z0) * cos(y0) * sin(x0);
    float z1 = (N * (1.0 - e2) + z0) * sin(y0);

    return vec3(x1, y1, z1);
}

vec3 web_to_ecef(vec2 p) {
    return wgs84_to_ecef(web_to_wgs84(p));
}

void main() {

    vec2 webpos = calcTilePosition(a_position, a_tilekey);

    vec3 ecefpos = web_to_ecef(webpos);

    vec4 viewPos = u_camera.viewmtx * u_modelMtx * vec4(ecefpos, 1.0);

    gl_Position = u_projection.projmtx * viewPos;

    v_worldPos = u_modelMtx * vec4(ecefpos, 1.0);

    v_texcoord = a_texcoord;
    
    v_normal = normalize(ecefpos);

    float z = -viewPos.z;

    v_logz = log2(max(1.0, z + 1.0));

    v_texindex = gl_InstanceID;
}