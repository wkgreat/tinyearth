import type { ColorLike } from "./color";
import Color from "./color";
import type { Entity, GeometryEntity, LineStringEntity, PointEntity } from "./entity";
// import { LineStringProgram, PointProgram, type Program } from "./program";
import SRS from "./proj";
import type { GeometryStyle, LineStringStyle, PointStyle, Style, StyleBoolMapFunction, StyleColorMapFunction, StyleNumberMapFunction } from "./style";
import type TinyEarth from "./tinyearth";
import { WGSLSource } from "./wgsl";
import pointLayerSource from './shader/point.wgsl';
import { createBuffersAndAttributesFromArrays, makeShaderDataDefinitions, makeStructuredView, type BuffersAndAttributes, type ShaderDataDefinitions, type TypedArray } from "webgpu-utils";
import { dfloat, dfvec3 } from "./math";
import lineStringSource from './shader/wideLineString.wgsl';

export interface LayerOptions {
    tinyearth: TinyEarth;
    id?: string
    entities: Entity[]
    style: Style,
    clampToGround?: boolean
    clampToGroundOffset?: number
}

export abstract class Layer {

    tinyearth: TinyEarth;
    id: string;
    entities: Entity[];
    style: Style;
    // program: Program | null = null;
    clampToGround: boolean;
    clampToGroundOffset: number;

    // protected attributes: { [k: string]: GLAttribute } = {};

    constructor(options: LayerOptions) {
        this.tinyearth = options.tinyearth;
        this.id = options.id ?? crypto.randomUUID();
        this.entities = options.entities;
        this.style = options.style;
        this.clampToGround = options.clampToGround ?? false;
        this.clampToGroundOffset = options.clampToGroundOffset ?? 0;

        // this.program = this.createProgram();
        this.createAttributes();
        this.fillAttributes();
        this.createTextures();
        this.fillTextures();
    }

    // abstract createProgram(): Program;

    abstract createAttributes(): void;

    abstract fillAttributes(): void;

    abstract refreshAttributes(): void;

    abstract activateAttributes(): void;

    abstract createTextures(): void;

    abstract fillTextures(): void;

    abstract refreshTextures(): void;

    abstract activateTextures(): void;

    abstract refreshUniforms(): void;

    abstract beforeDraw(): void;

    abstract afterDraw(): void;

    draw() {
        // if (this.program === null || this.program.program === null) {
        //     return;
        // }
        // this.program.use();
        // this.activateAttributes();
        // this.activateTextures();
        // this.refreshUniforms();
        // this.beforeDraw();
        // this.program.draw();
        // this.afterDraw();
    }

    getColorArray(color: ColorLike | StyleColorMapFunction, count: number): number[][] {
        let colors: number[][] = [];
        if (typeof color === 'function') {
            colors = this.entities.map(e => {
                const c = Color.build(color(e));
                return c !== null ? [c.r, c.g, c.b, c.a] : [0, 0, 0, 0];
            })
        } else {
            let c = Color.build(color);
            c = c === null ? new Color(0, 0, 0, 0) : c;
            colors = Array(count).fill(c.toArray());
        }
        return colors;
    }

    getNumberArray(num: number | StyleNumberMapFunction, count: number): number[] {
        if (typeof num === 'function') {
            return this.entities.map(e => num(e));
        } else {
            return Array(count).fill(num);
        }
    }

    getBoolArray(b: boolean | StyleBoolMapFunction, count: number): number[] {
        if (typeof b === 'function') {
            return this.entities.map(e => b(e) ? 1 : 0);
        } else {
            return Array(count).fill(b ? 1 : 0);
        }
    }

}

export interface GeometryLayerOptions extends LayerOptions {
    entities: GeometryEntity[]
    style: GeometryStyle;
}

export abstract class GeometryLayer extends Layer {

    override entities: GeometryEntity[];

    constructor(options: GeometryLayerOptions) {

        super(options);

        this.entities = options.entities;

    }
}

