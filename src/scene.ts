import Camera from "./camera.js";
import type { NumArr2 } from "./defines.js";
import { TinyEarthEvent } from "./event.js";
import Frustum, { buildFrustum } from "./frustum.js";
import type { Layer } from "./layer.js";
import { distanceToPlane, num_atan, num_tan, Plane, Point3D, Ray, rayCrossSpheriod, toDegrees } from "./math.js";
import { MAT4, VEC3, VEC4, type mat4, type vec3 } from "./matrix.js";
import SRS from "./proj.js";
import Projection from "./projection.js";
import { Sun } from "./sun.js";
import type TinyEarth from "./tinyearth.js";

export interface SceneOptions {

    tinyearth?: TinyEarth;

    camera?: {
        from: vec3,
        to: vec3,
        up: vec3
    },

    projection?: {
        fovy: number,
        near: number,
        far: number
    },

    viewport: {
        width: number,
        height: number
    }
}

const defaultSceneOptions: Omit<SceneOptions, "viewport" | "tinyearth"> = {
    camera: {
        from: SRS.transform(SRS.WGS84, SRS.ECEF, [118.778869, 32.043823, 1E7]),
        to: [0, 0, 0],
        up: [0, 0, 1]
    },
    projection: {
        fovy: Math.PI / 3,
        near: 10,
        far: 1E8
    },
}

export default class Scene {

    #tinyearth?: TinyEarth | undefined;
    #camera: Camera;
    #projection: Projection;
    #viewHeight: number = 0;
    #viewWidth: number = 0;
    #frustum: Frustum;
    #worldToScreenMatrix: mat4;
    #sun: Sun;
    #layers: Layer[] = [];

    #logdepthC: number = 5.0;
    #strechDepthRange: NumArr2 = [0, 0]; //TODO

