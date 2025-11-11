import { GLSLSource } from "./glsl";
import pointFragSource from './shader/point.frag';
import pointVertSource from './shader/point.vert';
import lineStringFragSource from './shader/wideLineString.frag';
import lineStringVertSource from './shader/wideLineString.vert';
import type TinyEarth from "./tinyearth";
import { mat4, vec2 } from "gl-matrix";

export interface ProgramOptions {
    tinyearth: TinyEarth,
    vertSource: GLSLSource,
    fragSource: GLSLSource
}

export abstract class Program {

    #tinyearth: TinyEarth;
    #gl: WebGL2RenderingContext;
    #vertSource: GLSLSource;
    #fragSource: GLSLSource;
    #program: WebGLProgram | null;

    constructor(options: ProgramOptions) {
        this.#tinyearth = options.tinyearth;
        this.#gl = this.#tinyearth.gl;
        this.#vertSource = options.vertSource;
        this.#fragSource = options.fragSource;
        this.#program = this.#createProgram();
    }

    #createProgram(): WebGLProgram | null {

        if (this.#gl === null) {
            return null;
        }

        const program = this.#gl.createProgram();

        let success;

        // vert
        const vertShader = this.#gl.createShader(this.#gl.VERTEX_SHADER);
        if (vertShader === null) {
            console.error("vertShader is null");
            return null;
        }
        this.#gl.shaderSource(vertShader, this.#vertSource.source);
        this.#gl.compileShader(vertShader);
        this.#gl.attachShader(program, vertShader);

        success = this.#gl.getShaderParameter(vertShader, this.#gl.COMPILE_STATUS);
        if (!success) {
            const error = this.#gl.getShaderInfoLog(vertShader);
            console.error('vertShader compile failed: ', error);
        }

        // frag
        const fragShader = this.#gl.createShader(this.#gl.FRAGMENT_SHADER);
        if (fragShader === null) {
            console.error("fragShader is null");
            return null;
        }
        this.#gl.shaderSource(fragShader, this.#fragSource.source);
        this.#gl.compileShader(fragShader);
        this.#gl.attachShader(program, fragShader);

        success = this.#gl.getShaderParameter(fragShader, this.#gl.COMPILE_STATUS);
        if (!success) {
            const error = this.#gl.getShaderInfoLog(fragShader);
            console.error('fragShader compile failed: ', error);
            return null;

        }

        this.#gl.linkProgram(program);

        success = this.#gl.getProgramParameter(program, this.#gl.LINK_STATUS);
        if (!success) {
            const error = this.#gl.getProgramInfoLog(program);
            console.error('program link failed: ', error);
            return null;
        }

        if (!program) {
            console.error("program is null");
            return null;
        }

