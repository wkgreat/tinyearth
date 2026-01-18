//dfloat.module.wgsl

struct dfloat {
    high: f32,
    low: f32
};

struct dfvec2 {
    high: vec2<f32>,
    low: vec2<f32>
};

struct dfvec3 {
    high: vec3<f32>,
    low: vec3<f32>
};

struct dfvec4 {
    high: vec4<f32>,
    low: vec4<f32>
};

struct dfmat2 {
    high: mat2x2<f32>,
    low: mat2x2<f32>
};

struct dfmat3 {
    high: mat3x3<f32>,
    low: mat3x3<f32>
};

struct dfmat4 {
    high: mat4x4<f32>,
    low: mat4x4<f32>
};

////dfloat

fn df(x: f32) -> dfloat {
    return dfloat(x, 0.0);
}

fn dfloat_make(x:f32) -> dfloat {
    var result: dfloat = dfloat(0,0);
    result.high = x;  
    result.low  = 0.0;
    return result;
}

fn dfloat_out(a: dfloat) -> f32 {
    return a.high + a.low;
}

//Kahan / Dekker
fn dfloat_add(a: dfloat, b: dfloat) -> dfloat {
    let t1 = a.high + b.high;
    let e  = t1 - a.high;
    let t2 = ((b.high - e) + (a.high - (t1 - e))) + a.low + b.low;
    let hi = t1 + t2;
    let lo = t2 - (hi - t1);
    return dfloat(hi, lo);
}

fn dfloat_sub(a: dfloat, b: dfloat) -> dfloat {
    let s1 = a.high - b.high;
    let e  = s1 - a.high;
    let s2 = ((-b.high - e) + (a.high - (s1 - e))) + a.low - b.low;
    let hi = s1 + s2;
    let lo = s2 - (hi - s1);
    return dfloat(hi, lo);
}

const DFLOAT_MUL_SPLIT = 4097.0;

fn dfloat_mul(a: dfloat, b: dfloat) -> dfloat
{
    // 主乘积（高部分）
    let c11 = a.high * b.high;

    // Dekker 分裂：把高位 float 拆成两个精度块
    let a_split = a.high * DFLOAT_MUL_SPLIT;
    let a_hi = a_split - (a_split - a.high);
    let a_lo = a.high - a_hi;

    let b_split = b.high * DFLOAT_MUL_SPLIT;
    let b_hi = b_split - (b_split - b.high);
    let b_lo = b.high - b_hi;

    // 计算误差项
    let err1 = ((a_hi * b_hi - c11) + a_hi * b_lo + a_lo * b_hi) + a_lo * b_lo;
    let err2 = a.high * b.low + a.low * b.high;

    let t1 = c11 + err1 + err2;
    let e  = t1 - c11;
    let t2 = ((err1 + err2) - e) + (c11 - (t1 - e));

    // 得到高低部分
    let hi = t1 + t2;
    let lo = t2 - (hi - t1);

    return dfloat(hi, lo);
}

fn dfloat_div(a: dfloat, b: dfloat) -> dfloat {
    let q1 = a.high / b.high;
    let qb = dfloat_mul(dfloat_make(q1), b);
    let r = dfloat_sub(a, qb);
    let q2 = r.high / b.high;
    let result = dfloat_add(dfloat_make(q1), dfloat_make(q2));
    return result;
}

// sqrt(a)
fn dfloat_sqrt(a: dfloat) -> dfloat {
    let xh = sqrt(a.high);
    let err = ((a.high - xh * xh) + a.low) * 0.5 / xh;
    let xl = err;
    return dfloat(xh, xl);
}

// 1/pow(a,2)
fn dfloat_rsq(a: dfloat) -> dfloat {
    return dfloat_div(dfloat_make(1.0), dfloat_mul(a, a));
}
// 1/sqrt(a)
fn dfloat_rsqrt(a: dfloat) -> dfloat {
    return dfloat_div(df(1.0), dfloat_sqrt(a));
}

// -a
fn dfloat_neg(a: dfloat) -> dfloat {
    return dfloat(-a.high, -a.low);
}

// 1/a
fn dfloat_rcp(a: dfloat) -> dfloat {
    var result: dfloat = dfloat(0,0);
    result.high = 1.0 / a.high;
    result.low = -result.high * result.high * a.low;
    return result;
}

const INV_LN2 = 1.4426950408889634;

fn dfloat_log2(a: dfloat) -> dfloat {
    return dfloat(log2(a.high), a.low * INV_LN2 / a.high);
}

