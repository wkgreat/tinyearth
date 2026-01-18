import {
    glMatrix,
    vec2 as glvec2, vec3 as glvec3, vec4 as glvec4,
    mat2 as glmat2, mat3 as glmat3, mat4 as glmat4,
    type vec2 as glvec2_t, type vec3 as glvec3_t, type vec4 as glvec4_t,
    type mat2 as glmat2_t, type mat3 as glmat3_t, type mat4 as glmat4_t
} from "gl-matrix";
glMatrix.setMatrixArrayType(Array);
import type { NumArr2, NumArr3, NumArr4 } from "./defines.js";
import { num_eq } from "./math.js";

export type vec2 = glvec2_t;
export type vec3 = glvec3_t;
export type vec4 = glvec4_t;
export type mat2 = glmat2_t;
export type mat3 = glmat3_t;
export type mat4 = glmat4_t;

export namespace VEC2 {

    //create
    export function create(): vec2 {
        return glvec2.create();
    }
    //fromValues
    export function fromValues(x: number, y: number): vec2 {
        return glvec2.fromValues(x, y);
    }
    //fromArray
    export function fromArray(a: NumArr2): vec2 {
        return glvec2.fromValues(a[0], a[1]);
    }
    //set
    export function set(v: vec2, a: number, b: number) {
        v[0] = a;
        v[1] = b;
    }
    //length
    export function length(v: vec2): number {
        return glvec2.length(v);
    }
    //scale
    export function scale(v: vec2, s: number): vec2 {
        return glvec2.scale(glvec2.create(), v, s);
    }
    //normalize
    export function normalize(v: vec2): vec2 {
        return glvec2.normalize(glvec2.create(), v);
    }
    //add
    export function add(a: vec2, b: vec2): vec2 {
        return glvec2.add(glvec2.create(), a, b);
    }
    //sub
    export function sub(a: vec2, b: vec2): vec2 {
        return glvec2.subtract(glvec2.create(), a, b);
    }
    //dot
    export function dot(a: vec2, b: vec2): number {
        return glvec2.dot(a, b);
    }
    //cross
    export function cross(a: vec2, b: vec2): vec3 {
        return glvec2.cross(glvec3.create(), a, b);
    }
    //transform
    export function transform(a: vec2, m: mat2): vec2 {
        return glvec2.transformMat2(glvec2.create(), a, m);
    }

}

export namespace VEC3 {

    //create
    export function create(): vec3 {
        return glvec3.create();
    }
    //fromValues
    export function fromValues(x: number, y: number, z: number): vec3 {
        return glvec3.fromValues(x, y, z);
    }
    //fromArray
    export function fromArray(a: NumArr3): vec3 {
        return glvec3.fromValues(a[0], a[1], a[2]);
    }
    //array
    export function array(v: vec3): NumArr3 {
        return [v[0], v[1], v[2]];
    }
    //set
    export function set(v: vec2, a: number, b: number, c: number) {
        v[0] = a;
        v[1] = b;
        v[2] = c;
    }
    //length
    export function length(v: vec3): number {
        return glvec3.length(v);
    }

    export function eq(a: vec3, b: vec3, e: number = 0): boolean {
        return num_eq(a[0], b[0], e) && num_eq(a[1], b[1], e) && num_eq(a[2], b[2], e);
    }

    //scale
    export function scale(v: vec3, s: number): vec3 {
        return VEC3.fromValues(
            v[0] * s,
            v[1] * s,
            v[2] * s
        );
        // return glvec3.scale(glvec3.create(), v, s);
    }
    //normalize
    export function normalize_(out: vec3, v: vec3): vec3 {
        return glvec3.normalize(out, v);
    }
    export function normalize(v: vec3): vec3 {
        return glvec3.normalize(glvec3.create(), v);
    }
    //add
    export function add(a: vec3, b: vec3): vec3 {
        return VEC3.fromValues(
            a[0] + b[0],
            a[1] + b[1],
            a[2] + b[2],
        );
        // return glvec3.add(glvec3.create(), a, b);
    }
    //sub
    export function sub(a: vec3, b: vec3): vec3 {
        return glvec3.subtract(glvec3.create(), a, b);
    }
    //dot
    export function dot(a: vec3, b: vec3): number {
        return glvec3.dot(a, b);
    }
    //cross
    export function cross(a: vec3, b: vec3): vec3 {
        return glvec3.cross(glvec3.create(), a, b);
    }
    //transform
    export function transform(a: vec3, m: mat3): vec3 {
        return glvec3.transformMat3(glvec3.create(), a, m);
    }

    //force4
    export function force4(a: vec3, d: number = 1): vec4 {
        return glvec4.fromValues(a[0], a[1], a[2], d);
    }

    //rotateX
    export function rotateX(a: vec3, b: vec3, rad: number) {
        return glvec3.rotateX(glvec3.create(), a, b, rad);
    }
    //rotateY
    export function rotateY(a: vec3, b: vec3, rad: number) {
        return glvec3.rotateY(glvec3.create(), a, b, rad);
    }
    //rotateZ
    export function rotateZ(a: vec3, b: vec3, rad: number) {
        return glvec3.rotateZ(glvec3.create(), a, b, rad);
    }

