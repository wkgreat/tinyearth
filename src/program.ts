import type { vec4 } from "gl-matrix";
import Color from "./color";
import { GLSLSource, type GLSLDefines } from "./glsl";
import { dfloat, dfmat4, dfvec2, dfvec3, dfvec4, type DFloat } from "./math";
import { MAT4, VEC2, VEC3, type mat4, type vec2, type vec3 } from "./matrix";
import pointFragSource from './shader/point.frag';
import pointVertSource from './shader/point.vert';
import lineStringFragSource from './shader/wideLineString.frag';
import lineStringVertSource from './shader/wideLineString.vert';
import type TinyEarth from "./tinyearth";

export interface ProgramAdvanceOptions {
    depthTest?: boolean
    wireframe?: boolean
    logDepth?: boolean
}

export interface ProgramOptions {
    tinyearth: TinyEarth,
    vertSource: GLSLSource,
    fragSource: GLSLSource
    advance?: ProgramAdvanceOptions
}

export abstract class Program {

    #tinyearth: TinyEarth;
    #gl: WebGL2RenderingContext;
    #vertSource: GLSLSource;
    #fragSource: GLSLSource;
    #program: WebGLProgram | null;

    protected advance: ProgramAdvanceOptions = {};
    protected defines: GLSLDefines = {};

    #attributeLocationMap: { [k: string]: number } = {}
    #uniformLocationMap: { [k: string]: WebGLUniformLocation } = {}