fn dfloat_abs(a: dfloat) -> dfloat {
    if(a.high < 0.0) {
        return dfloat(-a.high, -a.low);
    } else {
        return a;
    }
}

//// dfvec2

fn dfv2(v: vec2<f32>) -> dfvec2 {
    let v0 = df(v[0]);
    let v1 = df(v[1]);
    return dfvec2(
        vec2(v0.high,v1.high),
        vec2(v0.low, v1.low)
    );
}

fn dfvec2_out(v: dfvec2) -> vec2<f32> {
    return vec2<f32>(
        v.high[0] + v.low[0],
        v.high[1] + v.low[1]
    );
}

fn dfvec2_add(a: dfvec2, b: dfvec2) -> dfvec2 {
    var result: dfvec2 = dfv2(vec2f(0,0));
    let t = a.high + b.high;
    var e: vec2f;
    if(abs(a.high.x) > abs(b.high.x)) {
        e = a.high - (t - b.high);
    } else {
        e = b.high - (t - a.high);
    }
    result.high = t;
    result.low  = a.low + b.low + e;
    return result;
}

fn dfvec2_sub(a: dfvec2, b: dfvec2) -> dfvec2 {
    var result: dfvec2 = dfv2(vec2f(0,0));
    result.high = a.high - b.high;
    result.low  = a.low - b.low;
    return result;
}

fn dfvec2_mul(a: dfvec2, b: dfvec2) -> dfvec2 {
    let high = a.high * b.high;
    let low = a.high * b.low + a.low * b.high + a.low * b.low;
    return dfvec2(high, low);
}

////dfvec3
fn dfv3(v: vec3<f32>) -> dfvec3 {
    let v0 = df(v[0]);
    let v1 = df(v[1]);
    let v2 = df(v[2]);
    return dfvec3(
        vec3(v0.high,v1.high,v2.high),
        vec3(v0.low, v1.low, v2.low)
    );
}

fn dfvec3_out(v: dfvec3) -> vec3<f32> {
    return vec3<f32>(
        v.high[0] + v.low[0],
        v.high[1] + v.low[1],
        v.high[2] + v.low[2]
    );
}

fn dfvec3_add(a: dfvec3, b: dfvec3) -> dfvec3 {
    let s1 = a.high + b.high;
    let e  = s1 - a.high;
    let s2 = ((b.high - e) + (a.high - (s1 - e))) + a.low + b.low;
    let hi = s1 + s2;
    let lo = s2 - (hi - s1);
    return dfvec3(hi, lo);
}

fn dfvec3_sub(a: dfvec3, b: dfvec3) -> dfvec3 {
    var r: dfvec3 = dfv3(vec3f(0,0,0));
    let s = a.high - b.high;
    let v = s - a.high;
    let err_high = (a.high - (s - v)) - (b.high + v);
    let t = err_high + (a.low - b.low);
    r.high = s + t;
    r.low  = t - (r.high - s);
    return r;
}

fn dfvec3_dot(a: dfvec3, b: dfvec3) -> dfloat {
    let x = dfloat_mul(df(a.high.x), df(b.high.x));
    let y = dfloat_mul(df(a.high.y), df(b.high.y));
    let z = dfloat_mul(df(a.high.z), df(b.high.z));
    return dfloat_add(dfloat_add(x, y), z);
}

fn dfvec3_normalize(v: dfvec3) -> dfvec3 {
    // 1. 计算平方和
    let x2 = dfloat_mul(df(v.high.x), df(v.high.x));
    let y2 = dfloat_mul(df(v.high.y), df(v.high.y));
    let z2 = dfloat_mul(df(v.high.z), df(v.high.z));

    let sum = dfloat_add(dfloat_add(x2, y2), z2);

    // 2. 求长度
    let len = dfloat_sqrt(sum);

    // 3. 求倒数长度
    let invLen = dfloat_div(df(1.0), len);

    // 4. 返回归一化向量
    var outv: dfvec3 = dfv3(vec3f(0,0,0));
    outv.high = v.high * invLen.high;
    outv.low  = v.high * invLen.low + v.low * invLen.high; // 近似高精度补偿
    return outv;
}

