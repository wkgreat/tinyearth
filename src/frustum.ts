import Camera from './camera.js';
import { MAT4, VEC3, VEC4, type mat4, type vec3, type vec4 } from './matrix.js';
import Projection from './projection.js';

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
            left: this.left && VEC4.dot(p, this.left),
            right: this.right && VEC4.dot(p, this.right),
            bottom: this.bottom && VEC4.dot(p, this.bottom),
            top: this.top && VEC4.dot(p, this.top),
            near: this.near && VEC4.dot(p, this.near),
            far: this.far && VEC4.dot(p, this.far)
        }
    }
}

function row(m: mat4, i: number) {
    return VEC4.fromValues(
        m[i * 4] as number,
        m[i * 4 + 1] as number,
        m[i * 4 + 2] as number,
        m[i * 4 + 3] as number);
}

export function buildFrustum(projection: Projection, camera: Camera) {
    const m = MAT4.mul(projection.perspectiveMatrix, camera.viewMatrix);
    const im = MAT4.invert(m) as mat4;
    const tm = MAT4.transpose(m);

    // FAST EXTRACTION
    // 六个视锥体平面（左、右、下、上、近、远）
    const planes = {
        left: VEC4.add(row(tm, 3), row(tm, 0)),
        right: VEC4.sub(row(tm, 3), row(tm, 0)),
        bottom: VEC4.add(row(tm, 3), row(tm, 1)),
        top: VEC4.sub(row(tm, 3), row(tm, 1)),
        near: VEC4.add(row(tm, 3), row(tm, 2)),
        far: VEC4.sub(row(tm, 3), row(tm, 2))
    };

    const f = new Frustum(
        planes["left"] || null,
        planes["right"] || null,
        planes["bottom"] || null,
        planes["top"] || null,
        planes["near"] || null,
        planes["far"] || null,
    );

    f.setViewpoint(VEC4.force3(camera.from));
    f.setTargetpoint(VEC4.force3(camera.to));
    const cp = VEC4.transform(VEC4.fromValues(0, 0, 0, 1), im);
    f.setCenterpoint(VEC3.fromValues(cp[0], cp[1], cp[2]));

    return f;
}
