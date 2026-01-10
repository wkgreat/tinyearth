import type { mat4 } from "gl-matrix";
import type { NumArr2, NumArr3 } from "./defines.js";
import { MAT3, MAT4, VEC2, VEC3, VEC4, type mat3, type vec2, type vec3, type vec4 } from "./matrix.js";
import Decimal from "decimal.js";

export function toRadians(d: number): number {
    return d * Math.PI / 180;
}

export function toDegrees(r: number): number {
    return r * 180 / Math.PI;
}

export function num_eq(a: number, b: number, e: number = 0): boolean {
    return Math.abs(a - b) <= e;
}

export function num_atan(n: number): number {
    const r = new Decimal(n);
    const a = r.atan();
    return a.toNumber();
}

export function num_tan(rad: number): number {
    const r = new Decimal(rad);
    const a = r.tan();
    return a.toNumber();
}

/**
 * Point in 3D space.
*/
export class Point3D {

    position: vec3 = VEC3.fromValues(0, 0, 0);

    constructor() {}

    static fromVec3(v: vec3): Point3D {
        const p = new Point3D();
        p.position = v;
        return p;
    }

    static fromXYZ(x: number, y: number, z: number): Point3D {
        const p = new Point3D();
        p.position = VEC3.fromValues(x, y, z);
        return p;
    }

    setX(x: number) { this.position[0] = x; }
    setY(y: number) { this.position[1] = y; }
    setZ(z: number) { this.position[2] = z; }
    getX(): number { return this.position[0] };
    getY(): number { return this.position[1] };
    getZ(): number { return this.position[2] };

}

export class Triangle {

    p0: vec3 = VEC3.fromValues(0, 0, 0);

    p1: vec3 = VEC3.fromValues(1, 0, 0);

    p2: vec3 = VEC3.fromValues(0, 1, 0);

    constructor(p0: vec3, p1: vec3, p2: vec3) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
    }
}

export class Ray {

    origin: vec3 = VEC3.fromValues(0, 0, 0);

    direct: vec3 = VEC3.fromValues(1, 1, 1);

    constructor(origin: vec3, direct: vec3) {
        this.origin = origin;
        this.direct = VEC3.normalize(direct);
    }

    pointOnRay(p: vec3): boolean {
        const d = VEC3.sub(p, this.origin);
        if (Math.abs(VEC3.length(d)) < 1E-6) {
            return true;
        }
        const d0 = VEC3.normalize(d);
        const d1 = VEC3.normalize(this.direct);
        const c = VEC3.length(VEC3.cross(d0, d1));

        if (Math.abs(c) < 1E-6) {
            return true;
        }
        return false;
    }

    collineation(other_ray: Ray): boolean {

        const d0 = VEC3.normalize(this.direct);
        const d1 = VEC3.normalize(other_ray.direct);
        const a = VEC3.length(VEC3.cross(d0, d1));
        const b: vec3 = VEC3.sub(this.origin, other_ray.origin);

        if (Math.abs(a) < 1E-6) {
            if (Math.abs(b.length) < 1E-6) {
                return true;
            }
            const c = VEC3.length(VEC3.cross(VEC3.normalize(b), d0))
            if (Math.abs(c) < 1E-6) {
                return true;
            }
        }
        return false;
    }
};

export class Plane {

    params: vec4 = VEC4.fromValues(0, 0, 0, 0);

    constructor(params: vec4) {
        this.params = params;
    }

    static fromThreePoints(p0: vec3, p1: vec3, p2: vec3): Plane | null {

        const v1 = VEC3.sub(p1, p0);
        const v2 = VEC3.sub(p2, p0);

        const n = VEC3.cross(v1, v2);
        if (Math.abs(VEC3.length(n)) < 1E-6) {
            // 三点共线
            return null;
        }

        const [A, B, C] = [n[0], n[1], n[2]];
        const D = -(A * p0[0] + B * p0[1] + C * p0[2]);

        return new Plane(VEC4.fromValues(A, B, C, D));
    }
}

export function distanceToPlane(p: vec3, plane: Plane) {
    const f = VEC3.dot(p, VEC4.force3(plane.params)) + plane.params[3];
    return Math.abs(f) / VEC3.length(VEC4.force3(plane.params));
}

