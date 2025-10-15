import { glMatrix, mat4, vec3, vec4 } from 'gl-matrix';
import Camera from './camera.js';
import { vec4_t3 } from './glmatrix_utils.js';
import Projection from './projection.js';
glMatrix.setMatrixArrayType(Array);

interface FrustumDistanceOfPointInfo {
    left: number | null
    right: number | null
    bottom: number | null
    top: number | null
    near: number | null
    far: number | null
}

export default class Frustum {

    left: vec4 | null = null;
    right: vec4 | null = null;
    bottom: vec4 | null = null;
    top: vec4 | null = null;
    near: vec4 | null = null;
    far: vec4 | null = null;
    viewpoint: vec3 | null = null;
    targetpoint: vec3 | null = null;
    centerpoint: vec3 | null = null;

    /**
     * @param {vec4|null} left
     * @param {vec4|null} right
     * @param {vec4|null} bottom
     * @param {vec4|null} top
     * @param {vec4|null} near
     * @param {vec4|null} far      
    */
    constructor(left: vec4 | null, right: vec4 | null, bottom: vec4 | null, top: vec4 | null, near: vec4 | null, far: vec4 | null) {
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
        this.near = near;
        this.far = far;
    }

    getViewpoint(): vec3 | null {
        return this.viewpoint;
    }

    setViewpoint(p: vec3 | null) {
        this.viewpoint = p;
    }

    getTargetpoint(): vec3 | null {
        return this.targetpoint;
    }

    setTargetpoint(p: vec3 | null) {
        this.targetpoint = p;
    }

    getCenterpoint(): vec3 | null {
        return this.centerpoint;
    }

    setCenterpoint(p: vec3 | null) {
        this.centerpoint = p;
    }

    getDistanceOfPoint(p: vec4): FrustumDistanceOfPointInfo {
        return {
            left: this.left && vec4.dot(p, this.left),
            right: this.right && vec4.dot(p, this.right),
            bottom: this.bottom && vec4.dot(p, this.bottom),
            top: this.top && vec4.dot(p, this.top),
            near: this.near && vec4.dot(p, this.near),
            far: this.far && vec4.dot(p, this.far)
        }
    }
}

function row(m: mat4, i: number) {
    return vec4.fromValues(
        m[i * 4] as number,
        m[i * 4 + 1] as number,
        m[i * 4 + 2] as number,
        m[i * 4 + 3] as number);
}

export function buildFrustum(projection: Projection, camera: Camera) {
    const m = mat4.multiply(mat4.create(), projection.perspectiveMatrix, camera.viewMatrix);
    const im = mat4.invert(mat4.create(), m) as mat4;
    const tm = mat4.transpose(mat4.create(), m);

    // FAST EXTRACTION
    // 六个视锥体平面（左、右、下、上、近、远）
    const planes = {
        left: vec4.add(vec4.create(), row(tm, 3), row(tm, 0)),
        right: vec4.subtract(vec4.create(), row(tm, 3), row(tm, 0)),
        bottom: vec4.add(vec4.create(), row(tm, 3), row(tm, 1)),
        top: vec4.subtract(vec4.create(), row(tm, 3), row(tm, 1)),
        near: vec4.add(vec4.create(), row(tm, 3), row(tm, 2)),
        far: vec4.subtract(vec4.create(), row(tm, 3), row(tm, 2))
    };

    // SLOW EXTRACTION
    // const p0 = math_affline(hpvmatrix([-1, -1, -1]), im);
    // const p1 = math_affline(hpvmatrix([1, -1, -1]), im);
    // const p2 = math_affline(hpvmatrix([1, 1, -1]), im);
    // const p3 = math_affline(hpvmatrix([-1, 1, -1]), im);
    // const p4 = math_affline(hpvmatrix([-1, 1, 1]), im);
    // const p5 = math_affline(hpvmatrix([-1, -1, 1]), im);
    // const p6 = math_affline(hpvmatrix([1, -1, 1]), im);
    // const p7 = math_affline(hpvmatrix([1, 1, 1]), im);

    // const planes = {
    //     left: Plane.fromThreePoints(p5, p0, p3).params,
    //     right: Plane.fromThreePoints(p1, p6, p7).params,
    //     bottom: Plane.fromThreePoints(p6, p5, p0).params,
    //     top: Plane.fromThreePoints(p4, p3, p2).params,
    //     near: Plane.fromThreePoints(p3, p0, p1).params,
    //     far: Plane.fromThreePoints(p7, p6, p5).params
    // };

    // 归一化
    // planes.left = math.divide(planes.left, math.norm(vec3Fromvec4(planes.left)));
    // planes.right = math.divide(planes.right, math.norm(vec3Fromvec4(planes.right)));
    // planes.bottom = math.divide(planes.bottom, math.norm(vec3Fromvec4(planes.bottom)));
    // planes.top = math.divide(planes.top, math.norm(vec3Fromvec4(planes.top)));
    // planes.near = math.divide(planes.near, math.norm(vec3Fromvec4(planes.near)));
    // planes.far = math.divide(planes.far, math.norm(vec3Fromvec4(planes.far)));

    const f = new Frustum(
        planes["left"] || null,
        planes["right"] || null,
        planes["bottom"] || null,
        planes["top"] || null,
        planes["near"] || null,
        planes["far"] || null,
    );

    f.setViewpoint(vec4_t3(camera.from));
    f.setTargetpoint(vec4_t3(camera.to));
    const cp = vec4.transformMat4(vec4.create(), vec4.fromValues(0, 0, 0, 1), im);
    f.setCenterpoint(vec3.fromValues(cp[0], cp[1], cp[2]));

    return f;
}