export interface PointLayerOptions extends GeometryLayerOptions {
    entities: PointEntity[];
    style: PointStyle;
}

export class PointLayer extends GeometryLayer {

    override entities: PointEntity[];
    override style: PointStyle;

    webgpuProxy: {
        module?: GPUShaderModule;
        pipeline?: GPURenderPipeline;
        shaderDefinition?: ShaderDataDefinitions;
        vertexBuffers?: {
            quad?: BuffersAndAttributes,
            pointpos?: BuffersAndAttributes,
            pointattr?: BuffersAndAttributes
        },
        clampToGroundUniform?: GPUBuffer,
        bindGroupLayout?: GPUBindGroupLayout
    } = {}

    constructor(options: PointLayerOptions) {
        super(options);
        this.entities = options.entities;
        this.style = options.style;

        this.createBindGroupLayout();

        this.fillVertexBuffer();

        this.createPipeline();

        this.setStaticUniform();

    }

    createPipeline() {

        const { device } = this.tinyearth.gpuinfo!;
        const source = new WGSLSource(pointLayerSource);
        const code = source.resovleSource();
        const module = device.createShaderModule({
            label: "PointLayer",
            code
        });

        const shaderDefinition = makeShaderDataDefinitions(code);

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [
                this.tinyearth.scene!.bindGroupLayout,
                this.webgpuProxy.bindGroupLayout
            ]
        });

        const pipeline = device.createRenderPipeline({
            label: "PointLayer",
            layout: pipelineLayout,
            vertex: {
                module,
                buffers: [
                    ...this.webgpuProxy!.vertexBuffers!.quad!.bufferLayouts!,
                    ...this.webgpuProxy!.vertexBuffers!.pointpos!.bufferLayouts!,
                    ...this.webgpuProxy!.vertexBuffers!.pointattr!.bufferLayouts!
                ],
                constants: {
                    ENABLE_LOG_DEPTH: this.tinyearth.advance.glLogDepth ? 1 : 0
                }
            },
            fragment: {
                module,
                targets: [
                    {
                        format: this.tinyearth.canvasinfo!.context.getConfiguration()!.format
                    }
                ],
                constants: {
                    ENABLE_LOG_DEPTH: this.tinyearth.advance.glLogDepth ? 1 : 0
                }
            },
            primitive: {
                topology: 'triangle-strip',
                cullMode: 'none'
            },
            depthStencil: this.tinyearth.getDepthStencilState()
        });

        this.webgpuProxy.module = module;
        this.webgpuProxy.pipeline = pipeline;
        this.webgpuProxy.shaderDefinition = shaderDefinition;
    }

    override createAttributes() {}
    override fillAttributes(): void {}
    override refreshAttributes(): void {}
    override activateAttributes(): void {}
    override createTextures(): void {}
    override fillTextures(): void {}
    override refreshTextures(): void {}
    override activateTextures(): void {}
    override refreshUniforms(): void {}
    override beforeDraw(): void {}
    override afterDraw(): void {}

    createBindGroupLayout() {

        const device = this.tinyearth.gpuinfo!.device!;

        const layout = device.createBindGroupLayout({
            label: "PointLayer",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                }
            ]
        });

        this.webgpuProxy.bindGroupLayout = layout;

    }

    fillVertexBuffer() {
        if (!this.webgpuProxy) {
            this.webgpuProxy = {};
        }

        const device = this.tinyearth.gpuinfo!.device!;
        const count = this.entities.length;

        if (!this.webgpuProxy.vertexBuffers) {
            this.webgpuProxy.vertexBuffers = {}
        }

        const vertexBuffers = this.webgpuProxy.vertexBuffers;

        if (!vertexBuffers.quad) {
            const quadpos = [-1, -1, 1, -1, -1, 1, 1, 1];
            const quaduv = [0, 0, 1, 0, 0, 1, 1, 1];

            vertexBuffers.quad = createBuffersAndAttributesFromArrays(device, {
                quadpos: { data: quadpos, numComponents: 2 },
                quaduv: { data: quaduv, numComponents: 2 }
            }, {
                interleave: true,
                stepMode: 'vertex',
                shaderLocation: 0
            });
        }

        if (!vertexBuffers.pointpos) {
            const positions = this.entities.map(e => {
                const p = e.point.srs !== SRS.ECEF ? e.point.transform(SRS.ECEF, false) : e.point;
                return [
                    p.x, p.y, p.z
                ];
            });
            const positionsHigh = positions.map(p => {
                const dp = dfvec3.create(p);
                return [dp[0][0], dp[0][1], dp[0][2]]
            });

            const positionsLow = positions.map(p => {
                const dp = dfvec3.create(p);
                return [dp[1][0], dp[1][1], dp[1][2]]
            })

            vertexBuffers.pointpos = createBuffersAndAttributesFromArrays(device, {
                pointpos: { data: positions.flatMap(c => c), numComponents: 3 },
                pointpos_high: { data: positionsHigh.flatMap(c => c), numComponents: 3 },
                pointpos_low: { data: positionsLow.flatMap(c => c), numComponents: 3 }
            }, {
                interleave: true,
                stepMode: 'instance',
                shaderLocation: 2
            });

        }

        if (!vertexBuffers.pointattr) {
            const sizes = this.getNumberArray(this.style.size, count);
            const colors = this.getColorArray(this.style.color, count).flatMap(c => c);
            const strokes = this.getBoolArray(this.style.stoke, count);
            const strokeColors = this.getColorArray(this.style.strokeColor, count).flatMap(c => c);
            const strokeWidths = this.getNumberArray(this.style.strokeWidth, count);

            vertexBuffers.pointattr = createBuffersAndAttributesFromArrays(device, {
                color: { data: colors, numComponents: 4 },
                size: { data: sizes, numComponents: 1 },
                stroke: { data: new Uint32Array(strokes), numComponents: 1 },
                strokewidth: { data: strokeWidths, numComponents: 1 },
                strokecolor: { data: strokeColors, numComponents: 4 }
            }, {
                stepMode: 'instance',
                shaderLocation: 5
            });
        }
    }

    setStaticUniform() {

        if (!this.webgpuProxy) {
            return;
        }

        if (!this.webgpuProxy.clampToGroundUniform) {
            const device = this.tinyearth.gpuinfo!.device!;

            const shaderDef = this.webgpuProxy?.shaderDefinition!;

            const clampToGroundUniformView = makeStructuredView(shaderDef.uniforms.clampToGround!);

            clampToGroundUniformView.set({
                isEnabled: this.clampToGround ? 1 : 0,
                offset: this.clampToGroundOffset
            });

            console.log(this.clampToGroundOffset);

            this.webgpuProxy.clampToGroundUniform = device.createBuffer({
                label: "PointLayer clampToGroundUniform",
                size: clampToGroundUniformView.arrayBuffer.byteLength,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });

            device.queue.writeBuffer(this.webgpuProxy.clampToGroundUniform, 0, clampToGroundUniformView.arrayBuffer);
        }

    }


    override draw() {

        const device = this.tinyearth.gpuinfo!.device;

        const sceneBindGroup = this.tinyearth.scene!.getBindGroup();
        const layerBindGroup = device.createBindGroup({
            layout: this.webgpuProxy.bindGroupLayout!,
            entries: [
                { binding: 0, resource: { buffer: this.webgpuProxy.clampToGroundUniform! } }
            ]
        });

        const encode = device.createCommandEncoder();

        const pass = encode.beginRenderPass(this.tinyearth.getRenderPassDescriptor(false));

        pass.setPipeline(this.webgpuProxy.pipeline!);
        pass.setBindGroup(0, sceneBindGroup);
        pass.setBindGroup(1, layerBindGroup);
        pass.setVertexBuffer(0, this.webgpuProxy.vertexBuffers!.quad!.buffers[0]);
        pass.setVertexBuffer(1, this.webgpuProxy.vertexBuffers!.pointpos!.buffers[0]);
        pass.setVertexBuffer(2, this.webgpuProxy.vertexBuffers?.pointattr!.buffers[0]);
        pass.draw(4, this.entities.length);
        pass.end();

        const commandBuffer = encode.finish();

        device.queue.submit([commandBuffer]);

    }

}

