//depth.module.wgsl

#include "dfloat.module.wgsl"

fn linear_depth(near: f32, far: f32, vz: f32) -> f32 {
    return (-vz - near) / (far - near);
}

fn linear_depth_df(near: dfloat, far: dfloat, vz: dfloat) -> dfloat {
    return dfloat_div(dfloat_sub(dfloat_neg(vz), near), dfloat_sub(far,near));
}

fn frag_depth_log(c: f32, near: f32, far: f32, vz: f32) -> f32 {
    let z = far - (-vz - near);
    let f = far - near;
    return log2(c * z + 1.0) / log2(c * f + 1.0);
}

fn frag_depth_log_df(c: dfloat, near: dfloat, far: dfloat, vz: dfloat) -> dfloat{
    let z = dfloat_sub(far, dfloat_sub(dfloat_neg(vz), near));
    let f = dfloat_sub(far, near);
    let a = dfloat_log2(dfloat_add(dfloat_mul(c, z), df(1.0)));
    let b = dfloat_log2(dfloat_add(dfloat_mul(c, f), df(1.0)));
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
fn range_stretch_depth(x_: f32, a_: f32, b_: f32, n_: f32, f_: f32, k_: f32) -> f32 {
    let x = (-x_) - n_;
    let f = f_ - n_;
    let k = f * (1.0 - k_) / 2.0;
    var y: f32;
    if(x<a_) {
        y = k / a_ * x;
    } else if (x < b_) {
        y = k + (f - 2.0 * k) / (b_ - a_) * (x - a_);
    } else {
        y = (f - k) + k / (f - b_) * (x - b_);
    }
    return y / f;
}
