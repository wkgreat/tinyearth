import { GLSLSource } from "./glsl";
import { Program, type ProgramOptions } from "./program";
import type TinyEarth from "./tinyearth"
import vertSource from './shader/screenquad.vert';
import fragSource from './shader/screenquad.frag';

export interface ScreenQuadOptions {
    tinyearth: TinyEarth
    scale?: number,
    xoffset?: number,
    yoffset?: number
}

export class ScreenQuad {

    #tinyearth: TinyEarth;
    #gl: WebGL2RenderingContext;
    #scale: number;
    #xoffset: number;
    #yoffset: number;

    #vao: WebGLVertexArrayObject;
    #positionBuffer: WebGLBuffer;
    #texcoordBuffer: WebGLBuffer;

    constructor(options: ScreenQuadOptions) {

        this.#tinyearth = options.tinyearth;
        this.#gl = this.#tinyearth.gl;
        this.#scale = options.scale ?? 1;
        this.#xoffset = options.xoffset ?? 0;
        this.#yoffset = options.yoffset ?? 0;

        const positions = [
            -1 * this.#scale + this.#xoffset, -1 * this.#scale + this.#yoffset, -1,
            1 * this.#scale + this.#xoffset, 1 * this.#scale + this.#yoffset, -1,
            -1 * this.#scale + this.#xoffset, 1 * this.#scale + this.#yoffset, -1,
            -1 * this.#scale + this.#xoffset, -1 * this.#scale + this.#yoffset, -1,
            1 * this.#scale + this.#xoffset, -1 * this.#scale + this.#yoffset, -1,
            1 * this.#scale + this.#xoffset, 1 * this.#scale + this.#yoffset, -1
        ];

        const texcoords = [
            0, 0,
            1, 1,
            0, 1,
            0, 0,
            1, 0,
            1, 1
        ]

        this.#vao = this.#gl.createVertexArray();
        this.#gl.bindVertexArray(this.#vao);

        this.#positionBuffer = this.#gl.createBuffer();
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#positionBuffer);
        this.#gl.bufferData(this.#gl.ARRAY_BUFFER, new Float32Array(positions), this.#gl.STATIC_DRAW);
        this.#gl.enableVertexAttribArray(0);
        this.#gl.vertexAttribPointer(0, 3, this.#gl.FLOAT, false, 0, 0);


        this.#texcoordBuffer = this.#gl.createBuffer();
        this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.#texcoordBuffer);
        this.#gl.bufferData(this.#gl.ARRAY_BUFFER, new Float32Array(texcoords), this.#gl.STATIC_DRAW);
        this.#gl.enableVertexAttribArray(1);
        this.#gl.vertexAttribPointer(1, 2, this.#gl.FLOAT, false, 0, 0);

        this.#gl.bindVertexArray(null);
    }

    get vao(): WebGLVertexArrayObject {
        return this.#vao;
    }

    get positionBuffer(): WebGLBuffer {
        return this.#positionBuffer;
    }

    get texcoordBuffer(): WebGLBuffer {
        return this.#texcoordBuffer;
    }

}

export interface ScreenQuadProgramOptions extends Omit<ProgramOptions, 'vertSource' | 'fragSource'> {}

export class ScreenQuadProgram extends Program {

    quad: ScreenQuad | null = null;
    texture: WebGLTexture | null = null;

    constructor(options: ScreenQuadProgramOptions) {
        super({
            ...options,
            vertSource: new GLSLSource(vertSource),
            fragSource: new GLSLSource(fragSource)
        });
    }

    setQuad(quad: ScreenQuad | null) {
        this.quad = quad;
    }

    setTexture(texture: WebGLTexture | null) {
        this.texture = texture;
    }

    draw(): void {

        if (this.program === null || this.quad === null) {
            return;
        }

        this.gl.useProgram(this.program);

        this.setSceneUniform();

        if (this.texture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_texture"), 0);
        }

        this.gl.bindVertexArray(this.quad.vao);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        this.gl.bindVertexArray(null);

    }
}