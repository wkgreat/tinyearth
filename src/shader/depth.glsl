#ifndef DEPTH_GLSL_
#define DEPTH_GLSL_

#include "dfloat.glsl"

float linear_depth(float near, float far, float vz) {
    return (-vz - near) / (far - near);
}

dfloat linear_depth_df(dfloat near, dfloat far, dfloat vz) {
    return dfloat_div(dfloat_sub(dfloat_neg(vz), near), dfloat_sub(far,near));
}

float frag_depth_log(float c, float near, float far, float vz) {
    float z = far - (-vz - near);
    float f = far - near;
    return log2(c * z + 1.0) / log2(c * f + 1.0);
}

dfloat frag_depth_log_df(dfloat c, dfloat near, dfloat far, dfloat vz) {
    dfloat z = dfloat_sub(far, dfloat_sub(dfloat_neg(vz), near));
    dfloat f = dfloat_sub(far, near);
    dfloat a = dfloat_log2(dfloat_add(dfloat_mul(c, z), df(1.0)));
    dfloat b = dfloat_log2(dfloat_add(dfloat_mul(c, f), df(1.0)));
    return dfloat_sub(df(1.0), dfloat_div(a, b));
}

/**
x the view postion negative z value
a range left value
b range right value
n projection near
f projection far
k stretch factor [0, 1] the k larger, the more stretch
*/
float range_stretch_depth(float x, float a, float b, float n, float f, float k) {
    x = (-x) - n;
    f = f - n;
    k = f * (1.0 - k) / 2.0;
    float y;
    if(x<a) {
        y = k / a * x;
    } else if (x < b) {
        y = k + (f - 2.0 * k) / (b - a) * (x - a);
    } else {
        y = (f - k) + k / (f - b) * (x - b);
    }
    return y / f;
}

// dfloat range_stretch_depth_df(dfloat x, dfloat a, dfloat b, dfloat n, dfloat f, dfloat k) {
//     x = (-x) - n;
//     f = f - n;
//     k = f * (1.0 - k) / 2.0;
//     dfloat y;
//     if(x < a) {
//         y = k / a * x;
//     } else if (x < b) {
//         y = k + (f - 2.0 * k) / (b - a) * (x - a);
//     } else {
//         y = (f - k) + k / (f - b) * (x - b);
//     }
//     return y / f;
// }

#endif