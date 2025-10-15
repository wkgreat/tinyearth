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

export function vec3_dot(v1: vec3, v2: vec3): number {
    return vec3.dot(v1, v2);
}

export function vec3_length(v: vec3): number {
    return vec3.length(v);
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

export function vec4_sub(v0: vec4, v1: vec4): vec4 {
    return vec4.sub(vec4.create(), v0, v1);
}

export function vec4_text(v: vec4): string {
    return `${v[0]},${v[1]},${v[2]},${v[3]}`
}

export function vec4_fromtext(t: string): vec4 | null {
    t = t.trim();
    if (t.match(/^-?\d+(\.\d+)?(e[+-]?\d+)?,-?\d+(\.\d+)?(e[+-]?\d+)?,-?\d+(\.\d+)?(e[+-]?\d+)?,-?\d+(\.\d+)?(e[+-]?\d+)?$/)) {
        const vs = t.split(",").slice(0, 4).map(v => parseFloat(v.trim()));
        return vec4.fromValues(vs[0] ?? 0, vs[1] ?? 0, vs[2] ?? 0, vs[3] ?? 0);
    }
    return null;

}

// mat4
export function mat4_mul(m1: mat4, m2: mat4): mat4 {
    return mat4.multiply(mat4.create(), m1, m2);
}

export function mat4_inv(m: mat4): mat4 | null {
    return mat4.invert(mat4.create(), m);
}

export function mat4_rotateAroundLine(point: vec4, axis: vec4, a: number): mat4 {

    const m = mat4.create()
    const t1 = mat4.create()
    const r = mat4.create()
    const t2 = mat4.create()

    // normalize axis vector
    const nAxis = vec3.normalize(vec3.create(), axis)

    //T1 move axis, make axis cross origin
    mat4.fromTranslation(t1, vec3.negate(vec3.create(), point))

    //R rotate around axis
    mat4.fromRotation(r, a, nAxis)

    //T2 move back
    mat4.fromTranslation(t2, point)

    mat4.multiply(m, r, t1)   // R * T1
    mat4.multiply(m, t2, m)   // T2 * (R * T1)

    return m

}