export function pointOutSidePlane(p: vec4, plane: Plane): boolean {
    return VEC4.dot(p, plane.params) < 0;
}

interface RayCrossTriangleResult {
    cross: boolean,
    uvt: [number, number, number]
}

export function rayCrossTriangle(ray: Ray, triangle: Triangle): RayCrossTriangleResult {

    const epsilon = 1E-6;
    const e1 = VEC3.sub(triangle.p1, triangle.p0);
    const e2 = VEC3.sub(triangle.p2, triangle.p0);
    const q = VEC3.cross(ray.direct, e2);
    const a = VEC3.dot(e1, q);
    if (Math.abs(a) < epsilon) {
        return {
            cross: false,
            uvt: [0, 0, 0]
        }
    }
    const f = 1 / a;
    const s = VEC3.sub(ray.origin, triangle.p0);
    const u = f * VEC3.dot(s, q);
    if (u < 0.0) {
        return {
            cross: false,
            uvt: [0, 0, 0]
        }
    }
    const r = VEC3.cross(s, e1);
    const v = f * VEC3.dot(ray.direct, r);
    if (v < 0.0 || u + v > 1.0) {
        return {
            cross: false,
            uvt: [0, 0, 0]
        }
    }
    const t = f * VEC3.dot(e2, r);
    return {
        cross: true,
        uvt: [u, v, t]
    }

}

interface PlaceCrossPlaneResult {
    cross: boolean,
    ray: Ray | null
}

export function planeCrossPlane(plane0: Plane, plane1: Plane): PlaceCrossPlaneResult {

    let n0 = VEC3.fromValues(plane0.params[0], plane0.params[1], plane0.params[2])
    n0 = VEC3.normalize(n0);

    let n1 = VEC3.fromValues(plane1.params[0], plane1.params[1], plane1.params[2])
    n1 = VEC3.normalize(n1);

    let d = VEC3.cross(n0, n1);

    if (Math.abs(VEC3.length(d)) < 1E-6) {
        return {
            cross: false,
            ray: null
        }
    }
    let x = 0;
    let y = 0;
    let z = 0;

    const [A1, B1, C1, D1] = plane0.params as [number, number, number, number];
    const [A2, B2, C2, D2] = plane1.params as [number, number, number, number];

    let detX = B1 * C2 - B2 * C1;
    let detY = A1 * C2 - A2 * C1;
    let detZ = A1 * B2 - A2 * B1;

    if (Math.abs(detZ) > 0) {
        x = (B1 * D2 - B2 * D1) / detZ;
        y = (A2 * D1 - A1 * D2) / detZ;
        z = 0;
    } else if (Math.abs(detY) > 0) {
        x = (C1 * D2 - C2 * D1) / detY;
        y = 0;
        z = (A2 * D1 - A1 * D2) / detY;
    } else {
        x = 0;
        y = (C1 * D2 - C2 * D1) / detX;
        z = (B2 * D1 - B1 * D2) / detX;
    }
    const ray = new Ray(VEC3.fromValues(x, y, z), d);

    return {
        cross: true,
        ray: ray
    }

}

export class Sphere {

    center: vec3 = VEC3.fromValues(0, 0, 0);

    radius: number = 1;

    constructor(center: vec3, radius: number) {
        this.center = center;
        this.radius = radius;
    }
}

/**
 * @param ray
 * @param sphere  
 * @param all return all points, or positive closest point
*/
export function rayCrossSphere(ray: Ray, sphere: Sphere, all: boolean = false): Point3D[] | null {

    const oc = VEC3.sub(ray.origin, sphere.center);
    const b = VEC3.dot(ray.direct, oc);
    const c = VEC3.dot(oc, oc) - sphere.radius * sphere.radius;
    const d = b * b - c;
    if (d < 0) {
        return null;
    }
    const sd = Math.sqrt(d);
    const t0 = -b - sd;
    const t1 = -b + sd;

    const epsilon = -1 * (t1 - t0) * 1E-5;

    if (all) {
        const p0 = VEC3.add(ray.origin, VEC3.scale(ray.direct, t0));
        const p1 = VEC3.add(ray.origin, VEC3.scale(ray.direct, t1));
        return [Point3D.fromVec3(p0), Point3D.fromVec3(p1)];
    } else {
        let t;
        if (t0 >= epsilon && t1 >= epsilon) {
            t = Math.min(t0, t1);
        } else if (t0 >= epsilon) {
            t = t0;
        } else if (t1 >= epsilon) {
            t = t1;
        } else {
            return null;
        }
        const p = VEC3.add(ray.origin, VEC3.scale(ray.direct, t));
        return [Point3D.fromVec3(p)];
    }
}

