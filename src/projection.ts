import { glMatrix, mat4 } from "gl-matrix";
import { TinyEarthEvent } from "./event.js";
import type Scene from "./scene.js";
glMatrix.setMatrixArrayType(Array);

class Projection {

    #fovy: number = Math.PI / 3;
    #aspect: number = 1;
    #near: number = 0.1;
    #far: number = 1E10;
    #matrix: mat4 = mat4.create();
    #scene: Scene;

    constructor(scene: Scene, fovy: number, aspect: number, near: number, far: number) {
        this.#scene = scene;
        this.#fovy = fovy;
        this.#aspect = aspect;
        this.#near = near;
        this.#far = far;
    }

    get perspectiveMatrix(): mat4 {
        return mat4.perspective(this.#matrix, this.#fovy, this.#aspect, this.#near, this.#far);
    }

    get fovy(): number {
        return this.#fovy;
    }

    get fovx(): number {
        const half_fovy = this.#fovy / 2;
        const t = Math.tan(half_fovy)
        const half_fovx = Math.atan(t * this.aspect)
        return 2 * half_fovx;
    }

    get near(): number {
        return this.#near;
    }

    get far(): number {
        return this.#far;
    }

    set aspect(aspect: number) {
        if (this.#aspect !== aspect) {
            this.#aspect = aspect;
            this.#scene.tinyearth.eventBus.fire(TinyEarthEvent.PROJECTION_CHANGE, { projection: this });
        }
    }

    get aspect(): number {
        return this.#aspect;
    }

    get logDepthConstant(): number {
        return 1.0 / Math.log2(this.far + 1.0);
    }

};

export default Projection;