        this.#program = program;
        return program;

    }

    get tinyearth(): TinyEarth {
        return this.#tinyearth;
    }

    get gl(): WebGL2RenderingContext {
        return this.#gl
    }

    get program(): WebGLProgram | null {
        return this.#program;
    }

    refreshAllUniforms() {
        this.setCameraUniform();
        this.setProjectionUniform();
        this.setSunUniform();
        this.setSceneUniform();
    }

    setCameraUniform() {
        if (this.program) {
            const u_camera_from = this.gl.getUniformLocation(this.program, "u_camera.from");
            const u_camera_up = this.gl.getUniformLocation(this.program, "u_camera.up");
            const u_camera_to = this.gl.getUniformLocation(this.program, "u_camera.to");
            const u_camera_viewmtx = this.gl.getUniformLocation(this.program, "u_camera.viewmtx");

            this.gl.uniform4fv(u_camera_from, this.tinyearth.scene.camera.from);
            this.gl.uniform4fv(u_camera_up, this.tinyearth.scene.camera.up);
            this.gl.uniform4fv(u_camera_to, this.tinyearth.scene.camera.to);
            this.gl.uniformMatrix4fv(u_camera_viewmtx, false, this.tinyearth.scene.camera.viewMatrix);
        }
    }

    setProjectionUniform() {
        if (this.program) {
            const u_projection_near = this.gl.getUniformLocation(this.program, "u_projection.near");
            const u_projection_far = this.gl.getUniformLocation(this.program, "u_projection.far");
            const u_projection_projmtx = this.gl.getUniformLocation(this.program, "u_projection.projmtx");

            this.gl.uniform1f(u_projection_near, this.tinyearth.scene.projection.near);
            this.gl.uniform1f(u_projection_far, this.tinyearth.scene.projection.far);
            this.gl.uniformMatrix4fv(u_projection_projmtx, false, this.tinyearth.scene.projection.perspectiveMatrix);
        }
    }

    setSceneUniform() {
        if (this.program) {
            const u_viewport = this.gl.getUniformLocation(this.program, "u_scene.viewport");
            if (u_viewport) {
                const v = vec2.fromValues(this.tinyearth.scene.viewWidth, this.tinyearth.scene.viewHeight);
                this.gl.uniform2fv(u_viewport, v);
            }

            const u_viewportmatrix = this.gl.getUniformLocation(this.program, "u_scene.viewportmtx");
            if (u_viewportmatrix) {
                const m = this.tinyearth.scene.viewportMatrix;
                this.gl.uniformMatrix4fv(u_viewportmatrix, false, m);
            }

            const u_logDepthC = this.gl.getUniformLocation(this.program, "u_scene.logDepthC");
            if (u_logDepthC) {
                this.gl.uniform1f(u_logDepthC, this.tinyearth.scene.getLogDepthC());
            }

        }
    }

    setSunUniform() {
        if (this.program) {
            const position = this.tinyearth.scene.sun.position;
            const positionLoc = this.gl.getUniformLocation(this.program, "u_sun.position");
            if (positionLoc) {
                this.gl.uniform3f(positionLoc, position[0], position[1], position[2]);
            }
            const colorLoc = this.gl.getUniformLocation(this.program, "u_sun.color");
            if (colorLoc) {
                this.gl.uniform4f(colorLoc, 1.0, 1.0, 1.0, 1.0);
            }
        }
    }

    setClampToGround(b: boolean) {
        if (this.program) {
            const loc = this.gl.getUniformLocation(this.program, "u_clampToGround");
            if (loc) {
                this.gl.uniform1i(loc, b ? 1 : 0);
            }
        }
    }

    setModelMatrixUniform(m: mat4 = mat4.create()) {
        if (this.program) {
            const loc = this.gl.getUniformLocation(this.program, "u_model.modelmtx");
            if (loc) {
                this.gl.uniformMatrix4fv(loc, false, m);
            }
        }
    }

    use() {
        this.gl.useProgram(this.program);
    }

    abstract draw(): void;

}

interface PointProgramOptions extends Omit<ProgramOptions, 'vertSource' | 'fragSource'> {}

export class PointProgram extends Program {

    #first: number = 0;
    #count: number = 0;

    constructor(options: PointProgramOptions) {
        super({ ...options, vertSource: new GLSLSource(pointVertSource), fragSource: new GLSLSource(pointFragSource) });

    }

    setFirst(first: number) {
        this.#first = first;
    }

    setCount(count: number) {
        this.#count = count;
    }

    draw() {
        this.use();
        this.gl.drawArrays(this.gl.POINTS, this.#first, this.#count);
    }

}

export interface LineStringProgramOptions extends Omit<ProgramOptions, 'vertSource' | 'fragSource'> {}

export class LineStringProgram extends Program {

    #first: number = 0;
    #count: number = 0;

    constructor(options: PointProgramOptions) {
        super({
            ...options,
            vertSource: new GLSLSource(lineStringVertSource),
            fragSource: new GLSLSource(lineStringFragSource)
        });

    }

    setFirst(first: number) {
        this.#first = first;
    }

    setCount(count: number) {
        this.#count = count;
    }

    draw(): void {
        this.use();
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, this.#first, this.#count);
        // this.gl.drawArrays(this.gl.LINE_STRIP, this.#first, this.#count);
        // this.gl.drawArrays(this.gl.POINTS, this.#first, this.#count);
    }

}