/**
 * origin-centered axis-aligned Spheriod
*/
export class Spheriod {

    params: vec3 = VEC3.fromValues(1, 1, 1);

    matrix: mat3;

    constructor(a: number, b: number, c: number) {
        this.params = VEC3.fromValues(a, b, c);
        this.matrix = MAT3.fromValues(
            1.0 / (a * a), 0.0, 0.0,
            0.0, 1.0 / (b * b), 0.0,
            0.0, 0.0, 1.0 / (c * c)
        );
    }

    get a() {
        return this.params[0];
    }

    get b() {
        return this.params[1];
    }

    get c() {
        return this.params[2];
    }

    get m() {
        return this.matrix;
    }

    radius(d: vec3) {
        const n = VEC3.normalize(d);
        const denom = VEC3.dot(n, VEC3.transform(n, this.m));
        return 1.0 / Math.sqrt(denom);
    }

    clampToSurface(p: vec3, elevation: number = 0) {
        const n = VEC3.normalize(p);
        const t = this.radius(n);
        return VEC3.add(VEC3.scale(n, t), VEC3.scale(n, elevation));
    }

}

export class OblateSpheriod extends Spheriod {
    constructor(a: number, b: number) {
        super(a, a, b);
    }

    get majorRadius() {
        return super.a;
    }

    get minorRadius() {
        return super.c;
    }

    get f() {
        return (this.majorRadius - this.minorRadius) / this.majorRadius;
    }

    get e() {
        return Math.sqrt(1 - Math.pow(this.minorRadius / this.majorRadius, 2));
    }

    get e2() {
        return this.f * (2 - this.f);
    }
}

/**
 * @param ray
 * @param spheriod
 * @param all Ray cross spheriod at two points. If ray all is False, only return first points; if true, retrun both.
 * {@link https://github.com/wkgreat/tinyearth/blob/main/docs/source/geometry.md#raycrossspheriod}
*/
export function rayCrossSpheriod(ray: Ray, spheriod: Spheriod, all: boolean = false): Point3D[] | null {


    const dx = ray.direct[0];
    const dy = ray.direct[1];
    const dz = ray.direct[2];
    const a = spheriod.params[0];
    const b = spheriod.params[1];
    const c = spheriod.params[2];
    const x = ray.origin[0];
    const y = ray.origin[1];
    const z = ray.origin[2];

    const dx2 = dx * dx;
    const dy2 = dy * dy;
    const dz2 = dz * dz;

    const a2 = a * a;
    const b2 = b * b;
    const c2 = c * c;

    const x2 = x * x;
    const y2 = y * y;
    const z2 = z * z;

    const A = dx2 / a2 + dy2 / b2 + dz2 / c2;
    const B = 2 * x * dx / a2 + 2 * y * dy / b2 + 2 * z * dz / c2;
    const C = x2 / a2 + y2 / b2 + z2 / c2 - 1;

    const D = B * B - 4 * A * C;
    if (D < 0) {
        return null;
    }

    const t0 = (-B - Math.sqrt(D)) / (2 * A);
    const t1 = (-B + Math.sqrt(D)) / (2 * A);

    if (all) {
        const p0 = VEC3.add(ray.origin, VEC3.scale(ray.direct, t0));
        const p1 = VEC3.add(ray.origin, VEC3.scale(ray.direct, t1));
        return [Point3D.fromVec3(p0), Point3D.fromVec3(p1)];
    } else {
        let t = 0;
        if (t0 >= 0 && t1 >= 0) {
            t = Math.min(t0, t1);
        } else if (t0 >= 0) {
            t = t0;
        } else if (t1 >= 0) {
            t = t1;
        }
        const p = VEC3.add(ray.origin, VEC3.scale(ray.direct, t));
        return [Point3D.fromVec3(p)];
    }

}


