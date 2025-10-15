import { glMatrix, mat4, vec3 } from "gl-matrix";
import { checkGLError } from "./debug.js";
import { vec3_add, vec3_cross, vec3_normalize, vec3_scale, vec3_sub, vec4_t3 } from "./glmatrix_utils.js";
import Scene from "./scene.js";
import fragSource from "./skybox.frag";
import vertSource from "./skybox.vert";
import TinyEarth from "./tinyearth.js";
import starsky_px from "./assets/starsky/px.png";
import starsky_py from "./assets/starsky/py.png";
import starsky_pz from "./assets/starsky/pz.png";
import starsky_nx from "./assets/starsky/nx.png";
import starsky_ny from "./assets/starsky/ny.png";
import starsky_nz from "./assets/starsky/nz.png";
glMatrix.setMatrixArrayType(Array);

export interface CubeMapInfo {
    face: number,
    src: string
};

export interface SkyboxUniformInfo {
    u_invProjViewMtx: mat4,
    u_worldCameraPos: vec3
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

export class SkyBoxProgram {


    tinyearth: TinyEarth;

    program: WebGLProgram | null = null;

    gl: WebGLRenderingContext | null = null;

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

    /**
     * @param {TinyEarth} tinyearth 
    */
    constructor(tinyearth: TinyEarth) {
        this.tinyearth = tinyearth;
        this.gl = tinyearth.gl;
        this.program = this.createProgram();
    }

    /**
     * @param {Scene} scene 
    */
    createVetexData(scene: Scene) {

        const cameraFrom = scene.camera.from;
        const cameraTo = scene.camera.to;
        const near = scene.projection.near;
        const fovy = scene.projection.fovy;
        const aspect = scene.projection.aspect;

        const forward = vec3_normalize(vec3_sub(vec4_t3(cameraTo), vec4_t3(cameraFrom)));
        const worldup = vec3.fromValues(0, 0, 1);
        const right = vec3_normalize(vec3_cross(worldup, forward));
        const up = vec3_normalize(vec3_cross(forward, right));
        const half_height = near * Math.tan(fovy / 2);
        const half_width = aspect * half_height;

        const leftup = vec3_normalize(vec3_add(vec3_add(vec3_scale(right, half_width), vec3_scale(up, half_height)), vec3_scale(forward, near)));
        const rightup = vec3_normalize(vec3_add(vec3_add(vec3_scale(right, -half_width), vec3_scale(up, half_height)), vec3_scale(forward, near)));
        const rightDown = vec3_normalize(vec3_add(vec3_sub(vec3_scale(right, -half_width), vec3_scale(up, half_height)), vec3_scale(forward, near)));
        const leftDown = vec3_normalize(vec3_add(vec3_sub(vec3_scale(right, half_width), vec3_scale(up, half_height)), vec3_scale(forward, near)));

        const vertices = [

            -1, 1, 1, ...leftup, //leftup
            -1, -1, 1, ...leftDown, //leftdown
            1, -1, 1, ...rightDown, //rightdown
            1, -1, 1, ...rightDown, //rightdown
            1, 1, 1, ...rightup, //rightup
            -1, 1, 1, ...leftup //leftup

        ]

        return new Float32Array(vertices);


    }

    createProgram() {

        if (this.gl === null) {
            return null;
        }
        /* 创建程序 */
        const program = this.gl.createProgram();

        let success;

        /* 程序加载着色器 */
        const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);

        if (vertShader === null) {
            console.error("vertShader is null");
            return null;
        }

        this.gl.shaderSource(vertShader, vertSource);
        this.gl.compileShader(vertShader);
        this.gl.attachShader(program, vertShader);

        success = this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS);
        if (!success) {
            const error = this.gl.getShaderInfoLog(vertShader);
            console.error('vertShader编译失败: ', error);
        }

        const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        if (fragShader === null) {
            console.error("fragShader is null");
            return null;
        }
        this.gl.shaderSource(fragShader, fragSource);
        this.gl.compileShader(fragShader);
        this.gl.attachShader(program, fragShader);

        success = this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS);
        if (!success) {
            const error = this.gl.getShaderInfoLog(fragShader);
            console.error('fragShader编译失败: ', error);
        }

        this.gl.linkProgram(program);

        success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
        if (!success) {
            const error = this.gl.getProgramInfoLog(program);
            console.error('program 连接失败失败: ', error);
        }

        if (!program) {
            console.error("program is null");
        }

        this.program = program;
        return program;
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
        this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "u_invProjViewMtx"), false, info.u_invProjViewMtx);
        this.gl.uniform3fv(this.gl.getUniformLocation(this.program, "u_worldCameraPos"), info.u_worldCameraPos);
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

        this.setData();

        // this.gl.vertexAttribPointer(a_position, 3, this.gl.FLOAT, false, 0, 0); // 设置属性指针
        // this.gl.enableVertexAttribArray(a_position); // 激活属性
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        checkGLError(this.gl, "drawArrays");
    }

}