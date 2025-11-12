struct dfloat {
    float high;
    float low;
}

struct dfvec2 {
    vec2 high;
    vec2 low;
}

struct dfvec3 {
    vec3 high;
    vec3 low;
}

struct dfvec4 {
    vec4 high;
    vec4 low;
}

struct dfmat2 {
    mat2 high;
    mat2 low;
}

struct dfmat3 {
    mat3 high;
    mat3 low;
}

struct dfmat4 {
    mat4 high;
    mat4 low;
}

dfloat dfloat_make(float high, float low) {
    dfloat x;
    x.high = high;
    x.low = low;
    return x;
}

//Kahan / Dekker
dfloat dfloat_add(dfloat a, dfloat b) {
    float t1 = a.high + b.high;
    float e  = t1 - a.high;
    float t2 = ((b.high - e) + (a.high - (t1 - e))) + a.low + b.low;
    float hi = t1 + t2;
    float lo = t2 - (hi - t1);
    return make_dfloat(hi, lo);
}