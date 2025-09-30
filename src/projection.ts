import { glMatrix, mat4 } from "gl-matrix";
import type Scene from "./scene.js";
glMatrix.setMatrixArrayType(Array);

class Projection {

    fovy: number = Math.PI / 3;
    aspect: number = 1;
    near: number = 0.1;
    far: number = 1E10;
    projMtx: mat4 = mat4.create();
    scene: Scene;

    constructor(scene: Scene, fovy: number, aspect: number, near: number, far: number) {
        this.scene = scene;
        this.fovy = fovy;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
    }

    setAspect(aspect: number) {
        this.aspect = aspect;
    }

    perspective(): mat4 {
        return mat4.perspective(this.projMtx, this.fovy, this.aspect, this.near, this.far);
    }

    getFovy(): number {
        return this.fovy;
    }

    getFovx(): number {
        const half_fovy = this.fovy / 2;
        const t = Math.tan(half_fovy)
        const half_fovx = Math.atan(t * this.aspect)
        return 2 * half_fovx;
    }

    getNear(): number {
        return this.near;
    }

    getFar(): number {
        return this.far;
    }

    getAspect(): number {
        return this.aspect;
    }

};

export default Projection;