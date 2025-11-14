import Camera from "./camera.js";
import { TinyEarthEvent } from "./event.js";
import Frustum, { buildFrustum } from "./frustum.js";
import type { Layer } from "./layer.js";
import { MAT4, type mat4, type vec3 } from "./matrix.js";
import SRS from "./proj.js";
import Projection from "./projection.js";
import { Sun } from "./sun.js";
import type TinyEarth from "./tinyearth.js";

export interface SceneOptions {

    tinyearth: TinyEarth;

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

    #tinyearth: TinyEarth;
    #camera: Camera;
    #projection: Projection;
    #viewHeight: number = 0;
    #viewWidth: number = 0;
    #frustum: Frustum;
    #worldToScreenMatrix: mat4;
    #sun: Sun;
    #layers: Layer[] = [];

    #logdepthC: number = 5.0;

    constructor(options: SceneOptions) {
        this.#tinyearth = options.tinyearth;

        const cameraOpts = options.camera ?? defaultSceneOptions.camera!;
        const projOpts = options.projection ?? defaultSceneOptions.projection!;

        this.#camera = new Camera(this, cameraOpts.from, cameraOpts.to, cameraOpts.up);
        this.#projection = new Projection(this, projOpts.fovy, options.viewport.width / options.viewport.height, projOpts.near, projOpts.far);
        this.#viewWidth = options.viewport.width;
        this.#viewHeight = options.viewport.height;
        this.#frustum = this.computeFrustum();
        this.#worldToScreenMatrix = this.computeWorldToScreenMatrix();
        this.#sun = new Sun(this);
        this.#tinyearth.eventBus.addEventListener(TinyEarthEvent.PROJECTION_CHANGE, {
            callback: (info) => {
                this.computeFrustum();
                this.computeWorldToScreenMatrix();
            }
        });

        this.#tinyearth.eventBus.addEventListener(TinyEarthEvent.CAMERA_CHANGE, {
            callback: (info) => {
                this.computeFrustum();
                this.computeWorldToScreenMatrix();
            }
        });
        this.#logdepthC = 5.0;
    }

    get tinyearth(): TinyEarth {
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
            w2, 0, 0, 0,
            0, h2, 0, 0,
            0, 0, 0.5, 0,
            x + w2, y + h2, 0.5, 1
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