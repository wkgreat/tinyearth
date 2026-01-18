//spheriod.module.wgsl

#include "dfloat.module.wgsl"

//origin-center axis-aligned spheriod
struct Spheriod {
    a: f32,
    b: f32,
    c: f32,
    m: mat3x3f
};

const WGS84_A = 6378137.0f;
const WGS84_B = 6378137.0f;
const WGS84_C = 6356752.314245f;
const WGS84_M = mat3x3f(
        1.0/(WGS84_A*WGS84_A), 0.0,      0.0,
        0.0,      1.0/(WGS84_B*WGS84_B), 0.0,
        0.0,      0.0,      1.0/(WGS84_C*WGS84_C)
    );
const SPHERIOD_WGS84 = Spheriod(WGS84_A, WGS84_B, WGS84_C, WGS84_M);

fn buildSpheriod(a: f32, b: f32, c: f32) -> Spheriod {
    let s = Spheriod(
        a,
        b,
        c,
        mat3x3f(
        1.0/(a*a), 0.0,      0.0,
        0.0,      1.0/(b*b), 0.0,
        0.0,      0.0,      1.0/(c*c))
    );
    return s;
}

fn spheriod_matrix(s: Spheriod) -> mat3x3f {
    return mat3x3f(
        1.0/(s.a*s.a), 0.0,      0.0,
        0.0,      1.0/(s.b*s.b), 0.0,
        0.0,      0.0,      1.0/(s.c*s.c)
    );
}

fn spheriod_radius(d: vec3f, s: Spheriod) -> f32 {
    let q = s.m;
    let n = normalize(d);
    let denom = dot(n, q * n);
    return 1.0 / sqrt(denom);
}

fn spheriod_matrix_radius(d: vec3f, m: mat3x3f) -> f32 {
    let n = normalize(d);
    let denom = dot(n, m * n);
    return 1.0 / sqrt(denom);
}

fn earth_radius(d: vec3f) -> f32{
    return spheriod_radius(d, SPHERIOD_WGS84);
}

fn clamp_to_ground(p: vec3f, s: Spheriod, h: f32) -> vec3f {
    let d = normalize(p);
    let t = spheriod_radius(d, s);
    return d * (h + t);
}


///////

struct Spheriod_df {
    a: dfloat,
    b: dfloat,
    c: dfloat,
    m: dfmat3
};

const WGS84_A_df = dfloat(6378137.0f, 0.0f);
const WGS84_B_df = dfloat(6378137.0f, 0.0f);
const WGS84_C_df = dfloat(6356752.314245f, 0.0);

const WGS84_M_df = dfmat3(
    mat3x3f(
        1.0/(WGS84_A*WGS84_A), 0.0,      0.0,
        0.0,      1.0/(WGS84_B*WGS84_B), 0.0,
        0.0,      0.0,      1.0/(WGS84_C*WGS84_C)
    ),
    mat3x3f(
        0.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
        0.0, 0.0, 0.0
    )
);

const SPHERIOD_WGS84_df = Spheriod_df(WGS84_A_df, WGS84_B_df, WGS84_C_df, WGS84_M_df);

fn buildSpheriod_df(a: dfloat, b: dfloat, c: dfloat) -> Spheriod_df {

    let s: Spheriod_df = Spheriod_df(
        a,b,c,
        dfmat3_make(
            dfloat_rsq(a), df(0.0),      df(0.0),
            df(0.0),      dfloat_rsq(b), df(0.0),
            df(0.0),      df(0.0),      dfloat_rsq(c)
        )
    );

    return s;
}

fn spheriod_matrix_df(s: Spheriod_df) -> dfmat3 {
    return dfmat3_make(
        dfloat_rsq(s.a), df(0.0),      df(0.0),
        df(0.0),      dfloat_rsq(s.b), df(0.0),
        df(0.0),      df(0.0),      dfloat_rsq(s.c)
    );
}

fn spheriod_radius_df(d: dfvec3, s: Spheriod_df) -> dfloat {
    let n = dfvec3_normalize(d);
    let denom = dfvec3_dot(n, dfvec3_mul(s.m, n));
    return dfloat_rsqrt(denom);
}

fn spheriod_matrix_radius_df(d: dfvec3, m: dfmat3) -> dfloat {
    let n = dfvec3_normalize(d);
    let denom = dfvec3_dot(n, dfvec3_mul(m, n));
    return dfloat_rsqrt(denom);
}

fn earth_radius_df(d: dfvec3) -> dfloat {
    return spheriod_radius_df(d, SPHERIOD_WGS84_df);
}

fn clamp_to_ground_df(p: dfvec3, s: Spheriod_df, h: dfloat) -> dfvec3 {
    let d = dfvec3_normalize(p);
    let t = spheriod_radius_df(d, s);
    return dfvec3_scale(d, dfloat_add(h, t));
}