#version 300 es
precision highp float;

#include "spheriod.glsl"

#include "scene.glsl"

in vec4 a_lastpos;
in vec4 a_nextpos;
in vec4 a_position;
in float a_side;

in float a_entityid;
in vec4 a_color;
in float a_linewidth;

uniform bool u_clampToGround;

out vec4 v_worldpos;
out float v_entityid;
out vec4 v_color;
out float v_logz;

void main() {

    vec4 worldpos;
    vec4 last_worldpos;
    vec4 next_worldpos;
    
    if(u_clampToGround) {
        worldpos = vec4(clamp_to_ground(a_position.xyz, SPHERIOD_WGS84, 0.0), 1.0);
        last_worldpos = vec4(clamp_to_ground(a_lastpos.xyz, SPHERIOD_WGS84, 0.0), 1.0);
        next_worldpos = vec4(clamp_to_ground(a_nextpos.xyz, SPHERIOD_WGS84, 0.0), 1.0);
    } else {
        worldpos = a_position;
        last_worldpos = a_lastpos;
        next_worldpos = a_nextpos;
    }

    vec4 ndspos = u_scene.viewportmtx * u_projection.projmtx * u_camera.viewmtx * worldpos;
    ndspos /= ndspos.w; 

    vec4 last_ndspos = u_scene.viewportmtx * u_projection.projmtx * u_camera.viewmtx * last_worldpos;
    last_ndspos /= last_ndspos.w;

    vec4 next_ndspos = u_scene.viewportmtx * u_projection.projmtx * u_camera.viewmtx * next_worldpos;
    next_ndspos /= next_ndspos.w;

    vec2 ld = normalize(last_ndspos.xy - ndspos.xy);
    vec2 nd = normalize(next_ndspos.xy - ndspos.xy);
    vec2 d;

    mat2 rightRot90 = mat2(
        0.0, 1.0,
        -1.0, 0.0
    );

    vec2 rd = normalize(rightRot90 * nd);
    float w = a_linewidth;

    if(length(ld) < 0.001 || abs(dot(ld,nd)) >= 1.0-1E-6) {
        d = rd;
    } else {
        w = a_linewidth / sin(acos(dot(ld,nd)) / 2.0);
        d = normalize(ld + nd);
        d = (2.0 * step(0.0, dot(d, rd)) - 1.0) * d; // dot(d, rd)) >= 0.0 d esle -d
    }

    vec2 offset = a_side * w * d;

    vec4 new_ndspos = vec4(ndspos.xy + offset, ndspos.z, 1.0);

    vec4 new_ndcpos = inverse(u_scene.viewportmtx) * new_ndspos;
    new_ndcpos /= new_ndcpos.w;

    vec4 new_viewpos = inverse(u_projection.projmtx) * new_ndcpos;
    new_viewpos /= new_viewpos.w;

    vec4 new_worldpos = inverse(u_camera.viewmtx) * new_viewpos;
    new_worldpos /= new_worldpos.w;

    gl_Position = new_ndcpos;

    v_worldpos = new_worldpos;
    
    v_entityid = a_entityid;

    v_color = a_color;

    v_logz = log2(max(1.0, -new_viewpos.z + 1.0));

}