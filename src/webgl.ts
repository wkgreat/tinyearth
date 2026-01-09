// import type { NumArr4 } from "./defines";
// import { dfloat } from "./math";
// import type { Program } from "./program";
// import type TinyEarth from "./tinyearth";

// export interface GLBufferOptions {
//     gl: WebGL2RenderingContext;
//     id?: string
//     type: number
//     isDFloat?: boolean
// }

// export class GLBuffer {

//     id: string;
//     gl: WebGL2RenderingContext;
//     type: number;
//     isDFloat: boolean;
//     buffer0: WebGLBuffer | null = null;
//     buffer1: WebGLBuffer | null = null;

//     constructor(options: GLBufferOptions) {
//         this.id = options.id ?? crypto.randomUUID();
//         this.gl = options.gl;
//         this.type = options.type;
//         this.isDFloat = options.isDFloat ?? false;
//         this.buffer0 = this.gl.createBuffer();
//         if (this.isDFloat) {
//             this.buffer1 = this.gl.createBuffer();
//         }
//     }

//     fillData(data: number[], usage: GLenum = this.gl.STATIC_DRAW) {
//         if (this.isDFloat) {

//             const dfdata = data.map(d => dfloat.create(d));
//             const hdata = dfdata.map(d => d[0]);
//             const ldata = dfdata.map(d => d[1]);
//             if (this.buffer0 !== null) {
//                 this.gl.bindBuffer(this.type, this.buffer0);
//                 this.gl.bufferData(this.type, new Float32Array(hdata), usage);
//             } else {
//                 console.error("buffer is null");
//             }
//             if (this.buffer1 !== null) {
//                 this.gl.bindBuffer(this.type, this.buffer1);
//                 this.gl.bufferData(this.type, new Float32Array(ldata), usage);
//             } else {
//                 console.error("buffer is null");
//             }

//         } else {
//             if (this.buffer0 !== null) {
//                 this.gl.bindBuffer(this.type, this.buffer0);
//                 this.gl.bufferData(this.type, new Float32Array(data), usage);
//             } else {
//                 console.error("buffer is null");
//             }
//         }
//     }

//     updateData(data: number[]) {
//         //TODO
//     }

//     destroy() {
//         if (this.buffer0) {
//             this.gl.deleteBuffer(this.buffer0);
//             this.buffer0 = null;
//         }
//         if (this.buffer1) {
//             this.gl.deleteBuffer(this.buffer1);
//             this.buffer1 = null;
//         }
//     }

// }

// export interface GLAttributeOptions {
//     gl: WebGL2RenderingContext;
//     name: string;
//     elemSize: number;
//     numType?: number;
//     normalized?: boolean;
//     stride?: number;
//     offset?: number;
//     buffer?: GLBuffer;
//     usage?: number;
//     buftype?: number;
//     isDFloat?: boolean;
// }

// export class GLAttribute {

//     gl: WebGL2RenderingContext;
//     name: string;
//     elemSize: number;
//     numType: number;
//     normalized: boolean;
//     stride: number;
//     offset: number;
//     privateBuffer: GLBuffer | null = null;
//     sharedBuffer: GLBuffer | null = null;
//     usage: number;
//     isDFloat?: boolean;

//     constructor(options: GLAttributeOptions) {
//         this.gl = options.gl;
//         this.name = options.name;
//         this.numType = options.numType ?? this.gl.FLOAT;
//         this.elemSize = options.elemSize;
//         this.normalized = options.normalized ?? false;
//         this.stride = options.stride ?? 0;
//         this.offset = options.offset ?? 0;
//         this.isDFloat = options.isDFloat ?? false;
//         this.privateBuffer = options.buffer ?? new GLBuffer({
//             gl: this.gl,
//             type: options.buftype ?? this.gl.ARRAY_BUFFER,
//             isDFloat: this.isDFloat
//         });
//         this.usage = options.usage ?? this.gl.STATIC_DRAW;
//     }

//     shareBuffer(buffer: GLBuffer | null) {
//         this.sharedBuffer = buffer;
//     }

//     fillData(array: number[]) {
//         this.privateBuffer?.fillData(array, this.gl.STATIC_DRAW);
//     }

//     #active(program: Program, buffer: GLBuffer | null) {
//         if (this.gl) {
//             if (this.isDFloat) {

//                 const highname = `${this.name}_high`;
//                 const lowname = `${this.name}_low`;
//                 const highloc = program.getAttributeLocation(highname);
//                 const lowloc = program.getAttributeLocation(lowname);

