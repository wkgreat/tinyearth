import { glMatrix, vec3, vec4 } from "gl-matrix";
import { vec3_add, vec3_cross, vec3_scale, vec3_sub } from "./glmatrix_utils.js";
import { EPSG_4978 } from "./proj.js";
glMatrix.setMatrixArrayType(Array);

/**
 * @class Point in 3D space.
*/
export class Point3D {
    /** @type {vec3} */
    position = vec3.fromValues(0, 0, 0);
    /** @type {import("./proj.js").projcode} */
    projcode = EPSG_4978;

    constructor() {}

    static fromVec3(v) {
        const p = new Point3D();
        p.position = v;
        return p;
    }

    static fromXYZ(x, y, z) {
        const p = new Point3D();
        p.position = vec3.fromValues(x, y, z);
        return p;
    }

    setX(x) { this.position[0] = x; }
    setY(y) { this.position[1] = y; }
    setZ(z) { this.position[2] = z; }
    getX() { return this.position[0] };
    getY() { return this.position[1] };
    getZ() { return this.position[2] };

    /**@param {import("./proj.js").projcode} code */
    setProjcode(code) { this.projcode = code; }

    /**@returns {import("./proj.js").projcode} */
    getProjcode() { return this.projcode; }

}

export class Triangle {

    /** @type {vec3}*/
    p0 = vec3.fromValues(0, 0, 0);
    /** @type {vec3}*/
    p1 = vec3.fromValues(1, 0, 0);
    /** @type {vec3}*/
    p2 = vec3.fromValues([0, 1, 0]);

    /**
     * @param {vec3} p0
     * @param {vec3} p1
     * @param {vec3} p2 
    */
    constructor(p0, p1, p2) {
        this.p0 = p0;
        this.p1 = p1;
        this.p2 = p2;
    }
}

export class Ray {
    origin = vec3.fromValues(0, 0, 0);
    direct = vec3.fromValues(1, 1, 1);

    /**
     * @param {vec3} origin 
     * @param {vec3} direct 
    */
    constructor(origin, direct) {
        this.origin = origin;
        this.direct = vec3.normalize(vec3.create(), direct);
    }

    /**
     * @param {math.Matrix} p
     * @returns {boolean} 
    */
    pointOnRay(p) {
        const d = vec3.subtract(vec3.create(), p, this.origin);
        if (Math.abs(vec3.length(d)) < 1E-6) {
            return true;
        }
        const d0 = vec3.normalize(vec3.create(), d);
        const d1 = vec3.normalize(vec3.create(), this.direct);
        const c = vec3.length(vec3.cross(vec3.create(), d0, d1));

        if (Math.abs(c) < 1E-6) {
            return true;
        }
        return false;
    }

    /**
     * @param {Ray} other_ray
     * @returns {boolean} 
    */
    collineation(other_ray) {

        const d0 = vec3.normalize(vec3.create(), this.direct);
        const d1 = vec3.normalize(vec3.create(), other_ray.direct);
        const a = vec3.length(vec3_cross(d0, d1));
        const b = vec3_sub(this.origin, other_ray.origin);

        if (Math.abs(a) < 1E-6) {
            if (Math.abs(b) < 1E-6) {
                return true;
            }
            const c = vec3.length(vec3.cross(vec3.create(), vec3.normalize(vec3.create(), b), d0))
            if (Math.abs(c) < 1E-6) {
                return true;
            }
        }
        return false;
    }
};

export class Plane {
    /**@type {vec4} */
    params = vec4.fromValues(0, 0, 0, 0);
    constructor(params) {
        this.params = params;
    }

    /**
     * @param {vec3} p0
     * @param {vec3} p1
     * @param {vec3} p2
     * @returns {Plane|null} 
    */
    static fromThreePoints(p0, p1, p2) {

        const v1 = vec3_sub(p1, p0);
        const v2 = vec3_sub(p2, p0);

        const n = vec3_cross(v1, v2);
        if (Math.abs(vec3.length(n)) < 1E-6) {
            // 三点共线
            return null;
        }

        const [A, B, C] = [n[0], n[1], n[2]];
        const D = -(A * p0[0] + B * p0[1] + C * p0[2]);

        return new Plane(vec4.fromValues(A, B, C, D));
    }
}