    constructor(options: SceneOptions) {
        this.#tinyearth = options.tinyearth;

        const cameraOpts = options.camera ?? defaultSceneOptions.camera!;
        const projOpts = options.projection ?? defaultSceneOptions.projection!;

        let reverseZ = false;
        if (this.#tinyearth) {
            reverseZ = !!this.#tinyearth.advance.reverseZ;
        }

        this.#camera = new Camera(this, cameraOpts.from, cameraOpts.to, cameraOpts.up);
        this.#projection = new Projection(this, projOpts.fovy, options.viewport.width / options.viewport.height, projOpts.near, projOpts.far, reverseZ);
        this.#viewWidth = options.viewport.width;
        this.#viewHeight = options.viewport.height;
        this.#frustum = this.computeFrustum();
        this.#worldToScreenMatrix = this.computeWorldToScreenMatrix();
        this.#strechDepthRange = this.computeStretchDepthRange();
        this.#sun = new Sun(this);
        this.#tinyearth?.eventBus.addEventListener(TinyEarthEvent.PROJECTION_CHANGE, {
            callback: (info) => {
                this.computeFrustum();
                this.computeWorldToScreenMatrix();
                this.#strechDepthRange = this.computeStretchDepthRange();
            }
        });

        this.#tinyearth?.eventBus.addEventListener(TinyEarthEvent.CAMERA_CHANGE, {
            callback: (info) => {
                this.computeFrustum();
                this.computeWorldToScreenMatrix();
                this.#strechDepthRange = this.computeStretchDepthRange();
            }
        });
        this.#logdepthC = 5.0;
    }

    get tinyearth(): TinyEarth | undefined {
        return this.#tinyearth;
    }

    get sun(): Sun {
        return this.#sun;
    }

    set viewHeight(height: number) {
        this.#viewHeight = height;
        this.#projection.aspect = this.#viewWidth / this.#viewHeight;
        this.#worldToScreenMatrix = this.computeWorldToScreenMatrix();
    }

    set viewWidth(width: number) {
        this.#viewWidth = width;
        this.#projection.aspect = this.#viewWidth / this.#viewHeight;
        this.#worldToScreenMatrix = this.computeWorldToScreenMatrix();
    }

    get viewHeight(): number {
        return this.#viewHeight;
    }

    get viewWidth(): number {
        return this.#viewWidth;
    }

    get camera(): Camera {
        return this.#camera;
    }

    get projection(): Projection {
        return this.#projection;
    }

    // set logDepthC(c: number) {
    //     this.#logdepthC = c;
    // }

    // get logdepthC(): number {
    //     return this.#logdepthC;
    // }

    setLogDepthC(c: number) {
        this.#logdepthC = c;
    }

    getLogDepthC(): number {
        return this.#logdepthC;
    }

    /**
     * 获取视口变换矩阵（包含Y轴反转）
    */
    get viewportMatrix(): mat4 {
        const x = 0;
        const y = 0;
        const w2 = this.#viewWidth / 2;
        const h2 = this.#viewHeight / 2;
        const m = MAT4.fromValues(
            w2,     0,      0,      0, //
            0,      h2,     0,      0,
            0,      0,      0.5,    0,
            x + w2, y + h2, 0.5,    1
        );
        return m;
    }

    get viewportMatrixZO(): mat4 {
        const x = 0;
        const y = 0;
        const w2 = this.#viewWidth / 2;
        const h2 = this.#viewHeight / 2;
        const m = MAT4.fromValues(
            w2,         0,      0,    0,
            0,          h2,     0,    0,
            0,          0,      1,    0,
            x + w2,     y + h2, 0,    1
        );
        return m;
    }

    computeFrustum(): Frustum {
        this.#frustum = buildFrustum(this.#projection, this.#camera);
        return this.#frustum;
    }

    computeWorldToScreenMatrix(): mat4 {
        const m = MAT4.create();
        MAT4.mul_(m, this.#projection.perspectiveMatrix, this.#camera.viewMatrix);
        MAT4.mul_(m, this.viewportMatrix, m);
        this.#worldToScreenMatrix = m;
        return this.#worldToScreenMatrix;
    }

    computePoint9(): vec3[] {
        const e = VEC3.scale(this.camera.sightVector, this.projection.near);
        const u = VEC3.normalize(VEC4.force3(this.camera.up));
        const r = VEC3.normalize(VEC3.negate(VEC3.cross(e, u)));
        const y = num_tan(this.projection.fovy / 2) * this.projection.near;
        const x = this.projection.aspect * y;

        const p0 = VEC3.add(VEC3.add(VEC3.scale(r, -x), VEC3.scale(u, -y)), e);
        const p1 = VEC3.add(VEC3.add(VEC3.scale(r, 0), VEC3.scale(u, -y)), e);
        const p2 = VEC3.add(VEC3.add(VEC3.scale(r, x), VEC3.scale(u, -y)), e);
        const p3 = VEC3.add(VEC3.add(VEC3.scale(r, -x), VEC3.scale(u, 0)), e);
        const p4 = VEC3.add(VEC3.add(VEC3.scale(r, 0), VEC3.scale(u, 0)), e);
        const p5 = VEC3.add(VEC3.add(VEC3.scale(r, x), VEC3.scale(u, 0)), e);
        const p6 = VEC3.add(VEC3.add(VEC3.scale(r, -x), VEC3.scale(u, y)), e);
        const p7 = VEC3.add(VEC3.add(VEC3.scale(r, 0), VEC3.scale(u, y)), e);
        const p8 = VEC3.add(VEC3.add(VEC3.scale(r, x), VEC3.scale(u, y)), e);

        return [p0, p1, p2, p3, p4, p5, p6, p7, p8];
    }

    computeDirection9() {
        const e = VEC3.scale(this.camera.sightVector, this.projection.near);
        const u = VEC3.normalize(VEC4.force3(this.camera.up));
        const r = VEC3.normalize(VEC3.cross(e, u));
        const y = num_tan(this.projection.fovy / 2) * this.projection.near;
        const x = this.projection.aspect * y;

        const p0 = VEC3.add(VEC3.add(VEC3.scale(r, -x), VEC3.scale(u, -y)), e);
        const p1 = VEC3.add(VEC3.add(VEC3.scale(r, 0), VEC3.scale(u, -y)), e);
        const p2 = VEC3.add(VEC3.add(VEC3.scale(r, x), VEC3.scale(u, -y)), e);
        const p3 = VEC3.add(VEC3.add(VEC3.scale(r, -x), VEC3.scale(u, 0)), e);
        const p4 = VEC3.add(VEC3.add(VEC3.scale(r, 0), VEC3.scale(u, 0)), e);
        const p5 = VEC3.add(VEC3.add(VEC3.scale(r, x), VEC3.scale(u, 0)), e);
        const p6 = VEC3.add(VEC3.add(VEC3.scale(r, -x), VEC3.scale(u, y)), e);
        const p7 = VEC3.add(VEC3.add(VEC3.scale(r, 0), VEC3.scale(u, y)), e);
        const p8 = VEC3.add(VEC3.add(VEC3.scale(r, x), VEC3.scale(u, y)), e);

        const d0 = VEC3.normalize(VEC3.sub(p0, this.camera.from));
        const d1 = VEC3.normalize(VEC3.sub(p1, this.camera.from));
        const d2 = VEC3.normalize(VEC3.sub(p2, this.camera.from));
        const d3 = VEC3.normalize(VEC3.sub(p3, this.camera.from));
        const d4 = VEC3.normalize(VEC3.sub(p4, this.camera.from));
        const d5 = VEC3.normalize(VEC3.sub(p5, this.camera.from));
        const d6 = VEC3.normalize(VEC3.sub(p6, this.camera.from));
        const d7 = VEC3.normalize(VEC3.sub(p7, this.camera.from));
        const d8 = VEC3.normalize(VEC3.sub(p8, this.camera.from));

        return [d0, d1, d2, d3, d4, d5, d6, d7, d8];
    }

    computeEarthPoint9(): (Point3D | null)[] {
        const d9 = this.computeDirection9();
        const origin = VEC4.force3(this.#camera.from);
        const rays = d9.map(d => new Ray(origin, d));
        const earth = SRS.SPHERIOD_WGS84;
        const p9 = rays.map(ray => {
            const r = rayCrossSpheriod(ray, earth, true);
            return r ? r[0]! : null;
        })
        return p9;

    }

    computeStretchDepthRange(): NumArr2 {

        const p9 = this.computeEarthPoint9();
        let a = 0;
        let b = 0;
        const zs = p9.filter(p => p !== null).map(p => {
            let v = VEC3.fromValues(p.getX(), p.getY(), p.getZ());
            let r = VEC3.force4(VEC3.sub(v, VEC4.force3(this.camera.from)));
            r = VEC4.affine(r, this.#camera.relViewMatrix);
            return -r[2];
        });
        if (zs.length === 0) {
            a = 0;
        } else {
            a = Math.min(...zs);
        }
        if (zs.length < 9) {
            b = distanceToPlane(VEC3.fromValues(0, 0, 0), new Plane(this.frustum.near!));
        } else {
            b = Math.max(...zs);
        }

        return [a, b];
    }

    get frustum(): Frustum {
        return this.#frustum;
    }

    get worldToScreenMatrix(): mat4 {
        return this.#worldToScreenMatrix;
    }

    addLayer(layer: Layer | null) {
        if (layer) {
            this.#layers.push(layer);
        }
    }

    removeLayer(layer: Layer | null) {
        this.#layers = this.#layers.filter(a => a !== layer);
    }

    removeLayerById(id: string) {
        this.#layers = this.#layers.filter(a => a.id !== id);
    }

    drawLayers() {
        for (let layer of this.#layers) {
            layer.draw();
        }
    }

};