fn dfvec3_mul(m: dfmat3, v: dfvec3) -> dfvec3 {
    // 主乘积 (高位 × 高位)
    var highPart = m.high * v.high;

    // GLSL 矩阵×向量运算是逐列点积，因此直接写：
    highPart = m.high * v.high;

    // 误差补偿项
    let lowPart = 
        m.high * v.low +   // 主矩阵 × 向量低位
        m.low  * v.high +  // 矩阵低位 × 向量主值
        m.low  * v.low;    // 双低项（非常小，可选）

    return dfvec3(highPart, lowPart);
}

fn dfvec3_scale(v: dfvec3, s: dfloat) -> dfvec3 {
    var result: dfvec3 = dfv3(vec3f(0,0,0));

    // 高位
    result.high = v.high * s.high;

    // 低位补偿
    result.low = v.high * s.low + v.low * s.high + v.low * s.low; // 可选择忽略最后一项提高速度

    return result;
}

fn dfvec3_length(v: dfvec3) -> dfloat {
    // v·v = x² + y² + z² (双浮点计算)
    let xx = dfloat_mul(dfloat_make(v.high.x), dfloat_make(v.high.x));
    let yy = dfloat_mul(dfloat_make(v.high.y), dfloat_make(v.high.y));
    let zz = dfloat_mul(dfloat_make(v.high.z), dfloat_make(v.high.z));

    let sum = dfloat_add(dfloat_add(xx, yy), zz);

    // 高部分平方根
    let len_high = sqrt(sum.high);

    // 粗略修正低部分 (近似)
    let err = (sum.high - len_high * len_high) + sum.low;
    let len_low = err / (2.0 * len_high);

    return dfloat(len_high, len_low);
}

fn dfvec3_force4(v: dfvec3, w: dfloat) -> dfvec4 {
    return dfvec4(
        vec4(v.high, w.high),
        vec4(v.low, w.low)
    );
}

fn dfv3t4(v: dfvec3, w: dfloat) -> dfvec4 {
    return dfvec3_force4(v, w);
}

////dfvec4

fn dfv4(v: vec4<f32>) -> dfvec4 {
    let v0 = df(v[0]);
    let v1 = df(v[1]);
    let v2 = df(v[2]);
    let v3 = df(v[3]);
    return dfvec4(
        vec4(v0.high,v1.high,v2.high,v3.high),
        vec4(v0.low,v1.low,v2.low,v3.low)
    );
}

fn dfvec4_d2(v: dfvec4) -> dfvec2 {
    return dfvec2(
        v.high.xy,
        v.low.xy
    );
}

fn dfvec4_at(v: dfvec4, i: u32) -> dfloat {
    return dfloat(v.high[i], v.low[i]);
}

fn dfvec4_z(v: dfvec4) -> dfloat {
    return dfvec4_at(v, 2);
}

fn dfvec4_w(v: dfvec4) -> dfloat {
    return dfvec4_at(v, 3);
}

fn dfvec4_out(v: dfvec4) -> vec4<f32> {
    return vec4(
        v.high[0] + v.low[0],
        v.high[1] + v.low[1],
        v.high[2] + v.low[2],
        v.high[3] + v.low[3]
    );
}

fn dfvec4_force3(v: dfvec4) -> dfvec3 {
    return dfvec3(
        v.high.xyz,
        v.low.xyz
    );
}

fn dfv4t3(v: dfvec4) -> dfvec3 {
    return dfvec4_force3(v);
}

fn dfvec4_force2(v: dfvec4) -> dfvec2 {
    return dfvec2(
        v.high.xy,
        v.low.xy
    );
}

fn dfvec4_mul(m: dfmat4, v: dfvec4) -> dfvec4 {
    var result: dfvec4 = dfv4(vec4f(0,0,0,0));
    let highPart = m.high * v.high;
    let lowPart = m.high * v.low + m.low  * v.high + m.low  * v.low;  
    result.high = highPart;
    result.low  = lowPart;
    return result;
}

fn dfvec4_scale(v: dfvec4, s: dfloat) -> dfvec4 {
    var result: dfvec4 = dfv4(vec4f(0,0,0,0));
    result.high = v.high * s.high;
    result.low = v.high * s.low + v.low * s.high + v.low * s.low;
    return result;
}

fn dfvec4_normw(v: dfvec4) -> dfvec4 {
    return dfvec4_scale(v, dfloat_rcp(dfvec4_w(v)));
}

fn dfvec4_normabsw(v: dfvec4) -> dfvec4 {
    return dfvec4_scale(v, dfloat_rcp(dfloat_abs(dfvec4_w(v)))); 
}

////dfmat3

