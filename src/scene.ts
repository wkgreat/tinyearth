import { mat4, vec3 } from "gl-matrix";
import Camera from "./camera.js";
import { TinyEarthEvent } from "./event.js";
import Frustum, { buildFrustum } from "./frustum.js";
import type { Layer } from "./layer.js";
import type { Geometry } from "./geometry.js";
import Projection from "./projection.js";
import { Sun } from "./sun.js";
import type TinyEarth from "./tinyearth.js";

export interface SceneOptions {

    tinyearth: TinyEarth;

    camera: {
        from: vec3,
        to: vec3,
        up: vec3
    },

    projection: {
        fovy: number,
        near: number,
        far: number
    },

    viewport: {
        width: number,
        height: number
    }
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

    #geometries: Geometry[] = [];

    constructor(options: SceneOptions) {
        this.#tinyearth = options.tinyearth;
        this.#camera = new Camera(this, options.camera.from, options.camera.to, options.camera.up);
        this.#projection = new Projection(this, options.projection.fovy, options.viewport.width / options.viewport.height, options.projection.near, options.projection.far);
        this.#viewWidth = options.viewport.width;
        this.#viewHeight = options.viewport.height;
        this.#frustum = this.computeFrustum();
        this.#worldToScreenMatrix = this.computeWorldToScreenMatrix();

        this.#sun = new Sun(this);

        this.tinyearth.eventBus.addEventListener(TinyEarthEvent.PROJECTION_CHANGE, {
            callback: (info) => {
                this.computeFrustum();
                this.computeWorldToScreenMatrix();
            }
        });

        this.tinyearth.eventBus.addEventListener(TinyEarthEvent.CAMERA_CHANGE, {
            callback: (info) => {
                this.computeFrustum();
                this.computeWorldToScreenMatrix();
            }
        });
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

    /**
     * 获取视口变换矩阵（包含Y轴反转）
    */
    get viewportMatrix(): mat4 {
        const m = mat4.create();
        const w = this.#viewWidth;
        const h = this.#viewHeight;
        mat4.set(
            m,
            w / 2, 0, 0, 0,
            0, -h / 2, 0, 0,
            0, 0, 0.5, 0,
            w / 2, h / 2, 0.5, 1
        );
        return m;
    }

    computeFrustum(): Frustum {
        this.#frustum = buildFrustum(this.#projection, this.#camera);
        return this.#frustum;
    }

    computeWorldToScreenMatrix(): mat4 {
        const m = mat4.create();
        mat4.multiply(m, this.#projection.perspectiveMatrix, this.#camera.viewMatrix);
        mat4.multiply(m, this.viewportMatrix, m);
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