/**
 * @param {vec4} p
 * @param {Plane} plane  
*/
export function pointOutSidePlane(p, plane) {
    return vec4.dot(p, plane.params) < 0;
}


/**
 * @param {Ray} ray
 * @param {Triangle} triangle
 * @returns {{cross:boolean,uvt:Array}} cross boolean, uvt u weight of p1, v weight of p2, t weight of ray
*/
export function rayCrossTriangle(ray, triangle) {

    const epsilon = 1E-6;
    const e1 = vec3.subtract(vec3.create(), triangle.p1, triangle.p0);
    const e2 = vec3.subtract(vec3.create(), triangle.p2, triangle.p0);
    const q = vec3.cross(vec3.create(), ray.direct, e2);
    const a = vec3.dot(e1, q);
    if (Math.abs(a) < epsilon) {
        return {
            cross: false,
            uvt: [0, 0, 0]
        }
    }
    const f = 1 / a;
    const s = vec3.subtract(vec3.create(), ray.origin, triangle.p0);
    const u = f * vec3.dot(s, q);
    if (u < 0.0) {
        return {
            cross: false,
            uvt: [0, 0, 0]
        }
    }
    const r = vec3.cross(vec3.create(), s, e1);
    const v = f * vec3.dot(ray.direct, r);
    if (v < 0.0 || u + v > 1.0) {
        return {
            cross: false,
            uvt: [0, 0, 0]
        }
    }
    const t = f * vec3.dot(e2, r);
    return {
        cross: true,
        uvt: [u, v, t]
    }

}

/**
 * @param {Plane} plane0
 * @param {Plane} plane1
 * @return {{cross: boolean, ray: Ray|null}}
*/
export function planeCrossPlane(plane0, plane1) {

    let n0 = vec3.fromValues(plane0.params[0], plane0.params[1], plane0.params[2])
    n0 = vec3.normalize(vec3.create(), n0);

    let n1 = vec3.fromValues(plane1.params[0], plane1.params[1], plane1.params[2])
    n1 = vec3.normalize(vec3.create(), n1);

    let d = vec3_cross(n0, n1);

    if (Math.abs(vec3.length(d)) < 1E-6) {
        return {
            cross: false,
            ray: null
        }
    }
    let x = 0;
    let y = 0;
    let z = 0;
    const [A1, B1, C1, D1] = plane0.params;
    const [A2, B2, C2, D2] = plane1.params;
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
    const ray = new Ray(vec3.fromValues(x, y, z), d);

    return {
        cross: true,
        ray: ray
    }

}

export class Sphere {

    /**@type {vec3}*/
    center = vec3.fromValues(0, 0, 0);
    /**@type {number}*/
    radius = 1;

    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
    }
}

/**
 * @param {Ray} ray
 * @param {Sphere} sphere  
 * @param {boolean} [all=false] return all points, or positive closest point
*/
export function rayCrossSphere(ray, sphere, all = false) {

    const oc = vec3_sub(ray.origin, sphere.center);
    const b = vec3.dot(ray.direct, oc);
    const c = vec3.dot(oc, oc) - sphere.radius * sphere.radius;
    const d = b * b - c;
    if (d < 0) {
        return null;
    }
    const sd = Math.sqrt(d);
    const t0 = -b - sd;
    const t1 = -b + sd;

    const epsilon = -1 * (t1 - t0) * 1E-5;

    if (all) {
        const p0 = vec3_add(ray.origin, vec3_scale(ray.direct, t0));
        const p1 = vec3_add(ray.origin, vec3_scale(ray.direct, t1));
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
        const p = vec3_add(ray.origin, vec3_scale(ray.direct, t));
        return [Point3D.fromVec3(p)];
    }
}

export class Spheriod {

    /**@type {vec3} */
    params = vec3.fromValues(1, 1, 1);

    constructor(a, b, c) {
        this.params = vec3.fromValues(a, b, c);
    }

}

/**
 * @param {Ray} ray
 * @param {Spheriod} spheriod
*/
export function rayCrossSpheriod(ray, spheriod, all = false) {


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
        const p0 = vec3_add(ray.origin, vec3_scale(ray.direct, t0));
        const p1 = vec3_add(ray.origin, vec3_scale(ray.direct, t1));
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
        const p = vec3_add(ray.origin, vec3_scale(ray.direct, t));
        return [Point3D.fromVec3(p)];
    }

}