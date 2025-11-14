#ifndef SPHERIOD_GLSL_
#define SPHERIOD_GLSL_

#include "dfloat.glsl"

//origin-center axis-aligned spheriod
struct Spheriod {
    float a;
    float b;
    float c;
    mat3 m;
};

const float WGS84_A = 6378137.0f;
const float WGS84_B = 6378137.0f;
const float WGS84_C = 6356752.314245f;
const mat3 WGS84_M = mat3(
        1.0/(WGS84_A*WGS84_A), 0.0,      0.0,
        0.0,      1.0/(WGS84_B*WGS84_B), 0.0,
        0.0,      0.0,      1.0/(WGS84_C*WGS84_C)
    );
const Spheriod SPHERIOD_WGS84 = Spheriod(WGS84_A,WGS84_B,WGS84_C,WGS84_M);

Spheriod buildSpheriod(float a, float b, float c) {
    Spheriod s;
    s.a = a;
    s.b = b;
    s.c = c;
    s.m = mat3(
        1.0/(a*a), 0.0,      0.0,
        0.0,      1.0/(b*b), 0.0,
        0.0,      0.0,      1.0/(c*c)
    );
    return s;
}

mat3 spheriod_matrix(Spheriod s) {
    return mat3(
        1.0/(s.a*s.a), 0.0,      0.0,
        0.0,      1.0/(s.b*s.b), 0.0,
        0.0,      0.0,      1.0/(s.c*s.c)
    );
}

float spheriod_radius(vec3 d, Spheriod s) {
    mat3 q = s.m;
    vec3 n = normalize(d);
    float denom = dot(n, q * n);
    return 1.0 / sqrt(denom);
}

float spheriod_matrix_radius(vec3 d, mat3 m) {
    vec3 n = normalize(d);
    float denom = dot(n, m * n);
    return 1.0 / sqrt(denom);
}

float earth_radius(vec3 d) {
    return spheriod_radius(d, SPHERIOD_WGS84);
}

vec3 clamp_to_ground(vec3 p, Spheriod s, float h) {
    vec3 d = normalize(p);
    float t = spheriod_radius(d, s);
    return d * (h + t);
}


///////

struct Spheriod_df {
    dfloat a;
    dfloat b;
    dfloat c;
    dfmat3 m;
};

const dfloat WGS84_A_df = dfloat(6378137.0f, 0.0f);
const dfloat WGS84_B_df = dfloat(6378137.0f, 0.0f);
const dfloat WGS84_C_df = dfloat(6356752.314245f, 0.0);

const dfmat3 WGS84_M_df = dfmat3(
    mat3(
        1.0/(WGS84_A*WGS84_A), 0.0,      0.0,
        0.0,      1.0/(WGS84_B*WGS84_B), 0.0,
        0.0,      0.0,      1.0/(WGS84_C*WGS84_C)
    ),
    mat3(
        0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
        0.0, 0.0, 0.0
    )
);

const Spheriod_df SPHERIOD_WGS84_df = Spheriod_df(WGS84_A_df, WGS84_B_df, WGS84_C_df, WGS84_M_df);

Spheriod_df buildSpheriod_df(dfloat a, dfloat b, dfloat c) {
    Spheriod_df s;
    s.a = a;
    s.b = b;
    s.c = c;
    s.m = dfmat3_make(
        dfloat_rsq(a), df(0.0),      df(0.0),
        df(0.0),      dfloat_rsq(b), df(0.0),
        df(0.0),      df(0.0),      dfloat_rsq(c)
    );
    return s;
}

dfmat3 spheriod_matrix_df(Spheriod_df s) {
    return dfmat3_make(
        dfloat_rsq(s.a), df(0.0),      df(0.0),
        df(0.0),      dfloat_rsq(s.b), df(0.0),
        df(0.0),      df(0.0),      dfloat_rsq(s.c)
    );
}

dfloat spheriod_radius_df(dfvec3 d, Spheriod_df s) {
    dfvec3 n = dfvec3_normalize(d);
    dfloat denom = dfvec3_dot(n, dfvec3_mul(s.m, n));
    return dfloat_rsqrt(denom);
}

dfloat spheriod_matrix_radius_df(dfvec3 d, dfmat3 m) {
    dfvec3 n = dfvec3_normalize(d);
    dfloat denom = dfvec3_dot(n, dfvec3_mul(m, n));
    return dfloat_rsqrt(denom);
}

dfloat earth_radius_df(dfvec3 d) {
    return spheriod_radius_df(d, SPHERIOD_WGS84_df);
}

dfvec3 clamp_to_ground_df(dfvec3 p, Spheriod_df s, dfloat h) {
    dfvec3 d = dfvec3_normalize(p);
    dfloat t = spheriod_radius_df(d, s);
    return dfvec3_scale(d, dfloat_add(h, t));
}
#endif