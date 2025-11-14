#ifndef DFLOAT_GLSL_
#define DFLOAT_GLSL_
struct dfloat {
    float high;
    float low;
};

struct dfvec2 {
    vec2 high;
    vec2 low;
};

struct dfvec3 {
    vec3 high;
    vec3 low;
};

struct dfvec4 {
    vec4 high;
    vec4 low;
};

struct dfmat2 {
    mat2 high;
    mat2 low;
};

struct dfmat3 {
    mat3 high;
    mat3 low;
};

struct dfmat4 {
    mat4 high;
    mat4 low;
};

////dfloat

dfloat df(float x) {
    return dfloat(x, 0.0);
}

dfloat dfloat_make(float x) {
    dfloat result;
    result.high = x;  
    result.low  = 0.0;
    return result;
}

float dfloat_out(dfloat a) {
    return a.high + a.low;
}

//Kahan / Dekker
dfloat dfloat_add(dfloat a, dfloat b) {
    float t1 = a.high + b.high;
    float e  = t1 - a.high;
    float t2 = ((b.high - e) + (a.high - (t1 - e))) + a.low + b.low;
    float hi = t1 + t2;
    float lo = t2 - (hi - t1);
    return dfloat(hi, lo);
}

dfloat dfloat_sub(dfloat a, dfloat b) {
    float s1 = a.high - b.high;
    float e  = s1 - a.high;
    float s2 = ((-b.high - e) + (a.high - (s1 - e))) + a.low - b.low;
    float hi = s1 + s2;
    float lo = s2 - (hi - s1);
    return dfloat(hi, lo);
}

const float DFLOAT_MUL_SPLIT = 4097.0;

dfloat dfloat_mul(dfloat a, dfloat b)
{
    // 主乘积（高部分）
    float c11 = a.high * b.high;

    // Dekker 分裂：把高位 float 拆成两个精度块
    float a_split = a.high * DFLOAT_MUL_SPLIT;
    float a_hi = a_split - (a_split - a.high);
    float a_lo = a.high - a_hi;

    float b_split = b.high * DFLOAT_MUL_SPLIT;
    float b_hi = b_split - (b_split - b.high);
    float b_lo = b.high - b_hi;

    // 计算误差项
    float err1 = ((a_hi * b_hi - c11) + a_hi * b_lo + a_lo * b_hi) + a_lo * b_lo;
    float err2 = a.high * b.low + a.low * b.high;

    float t1 = c11 + err1 + err2;
    float e  = t1 - c11;
    float t2 = ((err1 + err2) - e) + (c11 - (t1 - e));

    // 得到高低部分
    float hi = t1 + t2;
    float lo = t2 - (hi - t1);

    return dfloat(hi, lo);
}

dfloat dfloat_div(dfloat a, dfloat b) {
    float q1 = a.high / b.high;
    dfloat qb = dfloat_mul(dfloat_make(q1), b);
    dfloat r = dfloat_sub(a, qb);
    float q2 = r.high / b.high;
    dfloat result = dfloat_add(dfloat_make(q1), dfloat_make(q2));
    return result;
}

// sqrt(a)
dfloat dfloat_sqrt(dfloat a) {
    float xh = sqrt(a.high);
    float err = ((a.high - xh * xh) + a.low) * 0.5 / xh;
    float xl = err;
    return dfloat(xh, xl);
}

// 1/pow(a,2)
dfloat dfloat_rsq(dfloat a) {
    return dfloat_div(dfloat_make(1.0), dfloat_mul(a, a));
}
// 1/sqrt(a)
dfloat dfloat_rsqrt(dfloat a) {
    return dfloat_div(df(1.0), dfloat_sqrt(a));
}

// -a
dfloat dfloat_neg(dfloat a) {
    return dfloat(-a.high, -a.low);
}

// 1/a
dfloat dfloat_rcp(dfloat a) {
    dfloat result;
    result.high = 1.0 / a.high;
    result.low = -result.high * result.high * a.low;
    return result;
}

const float INV_LN2 = 1.4426950408889634;

dfloat dfloat_log2(dfloat a) {
    return dfloat(log2(a.high), a.low * INV_LN2 / a.high);
}

dfloat dfloat_abs(dfloat a) {
    if(a.high < 0.0) {
        return dfloat(-a.high, -a.low);
    } else {
        return a;
    }
}

//// dfvec2

