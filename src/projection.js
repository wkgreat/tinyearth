import { glMatrix, mat4 } from "gl-matrix";
glMatrix.setMatrixArrayType(Array);

class Projection {

    fovy = Math.PI / 3;
    aspect = 1;
    near = 0.1;
    far = 1E10;
    projMtx = mat4.create();
    scene = null;

    constructor(scene, fovy, aspect, near, far) {
        this.scene = scene;
        this.fovy = fovy;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
    }

    setAspect(aspect) {
        this.aspect = aspect;
    }

    perspective() {
        return mat4.perspective(this.projMtx, this.fovy, this.aspect, this.near, this.far);
    }

    getFovy() {
        return this.fovy;
    }

    getFovx() {
        const half_fovy = this.fovy / 2;
        const t = Math.tan(half_fovy)
        const half_fovx = Math.atan(t * this.aspect)
        return 2 * half_fovx;
    }

    getNear() {
        return this.near;
    }

    getFar() {
        return this.far;
    }

    getAspect() {
        return this.aspect;
    }

};

export default Projection;