//                 if (highloc >= 0 && lowloc >= 0 && buffer) {

//                     this.gl.bindBuffer(buffer.type, buffer.buffer0);
//                     this.gl.vertexAttribPointer(highloc, this.elemSize, this.numType, this.normalized, this.stride, this.offset);
//                     this.gl.enableVertexAttribArray(highloc);

//                     this.gl.bindBuffer(buffer.type, buffer.buffer1);
//                     this.gl.vertexAttribPointer(lowloc, this.elemSize, this.numType, this.normalized, this.stride, this.offset);
//                     this.gl.enableVertexAttribArray(lowloc);
//                 }

//             } else {
//                 const location = program.getAttributeLocation(this.name);
//                 if (location >= 0 && buffer) {
//                     this.gl.bindBuffer(buffer.type, buffer.buffer0);
//                     this.gl.vertexAttribPointer(location, this.elemSize, this.numType, this.normalized, this.stride, this.offset);
//                     this.gl.enableVertexAttribArray(location);
//                 }
//             }
//         }
//     }

//     activate(program: Program) {
//         if (this.sharedBuffer) {
//             this.#active(program, this.sharedBuffer);
//         } else {
//             this.#active(program, this.privateBuffer);
//         }
//     }

//     destroy() {
//         if (this.gl && this.privateBuffer) {
//             this.gl.deleteBuffer(this.privateBuffer);
//             this.privateBuffer = null;
//         }
//     }
// }

// export interface GLTexture2DOptions {
//     gl: WebGL2RenderingContext
//     unit: number;
//     name: string;
//     warps?: number;
//     warpt?: number;
//     minFilter?: number;
//     maxFilter?: number;
//     flipY?: boolean;
// }

// export class GLTexture2D {

//     gl: WebGL2RenderingContext;
//     unit: number;
//     name: string = "";
//     warps: number;
//     warpt: number;
//     minFilter: number;
//     maxFilter: number;
//     flipY: boolean;

//     texture: WebGLTexture | null = null;

//     constructor(options: GLTexture2DOptions) {
//         this.gl = options.gl;
//         this.name = options.name;
//         this.warps = options.warps ?? this.gl.CLAMP_TO_EDGE;
//         this.warpt = options.warpt ?? this.gl.CLAMP_TO_EDGE;
//         this.minFilter = options.minFilter ?? this.gl.NEAREST;
//         this.maxFilter = options.maxFilter ?? this.gl.NEAREST;
//         this.flipY = options.flipY ?? true;
//         this.unit = options.unit ?? this.gl.TEXTURE0;
//     }

//     setTextureData(data: TexImageSource) {

//         if (!this.texture) {
//             this.texture = this.gl.createTexture();
//         }

//         this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

//         this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.warps);
//         this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.warpt);
//         this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.minFilter);
//         this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.maxFilter);
//         this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, this.flipY);

//         this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);

//     }

//     activate(program: WebGLProgram) {
//         this.gl.activeTexture(this.unit);
//         this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
//         const uSampler = this.gl.getUniformLocation(program, this.name);
//         this.gl.uniform1i(uSampler, this.unit - this.gl.TEXTURE0);
//     }

// }

// export interface GLFrameBufferOptions {
//     tinyearth: TinyEarth,
//     width: number,
//     height: number,
//     enableColor?: boolean
//     enableDepth?: boolean
//     enableStencil?: boolean
// }

// export class GLFrameBuffer {

//     #tinyearth: TinyEarth;
//     #gl: WebGL2RenderingContext;
//     #width: number;
//     #height: number;
//     #enableColor: boolean;
//     #enableDepth: boolean;
//     #enableStencil: boolean;
//     #mask: number = 0;

//     #fbo: WebGLFramebuffer | null = null;
//     #colorTexture: WebGLTexture | null = null;
//     #depthTexture: WebGLTexture | null = null;

//     constructor(options: GLFrameBufferOptions) {
//         this.#tinyearth = options.tinyearth;
//         this.#gl = this.#tinyearth.gl;
//         this.#width = options.width;
//         this.#height = options.height;
//         this.#enableColor = options.enableColor ?? true;
//         this.#enableDepth = options.enableDepth ?? true;
//         this.#enableStencil = options.enableStencil ?? true;

//         if (!(this.#enableColor || this.#enableDepth || this.#enableStencil)) {
//             console.error("GLFrameBuffer: color/depth/atenci at least one component need enabled!");
//         }