dfvec2 dfv2(vec2 v) {
    dfloat v0 = df(v[0]);
    dfloat v1 = df(v[1]);
    return dfvec2(
        vec2(v0.high,v1.high),
        vec2(v0.low, v1.low)
    );
}

vec2 dfvec2_out(dfvec2 v) {
    return vec2(
        v.high[0] + v.low[0],
        v.high[1] + v.low[1]
    );
}

dfvec2 dfvec2_add(dfvec2 a, dfvec2 b) {
    dfvec2 result;
    vec2 t = a.high + b.high;
    vec2 e;
    if(abs(a.high.x) > abs(b.high.x)) {
        e = a.high - (t - b.high);
    } else {
        e = b.high - (t - a.high);
    }
    result.high = t;
    result.low  = a.low + b.low + e;
    return result;
}
dfvec2 dfvec2_sub(dfvec2 a, dfvec2 b) {
    dfvec2 result;
    result.high = a.high - b.high;
    result.low  = a.low - b.low;
    return result;
}

////dfvec3
dfvec3 dfv3(vec3 v) {
    dfloat v0 = df(v[0]);
    dfloat v1 = df(v[1]);
    dfloat v2 = df(v[2]);
    return dfvec3(
        vec3(v0.high,v1.high,v2.high),
        vec3(v0.low, v1.low, v2.low)
    );
}

vec3 dfvec3_out(dfvec3 v) {
    return vec3(
        v.high[0] + v.low[0],
        v.high[1] + v.low[1],
        v.high[2] + v.low[2]
    );
}

dfvec3 dfvec3_add(dfvec3 a, dfvec3 b) {
    vec3 s1 = a.high + b.high;
    vec3 e  = s1 - a.high;
    vec3 s2 = ((b.high - e) + (a.high - (s1 - e))) + a.low + b.low;
    vec3 hi = s1 + s2;
    vec3 lo = s2 - (hi - s1);
    return dfvec3(hi, lo);
}

dfvec3 dfvec3_sub(dfvec3 a, dfvec3 b) {
    dfvec3 r;
    vec3 s = a.high - b.high;
    vec3 v = s - a.high;
    vec3 err_high = (a.high - (s - v)) - (b.high + v);
    vec3 t = err_high + (a.low - b.low);
    r.high = s + t;
    r.low  = t - (r.high - s);
    return r;
}

dfloat dfvec3_dot(dfvec3 a, dfvec3 b) {
    dfloat x = dfloat_mul(df(a.high.x), df(b.high.x));
    dfloat y = dfloat_mul(df(a.high.y), df(b.high.y));
    dfloat z = dfloat_mul(df(a.high.z), df(b.high.z));
    return dfloat_add(dfloat_add(x, y), z);
}

dfvec3 dfvec3_normalize(dfvec3 v) {
    // 1. 计算平方和
    dfloat x2 = dfloat_mul(df(v.high.x), df(v.high.x));
    dfloat y2 = dfloat_mul(df(v.high.y), df(v.high.y));
    dfloat z2 = dfloat_mul(df(v.high.z), df(v.high.z));

    dfloat sum = dfloat_add(dfloat_add(x2, y2), z2);

    // 2. 求长度
    dfloat len = dfloat_sqrt(sum);

    // 3. 求倒数长度
    dfloat invLen = dfloat_div(df(1.0), len);

    // 4. 返回归一化向量
    dfvec3 outv;
    outv.high = v.high * invLen.high;
    outv.low  = v.high * invLen.low + v.low * invLen.high; // 近似高精度补偿
    return outv;
}

dfvec3 dfvec3_mul(dfmat3 m, dfvec3 v) {
    // 主乘积 (高位 × 高位)
    vec3 highPart = m.high * v.high;

    // GLSL 矩阵×向量运算是逐列点积，因此直接写：
    highPart = m.high * v.high;

    // 误差补偿项
    vec3 lowPart = 
        m.high * v.low +   // 主矩阵 × 向量低位
        m.low  * v.high +  // 矩阵低位 × 向量主值
        m.low  * v.low;    // 双低项（非常小，可选）

    return dfvec3(highPart, lowPart);
}

dfvec3 dfvec3_scale(dfvec3 v, dfloat s) {
    dfvec3 result;

    // 高位
    result.high = v.high * s.high;

    // 低位补偿
    result.low = v.high * s.low + v.low * s.high + v.low * s.low; // 可选择忽略最后一项提高速度

    return result;
}