    //negate
    export function negate_(out: vec3, a: vec3) {
        return glvec3.negate(out, a);
    }
    export function negate(a: vec3) {
        return glvec3.negate(glvec3.create(), a);
    }

}

export namespace VEC4 {

    //create
    export function create(): vec4 {
        return glvec4.create();
    }
    //fromValues
    export function fromValues(x: number, y: number, z: number, w: number): vec4 {
        return glvec4.fromValues(x, y, z, w);
    }
    //fromArray
    export function fromArray(a: NumArr4): vec4 {
        return glvec4.fromValues(a[0], a[1], a[2], a[3]);
    }
    //set
    export function set(v: vec2, a: number, b: number, c: number, d: number) {
        v[0] = a;
        v[1] = b;
        v[2] = c;
        v[3] = d;
    }
    //length
    export function length(v: vec4): number {
        return glvec4.length(v);
    }

    export function eq(a: vec4, b: vec4, e: number = 0): boolean {
        return num_eq(a[0], b[0], e) && num_eq(a[1], b[1], e) && num_eq(a[2], b[2], e) && num_eq(a[3], b[3], e);
    }

    //scale
    export function scale_(out: vec4, v: vec4, s: number): vec4 {
        return glvec4.scale(out, v, s);
    }
    export function scale(v: vec4, s: number): vec4 {
        return glvec4.scale(glvec4.create(), v, s);
    }
    //normalize
    export function normalize(v: vec4): vec4 {
        return glvec4.normalize(glvec4.create(), v);
    }
    //add
    export function add(a: vec4, b: vec4): vec4 {
        return glvec4.add(glvec4.create(), a, b);
    }
    //sub
    export function sub(a: vec4, b: vec4): vec4 {
        return glvec4.subtract(glvec4.create(), a, b);
    }
    //dot
    export function dot(a: vec4, b: vec4): number {
        return glvec4.dot(a, b);
    }
    //cross
    export function cross(a: vec4, b: vec4, c: vec4): vec4 {
        return glvec4.cross(glvec4.create(), a, b, c);
    }
    //transform
    export function transform_(out: vec4, a: vec4, m: mat4): vec4 {
        return glvec4.transformMat4(out, a, m);
    }
    export function transform(a: vec4, m: mat4): vec4 {
        return glvec4.transformMat4(glvec4.create(), a, m);
    }
    //affine
    export function affine(v: vec4, m: mat4): vec4 {
        const u = VEC4.transform(v, m);
        return VEC4.scale_(u, u, 1.0 / u[3]);
    }
    //force3
    export function force3(a: vec4): vec3 {
        return glvec3.fromValues(a[0], a[1], a[2]);
    }

    export function text(v: vec4): string {
        return `${v[0]},${v[1]},${v[2]},${v[3]}`
    }

    export function fromtext(t: string): vec4 | null {
        t = t.trim();
        if (t.match(/^-?\d+(\.\d+)?(e[+-]?\d+)?,-?\d+(\.\d+)?(e[+-]?\d+)?,-?\d+(\.\d+)?(e[+-]?\d+)?,-?\d+(\.\d+)?(e[+-]?\d+)?$/)) {
            const vs = t.split(",").slice(0, 4).map(v => parseFloat(v.trim()));
            return VEC4.fromValues(vs[0] ?? 0, vs[1] ?? 0, vs[2] ?? 0, vs[3] ?? 0);
        }
        return null;

    }

}

export namespace MAT2 {

    //create
    export function create(): mat2 {
        return glmat2.create();
    }
    //fromValues
    export function fromValues(
        m00: number, m01: number,
        m10: number, m11: number,
    ): vec3 {
        return glmat2.fromValues(
            m00, m01,
            m10, m11
        );
    }
    //fromArray
    export function fromArray(a: number[]): mat2 {
        return glmat2.fromValues(
            a[0] ?? 0, a[1] ?? 0,
            a[2] ?? 0, a[3] ?? 0
        );
    }
    //mul
    export function mul(a: mat2, b: mat2): mat2 {
        return glmat2.mul(glmat2.create(), a, b);
    }

}

export namespace MAT3 {

    //create
    export function create(): mat3 {
        return glmat3.create();
    }
    //fromValues
    export function fromValues(
        m00: number, m01: number, m02: number,
        m10: number, m11: number, m12: number,
        m20: number, m21: number, m22: number
    ): vec3 {
        return glmat3.fromValues(
            m00, m01, m02,
            m10, m11, m12,
            m20, m21, m22
        );
    }
    //fromArray
    export function fromArray(a: number[]): mat3 {
        return glmat3.fromValues(
            a[0] ?? 0, a[1] ?? 0, a[2] ?? 0,
            a[3] ?? 0, a[4] ?? 0, a[5] ?? 0,
            a[6] ?? 0, a[7] ?? 0, a[8] ?? 0
        );
    }
    //mul
    export function mul(a: mat3, b: mat3): mat3 {
        return glmat3.mul(glmat3.create(), a, b);
    }

}

export namespace MAT4 {

