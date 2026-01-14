
//color.module.wgsl

const COLOR_RED = vec4f(1.0, 0.0, 0.0, 1.0);
const COLOR_GREEN = vec4f(0.0, 1.0, 0.0, 1.0);
const COLOR_BLUE = vec4f(0.0, 0.0, 1.0, 1.0);
const COLOR_WHITE = vec4f(1.0, 1.0, 1.0, 1.0);
const COLOR_YELLOW = vec4f(1.0, 1.0, 0.0, 1.0);
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
//depth.module.wgsl
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

//scene.module.wgsl
struct Camera {
    eye: vec4f,
    center: vec4f,
    up: vec4f,
    viewmtx: mat4x4f,
    relviewmtx: mat4x4f,
    height: f32
};

struct Projection {
    near: f32,
    far: f32,
    projmtx: mat4x4f
};

struct Sun {
    position: vec3f,
    color: vec4f
};

struct Model {
    modelmtx: mat4x4f
};

struct Viewport {
    viewport: vec2f,
    viewportmtx: mat4x4f
};

struct Depth {
    logDepthC: f32,
    neardepth: f32,
    fardepth: f32
}

struct Scene {
    camera: Camera,
    projection: Projection,
    sun: Sun,
    model: Model,
    viewport: Viewport,
    depth: Depth
};

struct CameraDF {
    eye: dfvec4,
    center: dfvec4,
    up: dfvec4,
    viewmtx: dfmat4,
    relviewmtx: dfmat4,
    height: dfloat
};

struct ProjectionDF {
    near: dfloat,
    far: dfloat,
    projmtx: dfmat4
};

struct SunDF {
    position: dfvec3,
    color: vec4f
};

struct ModelDF {
    modelmtx: dfmat4
};

struct ViewportDF {
    viewport: dfvec2,
    viewportmtx: dfmat4,
}

struct DepthDF {
    logDepthC: dfloat,
    neardepth: f32,
    fardepth: f32
}

struct SceneDF {
    camera: CameraDF,
    projection: ProjectionDF,
    sun: SunDF,
    model: ModelDF,
    viewport: ViewportDF,
    depth: DepthDF
};

fn relative(pos: dfvec3) -> dfvec3 {
    return dfvec3_sub(pos, dfvec4_force3(sceneDF.camera.eye));
}

fn absolute(pos: dfvec3) -> dfvec3 {
    return dfvec3_add(pos, dfvec4_force3(sceneDF.camera.eye));
}

//spheriod.module.wgsl
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
//tile.wgsl
struct Material {
    ambient: vec4f, //ka
    diffuse: vec4f, //kd
    specular: vec4f, //ks
    emission: vec4f, //ke
    shininess: f32 //ns
};

struct TileUniform {
    opacity: f32,
    enableNight: u32,
    isNight: u32
};


@binding(0) @group(0) var<uniform> scene : Scene;
@binding(0) @group(1) var<uniform> sceneDF : SceneDF;

@group(1) @binding(0) var image: texture_2d<f32>;
@group(1) @binding(1) var theSampler: sampler;
@group(1) @binding(2) var<uniform> tileUniform: TileUniform;
@group(1) @binding(3) var<uniform> material: Material;

struct VSInput {
    @location(0) position: vec3f,
    @location(1) position_high: vec3f,
    @location(2) position_low: vec3f,
    @location(3) texcoord: vec2f,
    @location(4) normal: vec3f,
    @location(5) normal_high: vec3f,
    @location(7) normal_low: vec3f
};

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) texcoord: vec2f,
    @location(1) normal: vec3f,
    @location(2) relworldpos: vec3f,
    @location(3) relviewz_high: f32,
    @location(4) relviewz_low: f32,
    @location(5) needskip: f32
};

@vertex fn vs(input: VSInput) -> VSOutput {

    var output: VSOutput;

    let relworldpos = dfvec3_force4(dfvec3_sub(dfvec3(input.position_high, input.position_low), dfvec4_force3(sceneDF.camera.eye)), df(1.0));
    let relviewpos = dfvec4_mul(sceneDF.camera.relviewmtx, relworldpos);
    let relndcpos = dfvec4_mul(sceneDF.projection.projmtx, relviewpos);
    output.needskip = 1.0 - step(0.0, dfloat_out(dfvec4_w(relndcpos)));
    let normal = dfvec3(input.normal_high, input.normal_low);

    output.position = dfvec4_out(relndcpos);

    output.relworldpos = dfvec3_out(dfvec4_force3(relworldpos));

    output.texcoord = input.texcoord;
    
    output.normal = dfvec3_out(dfvec3_normalize(normal));

    let rvz = dfvec4_z(relviewpos);
    output.relviewz_high = rvz.high;
    output.relviewz_low = rvz.low;

    return output;

}

fn surfanceColor(texcolor: vec4f, location: vec3f, norm: vec3f, cameraPosition: vec3f, light: Sun) -> vec4f {

    let vlight = normalize(light.position - location);
    let vsight = normalize(cameraPosition - location);
    let vhalf = normalize(vlight + vsight);
    var color = vec3(0, 0, 0);
    let ds = vec3(texcolor);
    color += ds * vec3(light.color) * max(0.1f, dot(norm, vlight));
    let ks = vec3(0.5f, 0.5f, 0.5f);
    let shininess = 100.0f;
    color += ks * vec3(light.color) * pow(max(0.0f, dot(norm, vhalf)), shininess);
    return vec4f(color, 1.0f);
}

fn nightSurfaceColor(texcolor: vec4f, location: vec3f, norm: vec3f, cameraPosition: vec3f, light: Sun) -> vec4f {
    let vlight = normalize(light.position - location);
    var color = vec3f(0, 0, 0);
    let ds = vec3f(texcolor);
    color += ds * vec3f(light.color) * max(0.0f, -dot(norm, vlight));
    let x: f32 = -dot(norm, vlight);

    let a: f32 = max(0.0f, x);

    return vec4f(color, a);
}

struct FSOutput {
    @location(0) color : vec4<f32>,
    @builtin(frag_depth) depth : f32
};

@fragment fn fs(input: VSOutput) -> FSOutput {

    if(input.needskip > 0.0) {
        discard;
    }

    var output: FSOutput;

    let pos: vec3f = input.relworldpos;
    let eye: vec3f = vec3<f32>(0.0,0.0,0.0);
    let norm: vec3f = input.normal;

    var texcolor: vec4f = vec4(0, 0, 0, 1);
    texcolor = textureSample(image, theSampler, input.texcoord);

    var fragcolor: vec4f = vec4f(0,0,0,1);
    var fragdepth: f32 = 1.0;

    if(tileUniform.enableNight != 0u) {
        if(tileUniform.isNight != 0u) {
            fragcolor = nightSurfaceColor(texcolor, pos, norm, eye, scene.sun);
        } else {
            fragcolor = surfanceColor(texcolor, pos, norm, eye, scene.sun);
        }
    } else {
        fragcolor = texcolor;
    }

    //logdepth
    // TODO 判断是否开启logdepth
    let rvz = dfloat(input.relviewz_high, input.relviewz_low);
    fragdepth = dfloat_out(frag_depth_log_df(sceneDF.depth.logDepthC, sceneDF.projection.near, sceneDF.projection.far, rvz));

    output.color = fragcolor;
    output.depth = fragdepth;

    return output;

}