dfloat dfvec3_length(dfvec3 v) {
    // v·v = x² + y² + z² (双浮点计算)
    dfloat xx = dfloat_mul(dfloat_make(v.high.x), dfloat_make(v.high.x));
    dfloat yy = dfloat_mul(dfloat_make(v.high.y), dfloat_make(v.high.y));
    dfloat zz = dfloat_mul(dfloat_make(v.high.z), dfloat_make(v.high.z));

    dfloat sum = dfloat_add(dfloat_add(xx, yy), zz);

    // 高部分平方根
    float len_high = sqrt(sum.high);

    // 粗略修正低部分 (近似)
    float err = (sum.high - len_high * len_high) + sum.low;
    float len_low = err / (2.0 * len_high);

    return dfloat(len_high, len_low);
}

dfvec4 dfvec3_force4(dfvec3 v, dfloat w) {
    return dfvec4(
        vec4(v.high, w.high),
        vec4(v.low, w.low)
    );
}

dfvec4 dfv3t4(dfvec3 v, dfloat w) {
    return dfvec3_force4(v, w);
}

////dfvec4

dfvec4 dfv4(vec4 v) {
    dfloat v0 = df(v[0]);
    dfloat v1 = df(v[1]);
    dfloat v2 = df(v[2]);
    dfloat v3 = df(v[3]);
    return dfvec4(
        vec4(v0.high,v1.high,v2.high,v3.high),
        vec4(v0.low,v1.low,v2.low,v3.low)
    );
}

dfloat dfvec4_at(dfvec4 v, int i) {
    return dfloat(v.high[i], v.low[i]);
}

dfloat dfvec4_z(dfvec4 v) {
    return dfvec4_at(v, 2);
}

dfloat dfvec4_w(dfvec4 v) {
    return dfvec4_at(v, 3);
}

vec4 dfvec4_out(dfvec4 v) {
    return vec4(
        v.high[0] + v.low[0],
        v.high[1] + v.low[1],
        v.high[2] + v.low[2],
        v.high[3] + v.low[3]
    );
}

dfvec3 dfvec4_force3(dfvec4 v) {
    return dfvec3(
        v.high.xyz,
        v.low.xyz
    );
}

dfvec3 dfv4t3(dfvec4 v) {
    return dfvec4_force3(v);
}

dfvec2 dfvec4_force2(dfvec4 v) {
    return dfvec2(
        v.high.xy,
        v.low.xy
    );
}

dfvec4 dfvec4_mul(dfmat4 m, dfvec4 v) {
    dfvec4 result;
    vec4 highPart = m.high * v.high;
    vec4 lowPart = m.high * v.low + m.low  * v.high + m.low  * v.low;  
    result.high = highPart;
    result.low  = lowPart;
    return result;
}

dfvec4 dfvec4_scale(dfvec4 v, dfloat s) {
    dfvec4 result;
    result.high = v.high * s.high;
    result.low = v.high * s.low + v.low * s.high + v.low * s.low;
    return result;
}

dfvec4 dfvec4_normw(dfvec4 v) {
    return dfvec4_scale(v, dfloat_rcp(dfvec4_w(v)));
}

dfvec4 dfvec4_normabsw(dfvec4 v) {
    return dfvec4_scale(v, dfloat_rcp(dfloat_abs(dfvec4_w(v)))); 
}

////dfmat3

dfmat3 dfmat3_make(
    dfloat m00, dfloat m01, dfloat m02, 
    dfloat m10, dfloat m11, dfloat m12, 
    dfloat m20, dfloat m21, dfloat m22
) {
    return dfmat3(
        mat3(
            m00.high,m01.high,m02.high,
            m10.high,m11.high,m12.high,
            m20.high,m21.high,m22.high
        ),
        mat3(
            m00.low,m01.low,m02.low,
            m10.low,m11.low,m12.low,
            m20.low,m21.low,m22.low
        )
    );
}

dfmat3 dfmat3_from_mat3(mat3 m) {
    return dfmat3(
        m,
        mat3(
            0.0,0.0,0.0,
            0.0,0.0,0.0,
            0.0,0.0,0.0
        )
    );
}

////dfmat4
dfmat4 dfmat4_mul(dfmat4 a, dfmat4 b) {
    dfmat4 result;
    result.high = a.high * b.high;
    result.low = a.high * b.low + a.low * b.high + a.low * b.low;  
    return result;
}

dfmat4 dfmat4_inv(dfmat4 a) {
    dfmat4 result;
    result.high = inverse(a.high);
    result.low = -result.high * (a.low * result.high);
    return result;
}
#endif