    //create
    export function create(): mat4 {
        return glmat4.create();
    }
    //fromValues
    export function fromValues(
        m00: number, m01: number, m02: number, m03: number,
        m10: number, m11: number, m12: number, m13: number,
        m20: number, m21: number, m22: number, m23: number,
        m30: number, m31: number, m32: number, m33: number
    ): vec3 {
        return glmat4.fromValues(
            m00, m01, m02, m03,
            m10, m11, m12, m13,
            m20, m21, m22, m23,
            m30, m31, m32, m33
        );
    }
    //fromArray
    export function fromArray(a: number[]): mat4 {
        return glmat4.fromValues(
            a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 0,
            a[4] ?? 0, a[5] ?? 0, a[6] ?? 0, a[7] ?? 0,
            a[8] ?? 0, a[9] ?? 0, a[10] ?? 0, a[11] ?? 0,
            a[12] ?? 0, a[13] ?? 0, a[14] ?? 0, a[15] ?? 0
        );
    }

    export function set(out: mat4,
        m00: number, m01: number, m02: number, m03: number,
        m10: number, m11: number, m12: number, m13: number,
        m20: number, m21: number, m22: number, m23: number,
        m30: number, m31: number, m32: number, m33: number): mat4 {
        out[0] = m00; out[1] = m01; out[2] = m02; out[3] = m03;
        out[4] = m10; out[5] = m11; out[6] = m12; out[7] = m13;
        out[8] = m20; out[9] = m21; out[10] = m22; out[11] = m23;
        out[12] = m30; out[13] = m31; out[14] = m32; out[15] = m33;
        return out;
    }

    //mul
    export function mul_(out: mat4, a: mat4, b: mat4): mat4 {
        return glmat4.mul(out, a, b);
    }
    export function mul(a: mat4, b: mat4): mat4 {
        return glmat4.mul(glmat4.create(), a, b);
    }

    //invert
    export function invert(m: mat4): mat4 | null {
        return glmat4.invert(glmat4.create(), m);
    }

    //transpose
    export function transpose_(out: mat4, m: mat4): mat4 {
        return glmat4.transpose(out, m);
    }
    export function transpose(m: mat4): mat4 {
        return glmat4.transpose(glmat4.create(), m);
    }

    //lookAt
    export function lookAt_(out: mat4, eye: vec3, center: vec3, up: vec3): mat4 {
        return glmat4.lookAt(out, eye, center, up);
    }
    export function lookAt(eye: vec3, center: vec3, up: vec3): mat4 {
        return glmat4.lookAt(glmat4.create(), eye, center, up);
    }
    //perspective
    export function perspective_(out: mat4, fovy: number, aspect: number, near: number, far: number, reverseZ: boolean = false, zo: boolean = false): mat4 {
        if (reverseZ) {
            const f = 1 / Math.tan(fovy / 2);
            out = MAT4.set(out,
                f / aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, 0, -1,
                0, 0, near, 0
            );
            return out;

        } else {
            if (zo) {
                return glmat4.perspectiveZO(out, fovy, aspect, near, far);
            } else {
                return glmat4.perspective(out, fovy, aspect, near, far);
            }

        }
    }

    export function perspective(fovy: number, aspect: number, near: number, far: number, reverseZ: boolean = false, zo: boolean = false): mat4 {
        return perspective_(MAT4.create(), fovy, aspect, near, far, reverseZ, zo);
    }

    //rotateX
    export function rotateX(a: mat4, rad: number): mat4 {
        return glmat4.rotateX(glmat4.create(), a, rad);
    }
    //rotateY
    export function rotateY(a: mat4, rad: number): mat4 {
        return glmat4.rotateY(glmat4.create(), a, rad);
    }
    //rotateZ
    export function rotateZ(a: mat4, rad: number): mat4 {
        return glmat4.rotateZ(glmat4.create(), a, rad);
    }

    //translate
    export function translate_(out: mat4, a: mat4, v: vec3): mat4 {
        return glmat4.translate(out, a, v);
    }
    export function translate(a: mat4, v: vec3): mat3 {
        return glmat4.translate(glmat4.create(), a, v);
    }

    export function fromTranslation_(out: mat4, v: vec3) {
        return glmat4.fromTranslation(out, v);
    }

    export function fromRotation_(out: mat4, rad: number, axis: vec3) {
        return glmat4.fromRotation(out, rad, axis);
    }

    //rotateAroundLine
    export function rotateAroundLine(point: vec4, axis: vec4, a: number): mat4 {

        const m = MAT4.create()
        const t1 = MAT4.create()
        const r = MAT4.create()
        const t2 = MAT4.create()

        // normalize axis vector
        const nAxis = VEC3.normalize(axis);

        //T1 move axis, make axis cross origin
        MAT4.fromTranslation_(t1, VEC3.negate(point))

        //R rotate around axis
        MAT4.fromRotation_(r, a, nAxis)

        //T2 move back
        MAT4.fromTranslation_(t2, point)

        MAT4.mul_(m, r, t1)   // R * T1
        MAT4.mul_(m, t2, m)   // T2 * (R * T1)

        return m

    }

}