export interface LineStringLayerOptions extends GeometryLayerOptions {
    entities: LineStringEntity[];
    style: LineStringStyle;
}

export class LineStringLayer extends GeometryLayer {

    override entities: LineStringEntity[];
    override style: LineStringStyle;

    vertexCount = 0;

    webgpuProxy: {
        module?: GPUShaderModule;
        pipeline?: GPURenderPipeline;
        shaderDefinition?: ShaderDataDefinitions;
        vertexBuffers: {
            vertex?: BuffersAndAttributes
        },
        bindGroupLayouts: {
            scene?: GPUBindGroupLayout
            clampToGound?: GPUBindGroupLayout
        },
        uniforms: {
            clampToGround?: GPUBuffer
        }
    } = {
            vertexBuffers: {},
            bindGroupLayouts: {},
            uniforms: {}
        }

    constructor(options: LineStringLayerOptions) {
        super(options);
        this.entities = options.entities;
        this.style = options.style;

        this.initWebGPUProxy();

    }

    initAndFillVertexBuffer() {
        //TODO: split to n segments
        const entityColors = this.getColorArray(this.style.color, this.entities.length);

        const entityLinewidths = this.getNumberArray(this.style.lineWidth, this.entities.length);

        //TODO as param
        const entitySegs = this.getNumberArray(this.style.lineNumSegs, this.entities.length);

        const lineData = this.entities.map((e: LineStringEntity, i: number) => {

            const line = e.lineString.transform(SRS.ECEF, false);
            const lineLength = line.length;
            const step = lineLength / entitySegs[i]!;
            const denseLine = line.dense(step, true);
            const size = denseLine.size;
            const mileage = denseLine.mileage();
            const normlen = mileage.map(m => m / lineLength);

            const entityids = Array(size).fill(i);
            const poslist = denseLine.toArray(3);
            const colors = Array(size).fill(entityColors[i]);
            const linewidths = Array(size).fill(entityLinewidths[i]);
            const lastposlist = [poslist[0] as number[], ...poslist.slice(0, poslist.length - 1)];
            const nextposlist = [...poslist.slice(1, poslist.length), poslist[poslist.length - 1] as number[]];

            function createDFPointList(pointList: number[][]) {
                const highlist = pointList.map(p => {
                    const df = p.map(c => dfloat.create(c));
                    const high = df.map(d => d[0]);
                    return high;
                })

                const lowlist = pointList.map(p => {
                    const df = p.map(c => dfloat.create(c));
                    const low = df.map(d => d[1]);
                    return low;
                })

                return {
                    high: highlist,
                    low: lowlist
                }
            }

            const { high: posHighList, low: posLowList } = createDFPointList(poslist);
            const { high: lastposHighList, low: lastposLowList } = createDFPointList(lastposlist);
            const { high: nextposHighList, low: nextposLowList } = createDFPointList(nextposlist);


            const doubleLastposlist = lastposlist.flatMap(p => [p, p]);
            const doubleNextposlist = nextposlist.flatMap(p => [p, p]);
            const doublePosList = poslist.flatMap(p => [p, p]);
            const doubleLastPosHighList = lastposHighList.flatMap(p => [p, p]);
            const doubleLastPosLowList = lastposLowList.flatMap(p => [p, p]);
            const doubleNextPosHighList = nextposHighList.flatMap(p => [p, p]);
            const doubleNextPosLowList = nextposLowList.flatMap(p => [p, p]);
            const doublePosHighList = posHighList.flatMap(p => [p, p]);
            const doublePosLowList = posLowList.flatMap(p => [p, p]);

            const doubleSides = poslist.flatMap(p => [1, -1]);
            const doubleEntityids = entityids.flatMap(e => [e, e]);
            const doubleColors = colors.flatMap(c => [c, c]);
            const doubleLinewidths = linewidths.flatMap(w => [w, w]);
            const doublenormlens = normlen.flatMap(m => [m, m]);

            return {
                lastposlist: doubleLastposlist,
                nextposlist: doubleNextposlist,
                poslist: doublePosList,
                lastposHighList: doubleLastPosHighList,
                lastposLowList: doubleLastPosLowList,
                nextposHighList: doubleNextPosHighList,
                nextposLowList: doubleNextPosLowList,
                posHighList: doublePosHighList,
                posLowList: doublePosLowList,
                sides: doubleSides,
                entityids: doubleEntityids,
                colors: doubleColors,
                linewidths: doubleLinewidths,
                normlen: doublenormlens
            };
        });

        const lastpos = lineData.flatMap(line => line.lastposlist.flatMap(p => p));
        const nextpos = lineData.flatMap(line => line.nextposlist.flatMap(p => p));
        const positions = lineData.flatMap(line => line.poslist.flatMap(p => p));

        const lastHighPos = lineData.flatMap(line => line.lastposHighList.flatMap(p => p));
        const lastLowPos = lineData.flatMap(line => line.lastposLowList.flatMap(p => p));
        const nextHighPos = lineData.flatMap(line => line.nextposHighList.flatMap(p => p));
        const nextLowPos = lineData.flatMap(line => line.nextposLowList.flatMap(p => p));
        const highPos = lineData.flatMap(line => line.posHighList.flatMap(p => p));
        const lowPos = lineData.flatMap(line => line.posLowList.flatMap(p => p));

        const sides = lineData.flatMap(line => line.sides);
        const entityids = lineData.flatMap(line => line.entityids);
        const colors = lineData.flatMap(line => line.colors.flatMap(c => c));
        const linewidths = lineData.flatMap(line => line.linewidths.flatMap(w => w));
        const normlen = lineData.flatMap(line => line.normlen);

        this.vertexCount = positions.length / 3;

        const device = this.tinyearth.gpuinfo!.device;

        const vertexBuffer = createBuffersAndAttributesFromArrays(device, {

            lastpos: { data: lastpos, numComponents: 3 },
            nextpos: { data: nextpos, numComponents: 3 },
            position: { data: positions, numComponents: 3 },
            lastpos_high: { data: lastHighPos, numComponents: 3 },
            lastpos_low: { data: lastLowPos, numComponents: 3 },
            nextpos_high: { data: nextHighPos, numComponents: 3 },
            nextpos_low: { data: nextLowPos, numComponents: 3 },
            position_high: { data: highPos, numComponents: 3 },
            position_low: { data: lowPos, numComponents: 3 },
            side: { data: sides, numComponents: 1 },
            entityid: { data: entityids, numComponents: 1 },
            color: { data: colors, numComponents: 4 },
            linewidth: { data: linewidths, numComponents: 1 },
            normlen: { data: normlen, numComponents: 1 }
        }, {
            interleave: true,
            stepMode: 'vertex',
            shaderLocation: 0,
        });

        if (!this.webgpuProxy.vertexBuffers) {
            this.webgpuProxy.vertexBuffers = {};
        }
        this.webgpuProxy.vertexBuffers.vertex = vertexBuffer;

    }

