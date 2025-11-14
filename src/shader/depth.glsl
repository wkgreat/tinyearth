#ifndef DEPTH_GLSL_
#define DEPTH_GLSL_

#include "dfloat.glsl"

float frag_depth(float depth) {
    return depth;
}

float frag_depth_log(float c, float far, float vz) {
    return log2(c * -vz + 1.0) / log2(c * far + 1.0);
}

dfloat frag_depth_log_df(dfloat c, dfloat far, dfloat vz) {
    dfloat a = dfloat_log2(dfloat_add(dfloat_mul(c, dfloat_neg(vz)), df(1.0)));
    dfloat b = dfloat_log2(dfloat_add(dfloat_mul(c, far), df(1.0)));
    return dfloat_div(a,b);
}

#endif