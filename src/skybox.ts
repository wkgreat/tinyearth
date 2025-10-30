import { glMatrix, mat4, vec3 } from "gl-matrix";
import starsky_nx from "./assets/starsky/nx.png";
import starsky_ny from "./assets/starsky/ny.png";
import starsky_nz from "./assets/starsky/nz.png";
import starsky_px from "./assets/starsky/px.png";
import starsky_py from "./assets/starsky/py.png";
import starsky_pz from "./assets/starsky/pz.png";
import Camera from "./camera.js";
import { checkGLError } from "./debug.js";
import { vec3_add, vec3_cross, vec3_normalize, vec3_scale, vec3_sub, vec4_t3 } from "./glmatrix_utils.js";
import { GLSLSource } from "./glsl.js";
import { Program, type ProgramOptions } from "./program.js";
import type Projection from "./projection.js";
import Scene from "./scene.js";
import fragSource from "./shader/skybox.frag";
import vertSource from "./shader/skybox.vert";
glMatrix.setMatrixArrayType(Array);

export interface CubeMapInfo {
    face: number,
    src: string
};

export interface SkyboxUniformInfo {
    u_invProjViewMtx: mat4,
    u_worldCameraPos: vec3,
    camera: Camera,
    projection: Projection
}

export interface SkyBoxSourceInfo {
    name: string
    posx: string
    negx: string
    posy: string
    negy: string
    posz: string
    negz: string
}

export const defaultSkyBoxSourceInfo = {
    name: "starsky",
    posx: starsky_px,
    negx: starsky_nx,
    posy: starsky_py,
    negy: starsky_ny,
    posz: starsky_pz,
    negz: starsky_nz,
}

export interface SkyBoxProgramOptions extends Omit<ProgramOptions, 'vertSource' | 'fragSource'> {}

export class SkyBoxProgram extends Program {