fn dfmat3_make(
    m00: dfloat, m01: dfloat, m02: dfloat, 
    m10: dfloat, m11: dfloat, m12: dfloat, 
    m20: dfloat, m21: dfloat, m22: dfloat
) -> dfmat3 {
    return dfmat3(
        mat3x3f(
            m00.high,m01.high,m02.high,
            m10.high,m11.high,m12.high,
            m20.high,m21.high,m22.high
        ),
        mat3x3f(
            m00.low,m01.low,m02.low,
            m10.low,m11.low,m12.low,
            m20.low,m21.low,m22.low
        )
    );
}

fn dfmat3_from_mat3(m: mat3x3f) -> dfmat3 {
    return dfmat3(
        m,
        mat3x3f(
            0.0,0.0,0.0,
            0.0,0.0,0.0,
            0.0,0.0,0.0
        )
    );
}

////dfmat4 

fn dfmat4_new() -> dfmat4 {
    return dfmat4(
        mat4x4f(),
        mat4x4f()
    );
}

fn dfmat4_mul(a: dfmat4, b: dfmat4) -> dfmat4 {
    var result: dfmat4 = dfmat4_new();
    result.high = a.high * b.high;
    result.low = a.high * b.low + a.low * b.high + a.low * b.low;  
    return result;
}

fn inverse_mat4(m: mat4x4<f32>) -> mat4x4<f32> {
    let a00 = m[0][0]; let a01 = m[0][1]; let a02 = m[0][2]; let a03 = m[0][3];
    let a10 = m[1][0]; let a11 = m[1][1]; let a12 = m[1][2]; let a13 = m[1][3];
    let a20 = m[2][0]; let a21 = m[2][1]; let a22 = m[2][2]; let a23 = m[2][3];
    let a30 = m[3][0]; let a31 = m[3][1]; let a32 = m[3][2]; let a33 = m[3][3];

    let b00 = a00 * a11 - a01 * a10;
    let b01 = a00 * a12 - a02 * a10;
    let b02 = a00 * a13 - a03 * a10;
    let b03 = a01 * a12 - a02 * a11;
    let b04 = a01 * a13 - a03 * a11;
    let b05 = a02 * a13 - a03 * a12;
    let b06 = a20 * a31 - a21 * a30;
    let b07 = a20 * a32 - a22 * a30;
    let b08 = a20 * a33 - a23 * a30;
    let b09 = a21 * a32 - a22 * a31;
    let b10 = a21 * a33 - a23 * a31;
    let b11 = a22 * a33 - a23 * a32;

    let det =
          b00 * b11
        - b01 * b10
        + b02 * b09
        + b03 * b08
        - b04 * b07
        + b05 * b06;

    // 不可逆时返回单位矩阵（避免 NaN）
    if (abs(det) < 1e-6) {
        return mat4x4<f32>();
    }

    let inv_det = 1.0 / det;

    return mat4x4<f32>(
        ( a11 * b11 - a12 * b10 + a13 * b09) * inv_det,
        (-a01 * b11 + a02 * b10 - a03 * b09) * inv_det,
        ( a31 * b05 - a32 * b04 + a33 * b03) * inv_det,
        (-a21 * b05 + a22 * b04 - a23 * b03) * inv_det,

        (-a10 * b11 + a12 * b08 - a13 * b07) * inv_det,
        ( a00 * b11 - a02 * b08 + a03 * b07) * inv_det,
        (-a30 * b05 + a32 * b02 - a33 * b01) * inv_det,
        ( a20 * b05 - a22 * b02 + a23 * b01) * inv_det,

        ( a10 * b10 - a11 * b08 + a13 * b06) * inv_det,
        (-a00 * b10 + a01 * b08 - a03 * b06) * inv_det,
        ( a30 * b04 - a31 * b02 + a33 * b00) * inv_det,
        (-a20 * b04 + a21 * b02 - a23 * b00) * inv_det,

        (-a10 * b09 + a11 * b07 - a12 * b06) * inv_det,
        ( a00 * b09 - a01 * b07 + a02 * b06) * inv_det,
        (-a30 * b03 + a31 * b01 - a32 * b00) * inv_det,
        ( a20 * b03 - a21 * b01 + a22 * b00) * inv_det
    );
}


fn dfmat4_inv(a: dfmat4) -> dfmat4 {
    var result: dfmat4 = dfmat4_new();
    result.high = inverse_mat4(a.high);
    result.low = -1 * result.high * (a.low * result.high);
    return result;
}