    constructor(options: ProgramOptions) {
        this.#tinyearth = options.tinyearth;
        this.#gl = this.#tinyearth.gl;
        this.#vertSource = options.vertSource;
        this.#fragSource = options.fragSource;
        const _adv = options.advance ?? {};

        this.advance.depthTest = _adv.depthTest ?? false;
        this.advance.wireframe = _adv.wireframe ?? false;
        this.advance.logDepth = _adv.logDepth ?? false;

        this.defines.DEBUG_DEPTH = !!this.advance.depthTest;
        this.defines.WIREFRAME = !!this.advance.wireframe;
        this.defines.LOG_DEPTH = !!this.advance.logDepth;

        this.#vertSource.defines = this.defines;
        this.#fragSource.defines = this.defines;

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
            this.#vertSource.logSource();
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
            this.#fragSource.logSource();
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

        this.#createLocationMap();

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

    #createLocationMap() {
        if (this.program) {
            const aCount = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);
            for (let i = 0; i < aCount; ++i) {
                const info = this.gl.getActiveAttrib(this.program, i);
                if (info) {
                    const loc = this.gl.getAttribLocation(this.program, info.name);
                    if (loc >= 0) {
                        this.#attributeLocationMap[info.name] = loc;
                    }
                }
            }
            const uCount = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < uCount; ++i) {
                const info = this.gl.getActiveUniform(this.program, i);
                if (info) {
                    let name = info.name;
                    if (name.endsWith("[0]")) {
                        name = name.slice(0, -3);
                    }
                    const loc = this.gl.getUniformLocation(this.program, name);
                    if (loc) {
                        this.#uniformLocationMap[name] = loc;
                    }
                }
            }
        }
    }

    #getAttributeLocationFromMap(name: string): number {
        return this.#attributeLocationMap[name] ?? -1;
    }

    #getUniformLocationFromMap(name: string): WebGLUniformLocation | null {
        return this.#uniformLocationMap[name] ?? null;
    }

    getAttributeLocation(name: string): number {
        return this.#attributeLocationMap[name] ?? -1;
    }

    refreshAllUniforms() {
        this.setCameraUniform();
        this.setProjectionUniform();
        this.setSunUniform();
        this.setSceneUniform();
    }

    getUniformLocation(name: string, isDFloat: boolean = false): [WebGLUniformLocation | null, WebGLUniformLocation | null] {
        if (this.program === null) {
            if (isDFloat) {
                return [null, null];
            } else {
                return [null, null];
            }
        }
        if (isDFloat) {
            const high = this.#getUniformLocationFromMap(`${name}.high`);
            const low = this.#getUniformLocationFromMap(`${name}.low`);
            return [high, low];

        } else {
            const loc = this.#getUniformLocationFromMap(name);
            return [loc, null];
        }
    }

    setUniform1i(name: string, x: GLint) {
        this.#gl.uniform1i(this.#getUniformLocationFromMap(name), x);
    }

    setUniformFloat(name: string, f: number) {
        this.#gl.uniform1f(this.#getUniformLocationFromMap(name), f);
    }

    setUniform1f(name: string, x: number) {
        this.gl.uniform1f(this.#getUniformLocationFromMap(name), x);
    }

    setUniform4f(name: string, x: number, y: number, z: number, w: number) {
        this.gl.uniform4f(this.#getUniformLocationFromMap(name), x, y, z, w);
    }

    setUniform4fv(name: string, v: Float32List) {
        this.gl.uniform4fv(this.#getUniformLocationFromMap(name), v);
    }

    setUniformBool(name: string, b: boolean) {
        const [loc, _] = this.getUniformLocation(name);
        if (loc) {
            this.#gl.uniform1i(loc, b ? 1 : 0);
        }
    }

    setUniformColor(name: string, color: Color) {
        const [loc, _] = this.getUniformLocation(name);
        if (loc) {
            this.#gl.uniform4fv(loc, color.toArray());
        }
    }

    setUniformDFloat(name: string, value: number) {
        const [hloc, lloc] = this.getUniformLocation(name, true);
        const df: DFloat = dfloat.create(value);
        if (hloc) {
            this.gl.uniform1f(hloc, dfloat.high(df));
        }
        if (lloc) {
            this.gl.uniform1f(lloc, dfloat.low(df));
        }
    }

    setUniformDFvec2(name: string, v: vec2) {

        const [hloc, lloc] = this.getUniformLocation(name, true);
        const d = dfvec2.create(v);
        if (hloc) {
            this.gl.uniform2fv(hloc, dfvec2.high(d));
        }
        if (lloc) {
            this.gl.uniform2fv(lloc, dfvec2.low(d));
        }

    }

    setUniformDFvec3(name: string, v: vec3) {

        const [hloc, lloc] = this.getUniformLocation(name, true);
        const d = dfvec3.create(v);
        if (hloc) {
            this.gl.uniform3fv(hloc, dfvec3.high(d));
        }
        if (lloc) {
            this.gl.uniform3fv(lloc, dfvec3.low(d));
        }

    }

    setUniformDFvec4(name: string, v: vec4) {

        const [hloc, lloc] = this.getUniformLocation(name, true);
        const d = dfvec4.create(v);
        if (hloc) {
            this.gl.uniform4fv(hloc, dfvec4.high(d));
        }
        if (lloc) {
            this.gl.uniform4fv(lloc, dfvec4.low(d));
        }

    }

    setUniformDFmat4(name: string, transpose: boolean, m: mat4) {
        const [hloc, lloc] = this.getUniformLocation(name, true);
        const dm = dfmat4.create(m);
        if (hloc) {
            this.gl.uniformMatrix4fv(hloc, transpose, dfmat4.high(dm));
        }
        if (lloc) {
            this.gl.uniformMatrix4fv(lloc, transpose, dfmat4.low(dm));
        }
    }

    setCameraUniform() {
        if (this.program) {
            const u_camera_from = this.getUniformLocation("u_camera.from")[0];
            const u_camera_up = this.getUniformLocation("u_camera.up")[0];
            const u_camera_to = this.getUniformLocation("u_camera.to")[0];
            const u_camera_viewmtx = this.getUniformLocation("u_camera.viewmtx")[0];
            const u_relviewmtx = this.getUniformLocation("u_camera.relviewmtx")[0];

            if (u_camera_from) {
                this.gl.uniform4fv(u_camera_from, this.tinyearth.scene.camera.from);
            }
            if (u_camera_up) {
                this.gl.uniform4fv(u_camera_up, this.tinyearth.scene.camera.up);
            }
            if (u_camera_to) {
                this.gl.uniform4fv(u_camera_to, this.tinyearth.scene.camera.to);
            }
            if (u_camera_viewmtx) {
                this.gl.uniformMatrix4fv(u_camera_viewmtx, false, this.tinyearth.scene.camera.viewMatrix);
            }
            if (u_relviewmtx) {
                this.gl.uniformMatrix4fv(u_relviewmtx, false, this.tinyearth.scene.camera.relViewMatrix);
            }
            this.setUniformFloat("u_camera.height", this.tinyearth.scene.camera.getHeightToSurface());

            ////
            this.setUniformDFvec4("u_camera_df.from", this.tinyearth.scene.camera.from);
            this.setUniformDFvec4("u_camera_df.up", this.tinyearth.scene.camera.up);
            this.setUniformDFvec4("u_camera_df.to", this.tinyearth.scene.camera.to);
            this.setUniformDFmat4("u_camera_df.viewmtx", false, this.tinyearth.scene.camera.viewMatrix);
            this.setUniformDFmat4("u_camera_df.relviewmtx", false, this.tinyearth.scene.camera.relViewMatrix);
            this.setUniformDFloat("u_camera_df.height", this.tinyearth.scene.camera.getHeightToSurface());

        }
    }

    setProjectionUniform() {
        if (this.program) {
            const u_projection_near = this.getUniformLocation("u_projection.near")[0];
            const u_projection_far = this.getUniformLocation("u_projection.far")[0];
            const u_projection_projmtx = this.getUniformLocation("u_projection.projmtx")[0];

            if (u_projection_near) {
                this.gl.uniform1f(u_projection_near, this.tinyearth.scene.projection.near);
            }
            if (u_projection_far) {
                this.gl.uniform1f(u_projection_far, this.tinyearth.scene.projection.far);
            }
            if (u_projection_projmtx) {
                this.gl.uniformMatrix4fv(u_projection_projmtx, false, this.tinyearth.scene.projection.perspectiveMatrix);
            }

            ////
            this.setUniformDFloat("u_projection_df.near", this.tinyearth.scene.projection.near);
            this.setUniformDFloat("u_projection_df.far", this.tinyearth.scene.projection.far);
            this.setUniformDFmat4("u_projection_df.projmtx", false, this.tinyearth.scene.projection.perspectiveMatrix);

        }
    }

    setSceneUniform() {
        if (this.program) {
            const u_viewport = this.gl.getUniformLocation(this.program, "u_scene.viewport");
            if (u_viewport) {
                const v = VEC2.fromValues(this.tinyearth.scene.viewWidth, this.tinyearth.scene.viewHeight);
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

            const u_neardepth = this.gl.getUniformLocation(this.program, "u_scene.neardepth");
            if (u_neardepth) {
                this.gl.uniform1f(u_neardepth, this.tinyearth.nearDepth);
            }

            const u_fardepth = this.gl.getUniformLocation(this.program, "u_scene.fardepth");
            if (u_fardepth) {
                this.gl.uniform1f(u_fardepth, this.tinyearth.farDepth);
            }

            ////
            this.setUniformDFvec2("u_scene_df.viewport", VEC2.fromValues(this.tinyearth.scene.viewWidth, this.tinyearth.scene.viewHeight));
            this.setUniformDFmat4("u_scene_df.viewportmtx", false, this.tinyearth.scene.viewportMatrix);
            this.setUniformDFloat("u_scene_df.logDepthC", this.tinyearth.scene.getLogDepthC());
            this.setUniformDFloat("u_scene_df.neardepth", this.tinyearth.nearDepth);
            this.setUniformDFloat("u_scene_df.fardepth", this.tinyearth.farDepth);

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

            ////
            this.setUniformDFvec3("u_sun_df.position", VEC3.fromArray(position));
            this.setUniformColor("u_sun_df.color", new Color(1.0, 1.0, 1.0, 1.0));

        }
    }

    setClampToGround(b: boolean, offset: number = 0, depthOffset: number = 0) {
        this.setUniformBool("u_clampToGround", b);
        this.setUniformFloat("u_clampToGroundOffset", offset);
        this.setUniformFloat("u_clampToGroundDepthOffset", depthOffset);
    }

    setModelMatrixUniform(m: mat4 = MAT4.create()) {
        if (this.program) {
            const loc = this.gl.getUniformLocation(this.program, "u_model.modelmtx");
            if (loc) {
                this.gl.uniformMatrix4fv(loc, false, m);
            }

            ////
            this.setUniformDFmat4("u_model_df.modelmtx", false, m);
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
        const vertGLSLSource = new GLSLSource(pointVertSource);
        const fragGLSLSource = new GLSLSource(pointFragSource);
        super({ ...options, vertSource: vertGLSLSource, fragSource: fragGLSLSource });

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