    #vertices: Float32Array = new Float32Array([
        -1, 1, 1,
        -1, -1, 1,
        1, -1, 1,
        1, -1, 1,
        1, 1, 1,
        -1, 1, 1
    ]);

    /** @type {WebGLBuffer} */
    #buffer: WebGLBuffer | null = null;

    /** @type {WebGLTexture} */
    #texutre: WebGLTexture | null = null;

    constructor(options: SkyBoxProgramOptions) {

        const vertGLSLSource = new GLSLSource(vertSource);
        const fragGLSLSource = new GLSLSource(fragSource);

        super({
            ...options,
            vertSource: vertGLSLSource,
            fragSource: fragGLSLSource
        })

    }

    /**
     * @param {Scene} scene 
    */
    createVetexData(scene: Scene) {

        const cameraFrom = scene.camera.from;
        const cameraTo = scene.camera.to;
        const cameraUp = scene.camera.up;
        const near = scene.projection.near;
        const fovy = scene.projection.fovy;
        const aspect = scene.projection.aspect;

        const forward = vec3_normalize(vec3_sub(vec4_t3(cameraTo), vec4_t3(cameraFrom)));
        const worldup = vec3_normalize(cameraUp);
        const right = vec3_normalize(vec3_cross(worldup, forward));
        const up = vec3_normalize(vec3_cross(forward, right));
        const half_height = near * Math.tan(fovy / 2);
        const half_width = aspect * half_height;

        const leftUp = vec3_normalize(vec3_add(vec3_add(vec3_scale(right, half_width), vec3_scale(up, half_height)), vec3_scale(forward, near)));
        const rightUp = vec3_normalize(vec3_add(vec3_add(vec3_scale(right, -half_width), vec3_scale(up, half_height)), vec3_scale(forward, near)));
        const rightDown = vec3_normalize(vec3_add(vec3_sub(vec3_scale(right, -half_width), vec3_scale(up, half_height)), vec3_scale(forward, near)));
        const leftDown = vec3_normalize(vec3_add(vec3_sub(vec3_scale(right, half_width), vec3_scale(up, half_height)), vec3_scale(forward, near)));

        // vertices in clip space
        const vertices = [

            -1, 1, 1, ...leftUp, //leftup
            -1, -1, 1, ...leftDown, //leftdown 
            1, -1, 1, ...rightDown, //rightdown
            1, -1, 1, ...rightDown, //rightdown
            1, 1, 1, ...rightUp, //rightup
            -1, 1, 1, ...leftUp //leftup

        ]

        return new Float32Array(vertices);


    }

    use() {
        if (this.gl !== null) {
            this.gl.useProgram(this.program);
        }
    }


    /** 
     * @typedef CubeMapInfo 
     * @property {number} face
     * @property {string} src
    */

    setCubeMap(info: CubeMapInfo[]) {
        if (this.gl === null) {
            console.error("gl is null");
            return;
        }
        this.use();
        // if (this.#texutre) {
        //     this.gl.deleteTexture(this.#texutre);
        // }
        this.#texutre = this.gl.createTexture();
        const that = this;

        info.forEach((face) => {
            if (that.gl === null) {
                return;
            }
            const img = new Image();
            img.src = face.src;
            that.gl.bindTexture(that.gl.TEXTURE_CUBE_MAP, that.#texutre);
            that.gl.pixelStorei(that.gl.UNPACK_FLIP_Y_WEBGL, false);
            that.gl.texImage2D(face.face, 0, that.gl.RGBA, 512, 512, 0, that.gl.RGBA, that.gl.UNSIGNED_BYTE, null); //立即渲染纹理
            img.onload = function () {
                // 图片加载完成将其拷贝到纹理
                if (that.gl === null) {
                    return;
                }
                that.gl.bindTexture(that.gl.TEXTURE_CUBE_MAP, that.#texutre);
                that.gl.pixelStorei(that.gl.UNPACK_FLIP_Y_WEBGL, false);
                that.gl.texImage2D(face.face, 0, that.gl.RGBA, that.gl.RGBA, that.gl.UNSIGNED_BYTE, img);
                that.gl.generateMipmap(that.gl.TEXTURE_CUBE_MAP);
            }
        });
    }

    setUniforms(info: SkyboxUniformInfo) {
        if (this.gl === null || this.program === null) {
            return;
        }
        this.use();
        this.setCameraUniform();
        this.setProjectionUniform();
        this.setSunUniform();
    }

    setData() {
        if (this.gl === null || this.tinyearth.scene === null || this.program === null) {
            console.error("some of object is null");
            return null;
        }
        if (!this.#buffer) {
            this.#buffer = this.gl.createBuffer();
        }

        const vertices = this.createVetexData(this.tinyearth.scene);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.#buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const a_position = this.gl.getAttribLocation(this.program, "a_position");
        const a_direction = this.gl.getAttribLocation(this.program, "a_direction");

        this.gl.vertexAttribPointer(a_position, 3, this.gl.FLOAT, false, 6 * 4, 0); // 设置属性指针
        this.gl.enableVertexAttribArray(a_position); // 激活属性

        this.gl.vertexAttribPointer(a_direction, 3, this.gl.FLOAT, false, 6 * 4, 3 * 4); // 设置属性指针
        this.gl.enableVertexAttribArray(a_direction); // 激活属性
    }

    draw(): void {
        this.render();
    }

    render() {
        if (this.gl === null || !this.tinyearth.skybox) {
            return;
        }
        this.use();
        checkGLError(this.gl, "use");
        // const a_position = this.gl.getAttribLocation(this.program, "a_position");
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.#texutre);
        checkGLError(this.gl, "bindTexture");

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.#buffer);
        checkGLError(this.gl, "bindBuffer");

        this.setCameraUniform();

        this.setProjectionUniform();

        this.setData();

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        checkGLError(this.gl, "drawArrays");
    }

}