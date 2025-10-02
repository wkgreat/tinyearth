import { mat4, vec3 } from "gl-matrix";
import Camera, { CameraMouseControl } from "./camera.js";
import Frustum, { buildFrustum } from "./frustum.js";
import Projection from "./projection.js";

export interface SceneOptions {

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

    #camera: Camera;
    #projection: Projection;
    #viewHeight: number = 0;
    #viewWidth: number = 0;

    #cameraControl: CameraMouseControl | null = null;

    constructor(options: SceneOptions) {
        this.#camera = new Camera(this, options.camera.from, options.camera.to, options.camera.up);
        this.#projection = new Projection(this, options.projection.fovy, options.viewport.width / options.viewport.height, options.projection.near, options.projection.far);
        this.#viewWidth = options.viewport.width;
        this.#viewHeight = options.viewport.height;
    }

    setViewHeight(height: number) {
        this.#viewHeight = height;
        this.#projection.setAspect(this.#viewWidth / this.#viewHeight);
    }

    setViewWidth(width: number) {
        this.#viewWidth = width;
        this.#projection.setAspect(this.#viewWidth / this.#viewHeight);
    }

    getViewHeight(): number {
        return this.#viewHeight;
    }

    getViewWidth(): number {
        return this.#viewWidth;
    }

    getCamera(): Camera {
        return this.#camera;
    }

    getProjection(): Projection {
        return this.#projection;
    }

    /**
     * 获取视口变换矩阵（包含Y轴反转）
    */
    getViewportMatrix(): mat4 {
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

    addCameraControl(canvas: HTMLCanvasElement) {
        if (this.#cameraControl) {
            this.#cameraControl.disable();
        }
        if (this.#camera) {
            this.#cameraControl = new CameraMouseControl(this.#camera, canvas);
            this.#cameraControl.enable();
        }
    }

    getFrustum(): Frustum {
        return buildFrustum(this.#projection, this.#camera);
    }

};