export type DFloat = NumArr2;
export type DFvec2 = [vec2, vec2];
export type DFvec3 = [vec3, vec3];
export type DFvec4 = [vec4, vec4];
export type DFmat4 = [mat4, mat4];

export namespace dfloat {
    export function create(n: number): DFloat {
        const high = Math.fround(n);
        const low = Math.fround(n - high);
        return [high, low];
    }

    export function high(d: DFloat): number {
        return d[0];
    }

    export function low(d: DFloat): number {
        return d[1];
    }

    export function toObject(d: DFloat): { high: number, low: number } {
        return { high: dfloat.high(d), low: dfloat.low(d) };
    }
}

export namespace dfvec2 {
    export function create(v: vec2): DFvec2 {

        const h = VEC2.create();
        const l = VEC2.create();
        const v0 = dfloat.create(v[0]);
        const v1 = dfloat.create(v[1]);

        VEC2.set(h,
            dfloat.high(v0),
            dfloat.high(v1)
        );

        VEC2.set(l,
            dfloat.low(v0),
            dfloat.low(v1)
        );

        return [h, l];
    }

    export function high(d: DFvec2): vec2 {
        return d[0];
    }

    export function low(d: DFvec2): vec2 {
        return d[1];
    }

    export function toObject(d: DFvec2): { high: vec2, low: vec2 } {
        return { high: dfvec2.high(d), low: dfvec2.low(d) };
    }
}

export namespace dfvec3 {
    export function create(v: vec3): DFvec3 {

        const h = VEC3.create();
        const l = VEC3.create();
        const v0 = dfloat.create(v[0]);
        const v1 = dfloat.create(v[1]);
        const v2 = dfloat.create(v[2]);

        VEC3.set(h,
            dfloat.high(v0),
            dfloat.high(v1),
            dfloat.high(v2),
        );

        VEC3.set(l,
            dfloat.low(v0),
            dfloat.low(v1),
            dfloat.low(v2)
        );

        return [h, l];
    }

    export function high(d: DFvec3): vec3 {
        return d[0];
    }

    export function low(d: DFvec3): vec3 {
        return d[1];
    }

    export function toObject(d: DFvec3): { high: vec3, low: vec3 } {
        return { high: dfvec3.high(d), low: dfvec3.low(d) };
    }
}


export namespace dfvec4 {
    export function create(v: vec4): DFvec4 {

        const h = VEC4.create();
        const l = VEC4.create();
        const v0 = dfloat.create(v[0]);
        const v1 = dfloat.create(v[1]);
        const v2 = dfloat.create(v[2]);
        const v3 = dfloat.create(v[3]);

        VEC4.set(h,
            dfloat.high(v0),
            dfloat.high(v1),
            dfloat.high(v2),
            dfloat.high(v3),
        );

        VEC4.set(l,
            dfloat.low(v0),
            dfloat.low(v1),
            dfloat.low(v2),
            dfloat.low(v3),
        );

        return [h, l];
    }

    export function high(d: DFvec4): vec4 {
        return d[0];
    }

    export function low(d: DFvec4): vec4 {
        return d[1];
    }

    export function toObject(d: DFvec4): { high: vec4, low: vec4 } {
        return { high: dfvec4.high(d), low: dfvec4.low(d) };
    }
}

export namespace dfmat4 {
    export function create(m: mat4): DFmat4 {
        const hs: number[] = []
        const ls: number[] = []
        for (let i = 0; i < 16; ++i) {
            const d: DFloat = dfloat.create(m[i]!);
            hs.push(dfloat.high(d));
            ls.push(dfloat.low(d));
        }
        const mh = MAT4.fromArray(hs);
        const lh = MAT4.fromArray(ls);
        return [mh, lh];
    }

    export function high(d: DFmat4): mat4 {
        return d[0];
    }

    export function low(d: DFmat4): mat4 {
        return d[1];
    }

    export function toObject(d: DFmat4): { high: mat4, low: mat4 } {
        return { high: dfmat4.high(d), low: dfmat4.low(d) };
    }
}