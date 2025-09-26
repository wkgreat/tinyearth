import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
glMatrix.setMatrixArrayType(Array);

// vec3
export function vec3_scale(v1, a) {
    return vec3.scale(vec3.create(), v1, a);
}

export function vec3_add(v1, v2) {
    return vec3.add(vec3.create(), v1, v2);
}

export function vec3_normalize(v) {
    return vec3.normalize(vec3.create(), v);
}

export function vec3_cross(v1, v2) {
    return vec3.cross(vec3.create(), v1, v2);
}

export function vec3_sub(v1, v2) {
    return vec3.subtract(vec3.create(), v1, v2);
}

export function vec3_div(v1, v2) {
    return vec3.divide(vec3.create(), v1, v2);
}

export function vec3_t4(v, d = 1) {
    return vec4.fromValues(v[0], v[1], v[2], d);
}

export function vec3_t4_affine(v, m) {
    const u = vec4.transformMat4(vec4.create(), vec3_t4(v, 1), m);
    return vec4_scale(u, 1.0 / u[3]);
}

// vec4
export function vec4_t3(v) {
    return vec3.fromValues(v[0], v[1], v[2]);
}

export function vec4_scale(v, a) {
    return vec4.scale(vec4.create(), v, a);
}

export function vec4_affine(v, m) {
    const u = vec4.transformMat4(vec4.create(), v, m);
    return vec4_scale(u, 1.0 / u[3]);
}

// mat4
export function mat4_mul(m1, m2) {
    return mat4.multiply(mat4.create(), m1, m2);
}

export function mat4_inv(m) {
    return mat4.invert(mat4.create(), m);
}