//         if (this.#enableColor) {
//             this.#colorTexture = GLFrameBuffer.createFrameColorTexture(this.#gl, this.#width, this.#height);
//         }

//         if (this.#enableDepth || this.#enableStencil) {
//             this.#depthTexture = GLFrameBuffer.createFrameDepthTexture(this.#gl, this.#width, this.#height);
//         }

//         this.#mask = 0;
//         if (this.#enableColor) {
//             this.#mask |= this.#gl.COLOR_BUFFER_BIT;
//         }
//         if (this.#enableDepth) {
//             this.#mask |= this.#gl.DEPTH_BUFFER_BIT;
//         }
//         if (this.#enableStencil) {
//             this.#mask |= this.#gl.DEPTH_BUFFER_BIT;
//         }

//         this.#fbo = GLFrameBuffer.createFrameBufferWithTexture(this.#gl, this.#colorTexture, this.#depthTexture);
//     }

//     get fbo(): WebGLFramebuffer | null {
//         return this.#fbo;
//     }

//     get colorTexture(): WebGLTexture | null {
//         return this.#colorTexture;
//     }

//     get depthTexture(): WebGLTexture | null {
//         return this.#depthTexture;
//     }

//     clear(options?: {
//         color?: NumArr4,
//         depth?: number,
//         stencil?: number
//     }) {
//         const opts = options ?? {};
//         const color = opts.color ?? [0.0, 0.0, 0.0, 1.0];
//         const depth = opts.depth ?? 1.0;
//         const stencil = opts.stencil ?? 0.0;
//         this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, this.#fbo);
//         this.#gl.viewport(0, 0, this.#width, this.#height);
//         this.#gl.clearColor(...color);
//         this.#gl.clearDepth(depth);
//         this.#gl.clearStencil(stencil);
//         this.#gl.clear(this.#mask);
//     }

//     static bindGLFrameBuffer(gl: WebGL2RenderingContext, fb: GLFrameBuffer | null) {

//         gl.bindFramebuffer(gl.FRAMEBUFFER, fb ? fb.fbo : null);

//     }

//     tap() {
//         this.biltFrom(this.#tinyearth.frameBuffer);
//     }

//     biltFrom(src: GLFrameBuffer | null) {


//         this.#gl.bindFramebuffer(this.#gl.READ_FRAMEBUFFER, src ? src.fbo : null);
//         this.#gl.bindFramebuffer(this.#gl.DRAW_FRAMEBUFFER, this.#fbo);

//         this.#gl.blitFramebuffer(
//             0, 0, this.#width, this.#height,
//             0, 0, this.#width, this.#height,
//             this.#mask,
//             this.#gl.NEAREST
//         );

//         this.#gl.bindFramebuffer(this.#gl.READ_FRAMEBUFFER, null);
//         this.#gl.bindFramebuffer(this.#gl.DRAW_FRAMEBUFFER, null);

//     }

//     destroy() {
//         if (this.#colorTexture) {
//             this.#gl.deleteTexture(this.#colorTexture);
//             this.#colorTexture = null;
//         }
//         if (this.#depthTexture) {
//             this.#gl.deleteTexture(this.#depthTexture);
//             this.#depthTexture = null;
//         }
//         this.#gl.deleteFramebuffer(this.#fbo);
//     }

//     private static createFrameDepthTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {

//         const texture = gl.createTexture();
//         gl.bindTexture(gl.TEXTURE_2D, texture);

//         gl.texImage2D(
//             gl.TEXTURE_2D, 0, gl.DEPTH32F_STENCIL8, width, height,
//             0, gl.DEPTH_STENCIL, gl.FLOAT_32_UNSIGNED_INT_24_8_REV, null
//         );

//         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
//         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

//         return texture;

//     }

//     private static createFrameColorTexture(gl: WebGL2RenderingContext, width: number, height: number) {
//         const texture = gl.createTexture();
//         gl.bindTexture(gl.TEXTURE_2D, texture);
//         gl.texImage2D(
//             gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0,
//             gl.RGBA, gl.UNSIGNED_BYTE, null);
//         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
//         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//         return texture;
//     }

//     private static createFrameBufferWithTexture(gl: WebGL2RenderingContext, colorTexture: WebGLTexture | null, depthTexture: WebGLTexture | null) {

//         const fbo = gl.createFramebuffer();

//         gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

//         if (colorTexture) {
//             gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorTexture, 0);
//             gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
//             if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
//                 console.error('FBO incomplete!');
//             }
//         }

//         if (depthTexture) {
//             gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
//         }

//         return fbo;

//     }

// }