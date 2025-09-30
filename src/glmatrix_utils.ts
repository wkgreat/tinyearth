import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import type { NumArr3, NumArr4 } from "./defines.js";
glMatrix.setMatrixArrayType(Array);

// vec3
export function vec3_array(v: vec3): NumArr3 {
    return [v[0], v[1], v[2]];
}

export function vec3_scale(v1: vec3, a: number): vec3 {
    return vec3.scale(vec3.create(), v1, a);
}

export function vec3_add(v1: vec3, v2: vec3): vec3 {
    return vec3.add(vec3.create(), v1, v2);
}

export function vec3_normalize(v: vec3): vec3 {
    return vec3.normalize(vec3.create(), v);
}

export function vec3_cross(v1: vec3, v2: vec3): vec3 {
    return vec3.cross(vec3.create(), v1, v2);
}

export function vec3_sub(v1: vec3, v2: vec3): vec3 {
    return vec3.subtract(vec3.create(), v1, v2);
}

export function vec3_div(v1: vec3, v2: vec3): vec3 {
    return vec3.divide(vec3.create(), v1, v2);
}

export function vec3_t4(v: vec3, d: number = 1): vec4 {
    return vec4.fromValues(v[0], v[1], v[2], d);
}

export function vec3_t4_affine(v: vec3, m: mat4): vec4 {
    const u = vec4.transformMat4(vec4.create(), vec3_t4(v, 1), m);
    return vec4_scale(u, 1.0 / u[3]);
}

// vec4
export function vec4_t3(v: vec4): vec3 {
    return vec3.fromValues(v[0], v[1], v[2]);
}

export function vec4_scale(v: vec4, a: number): vec4 {
    return vec4.scale(vec4.create(), v, a);
}

export function vec4_affine(v: vec4, m: mat4): vec4 {
    const u = vec4.transformMat4(vec4.create(), v, m);
    return vec4_scale(u, 1.0 / u[3]);
}

export function vec4_array(v: vec4): NumArr4 {
    return [v[0], v[1], v[2], v[3]];
}

// mat4
export function mat4_mul(m1: mat4, m2: mat4): mat4 {
    return mat4.multiply(mat4.create(), m1, m2);
}

export function mat4_inv(m: mat4): mat4 | null {
    return mat4.invert(mat4.create(), m);
}