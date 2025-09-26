import { mat4, vec3 } from "gl-matrix";
import Camera, { CameraMouseControl } from "./camera.js";
import Projection from "./projection.js";
import { vec4_t3 } from "./glmatrix_utils.js";
import { buildFrustum } from "./frustum.js";

export default class Scene {

    /**@type {Camera}*/
    #camera = null;
    /**@type {Projection}*/
    #projection = null;
    #viewHeight = 0;
    #viewWidth = 0;

    /**@type {CameraMouseControl|null} */
    #cameraControl = null;
    /**
     * @param {{
     * camera: {
     *   from: vec3,
     *   to: vec3,
     *   up: vec3
     * },
     * projection: {
     *   fovy: number,
     *   near: number,
     *   far: number
     * },
     * viewport: {
     *   width: number,
     *   height: number
     * }
     * }} options 
    */
    constructor(options) {
        this.#camera = new Camera(this, options.camera.from, options.camera.to, options.camera.up);
        this.#projection = new Projection(this, options.projection.fovy, options.viewport.width / options.viewport.height, options.projection.near, options.projection.far);
        this.#viewWidth = options.viewport.width;
        this.#viewHeight = options.viewport.height;
    }

    setViewHeight(height) {
        this.#viewHeight = height;
        this.#projection.setAspect(this.#viewWidth / this.#viewHeight);
    }

    setViewWidth(width) {
        this.#viewWidth = width;
        this.#projection.setAspect(this.#viewWidth / this.#viewHeight);
    }

    getViewHeight() {
        return this.#viewHeight;
    }

    getViewWidth() {
        return this.#viewWidth;
    }

    getCamera() {
        return this.#camera;
    }

    getProjection() {
        return this.#projection;
    }

    /**
     * 获取视口变换矩阵（包含Y轴反转）
    */
    getViewportMatrix() {
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

    /**
     * @param {HTMLCanvasElement} canvas 
    */
    addCameraControl(canvas) {
        if (this.#cameraControl) {
            this.#cameraControl.disable();
        }
        if (this.#camera) {
            this.#cameraControl = new CameraMouseControl(this.#camera, canvas);
            this.#cameraControl.enable();
        }
    }

    getFrustum() {
        return buildFrustum(this.#projection, this.#camera);
    }

};