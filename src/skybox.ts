import starsky_nx from "./assets/starsky/nx.png";
import starsky_ny from "./assets/starsky/ny.png";
import starsky_nz from "./assets/starsky/nz.png";
import starsky_px from "./assets/starsky/px.png";
import starsky_py from "./assets/starsky/py.png";
import starsky_pz from "./assets/starsky/pz.png";
import Camera from "./camera.js";
import { checkGLError } from "./debug.js";
import { GLSLSource } from "./glsl.js";
import { VEC3, VEC4, type mat4, type vec3 } from "./matrix";
import { Program, type ProgramOptions } from "./program.js";
import type Projection from "./projection.js";
import Scene from "./scene.js";
import fragSource from "./shader/skybox.frag";
import vertSource from "./shader/skybox.vert";

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

        const forward = VEC3.normalize(VEC3.sub(VEC4.force3(cameraTo), VEC4.force3(cameraFrom)));
        const worldup = VEC3.normalize(cameraUp);
        const right = VEC3.normalize(VEC3.cross(worldup, forward));
        const up = VEC3.normalize(VEC3.cross(forward, right));
        const half_height = near * Math.tan(fovy / 2);
        const half_width = aspect * half_height;

        const leftUp = VEC3.normalize(VEC3.add(VEC3.add(VEC3.scale(right, half_width), VEC3.scale(up, half_height)), VEC3.scale(forward, near)));
        const rightUp = VEC3.normalize(VEC3.add(VEC3.add(VEC3.scale(right, -half_width), VEC3.scale(up, half_height)), VEC3.scale(forward, near)));
        const rightDown = VEC3.normalize(VEC3.add(VEC3.sub(VEC3.scale(right, -half_width), VEC3.scale(up, half_height)), VEC3.scale(forward, near)));
        const leftDown = VEC3.normalize(VEC3.add(VEC3.sub(VEC3.scale(right, half_width), VEC3.scale(up, half_height)), VEC3.scale(forward, near)));

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
        checkGLError(this.gl, "use", this.tinyearth.glErrorCheck);
        // const a_position = this.gl.getAttribLocation(this.program, "a_position");
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.#texutre);
        checkGLError(this.gl, "bindTexture", this.tinyearth.glErrorCheck);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.#buffer);
        checkGLError(this.gl, "bindBuffer", this.tinyearth.glErrorCheck);

        this.setCameraUniform();

        this.setProjectionUniform();

        this.setData();

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        checkGLError(this.gl, "drawArrays", this.tinyearth.glErrorCheck);
    }

}