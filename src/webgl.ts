
export interface GLBufferOptions {
    gl: WebGL2RenderingContext;
    id?: string
    type: number
}

export class GLBuffer {

    id: string;
    gl: WebGL2RenderingContext;
    type: number;
    buffer: WebGLBuffer;


    constructor(options: GLBufferOptions) {
        this.id = options.id ?? crypto.randomUUID();
        this.gl = options.gl;
        this.type = options.type;
        this.buffer = this.gl.createBuffer();
    }

}

export interface GLAttributeOptions {
    gl: WebGL2RenderingContext;
    name: string;
    elemSize: number;
    numType?: number;
    normalized?: boolean;
    stride?: number;
    offset?: number;
    buffer?: GLBuffer;
    usage?: number;
    buftype?: number;
}

export class GLAttribute {

    gl: WebGL2RenderingContext;
    name: string;
    elemSize: number;
    numType: number;
    normalized: boolean;
    stride: number;
    offset: number;
    buffer: GLBuffer;
    usage: number;

    constructor(options: GLAttributeOptions) {
        this.gl = options.gl;
        this.name = options.name;
        this.numType = options.numType ?? this.gl.FLOAT;
        this.elemSize = options.elemSize;
        this.normalized = options.normalized ?? false;
        this.stride = options.stride ?? 0;
        this.offset = options.offset ?? 0;
        this.buffer = options.buffer ?? new GLBuffer({
            gl: this.gl,
            type: options.buftype ?? this.gl.ARRAY_BUFFER
        });
        this.usage = options.usage ?? this.gl.STATIC_DRAW;
    }

    fillData(array: number[]) {
        this.gl.bindBuffer(this.buffer.type, this.buffer.buffer);
        // TODO create different typed array by numType
        this.gl.bufferData(this.buffer.type, new Float32Array(array), this.gl.STATIC_DRAW);
        console.log(`fillData: ${this.name}`);
        console.log(array);
    }

    modifyData() {
        //TODO
    }

    activate(program: WebGLProgram) {
        if (this.gl) {
            const location = this.gl.getAttribLocation(program, this.name);
            console.log(`attribute: ${this.name}, location: ${location}`);
            if (location >= 0) {
                this.gl.bindBuffer(this.buffer.type, this.buffer.buffer);
                this.gl.vertexAttribPointer(location, this.elemSize, this.numType, this.normalized, this.stride, this.offset);
                this.gl.enableVertexAttribArray(location);
            }
        }
    }
}

export interface GLTexture2DOptions {
    gl: WebGL2RenderingContext
    unit: number;
    name: string;
    warps?: number;
    warpt?: number;
    minFilter?: number;
    maxFilter?: number;
    flipY?: boolean;
}

export class GLTexture2D {

    gl: WebGL2RenderingContext;
    unit: number;
    name: string = "";
    warps: number;
    warpt: number;
    minFilter: number;
    maxFilter: number;
    flipY: boolean;

    texture: WebGLTexture | null = null;

    constructor(options: GLTexture2DOptions) {
        this.gl = options.gl;
        this.name = options.name;
        this.warps = options.warps ?? this.gl.CLAMP_TO_EDGE;
        this.warpt = options.warpt ?? this.gl.CLAMP_TO_EDGE;
        this.minFilter = options.minFilter ?? this.gl.NEAREST;
        this.maxFilter = options.maxFilter ?? this.gl.NEAREST;
        this.flipY = options.flipY ?? true;
        this.unit = options.unit ?? this.gl.TEXTURE0;
    }

    setTextureData(data: TexImageSource) {

        if (!this.texture) {
            this.texture = this.gl.createTexture();
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.warps);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.warpt);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.minFilter);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.maxFilter);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, this.flipY);

        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);

    }

    activate(program: WebGLProgram) {
        this.gl.activeTexture(this.unit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        const uSampler = this.gl.getUniformLocation(program, this.name);
        this.gl.uniform1i(uSampler, this.unit - this.gl.TEXTURE0);
    }

}