    initAndFillUniform() {
        if (!this.webgpuProxy) {
            return;
        }

        if (!this.webgpuProxy.uniforms) {
            this.webgpuProxy.uniforms = {};
        }

        if (!this.webgpuProxy.uniforms?.clampToGround) {
            const device = this.tinyearth.gpuinfo!.device!;

            const shaderDef = this.webgpuProxy!.shaderDefinition!;

            const clampToGroundUniformView = makeStructuredView(shaderDef.uniforms.clampToGround!);

            clampToGroundUniformView.set({
                isEnabled: this.clampToGround ? 1 : 0,
                offset: this.clampToGroundOffset
            });

            this.webgpuProxy.uniforms.clampToGround = device.createBuffer({
                label: "PointLayer clampToGroundUniform",
                size: clampToGroundUniformView.arrayBuffer.byteLength,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });

            device.queue.writeBuffer(this.webgpuProxy.uniforms.clampToGround, 0, clampToGroundUniformView.arrayBuffer);
        }
    }

    initWebGPUProxy() {

        const device = this.tinyearth.gpuinfo!.device;

        const source = new WGSLSource(lineStringSource);

        const code = source.resovleSource();

        this.webgpuProxy.shaderDefinition = makeShaderDataDefinitions(code);

        // vertexBuffer
        this.initAndFillVertexBuffer();

        // uniform
        this.initAndFillUniform();

        // bindGroup
        this.webgpuProxy.bindGroupLayouts.scene = this.tinyearth.scene!.bindGroupLayout;
        this.webgpuProxy.bindGroupLayouts.clampToGound = device.createBindGroupLayout({
            label: "PointLayer",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                }
            ]
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [
                this.webgpuProxy.bindGroupLayouts.scene,
                this.webgpuProxy.bindGroupLayouts.clampToGound
            ]
        });

        this.webgpuProxy.module = device.createShaderModule({
            label: "LineStringLayer",
            code
        });

        this.webgpuProxy.pipeline = device.createRenderPipeline({
            label: "LineStringLayer",
            layout: pipelineLayout,
            vertex: {
                module: this.webgpuProxy.module,
                buffers: [
                    ...this.webgpuProxy.vertexBuffers!.vertex!.bufferLayouts
                ],
                constants: {
                    ENABLE_LOG_DEPTH: this.tinyearth.advance.glLogDepth ? 1 : 0
                }
            },
            fragment: {
                module: this.webgpuProxy.module,
                targets: [
                    {
                        format: this.tinyearth.canvasinfo!.context.getConfiguration()!.format
                    }
                ],
                constants: {
                    ENABLE_LOG_DEPTH: this.tinyearth.advance.glLogDepth ? 1 : 0
                }
            },
            primitive: {
                topology: 'triangle-strip',
                cullMode: 'none'
            },
            depthStencil: this.tinyearth.getDepthStencilState()
        });

    }

    // override createProgram(): LineStringProgram {
    //     const program = new LineStringProgram({
    //         tinyearth: this.tinyearth,
    //         advance: {
    //             logDepth: this.tinyearth.advance.glLogDepth ?? false
    //         }
    //     });
    //     program.setFirst(0);
    //     program.setCount(0);
    //     return program;
    // }

    override createAttributes(): void {}

    override fillAttributes(): void {}
    override refreshAttributes(): void {}
    override activateAttributes(): void {}
    override createTextures(): void {}
    override fillTextures(): void {}
    override refreshTextures(): void {}
    override activateTextures(): void {}
    override refreshUniforms(): void {}
    override beforeDraw(): void {}
    override afterDraw(): void {}

    override draw(): void {

        const device = this.tinyearth.gpuinfo!.device;

        const sceneBindGroup = this.tinyearth.scene!.getBindGroup();
        const clampBindGroup = device.createBindGroup({
            layout: this.webgpuProxy.bindGroupLayouts.clampToGound!,
            entries: [
                {
                    binding: 0, resource: { buffer: this.webgpuProxy.uniforms.clampToGround! }
                }
            ]
        });

        const encode = device.createCommandEncoder();

        const pass = encode.beginRenderPass(this.tinyearth.getRenderPassDescriptor(false));

        pass.setPipeline(this.webgpuProxy.pipeline!);
        pass.setBindGroup(0, sceneBindGroup);
        pass.setBindGroup(1, clampBindGroup);
        pass.setVertexBuffer(0, this.webgpuProxy.vertexBuffers.vertex!.buffers[0]);
        pass.draw(this.vertexCount);
        pass.end();

        const commandBuffer = encode.finish();

        device.queue.submit([commandBuffer]);

    }
}