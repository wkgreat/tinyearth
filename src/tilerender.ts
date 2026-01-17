import Camera from "./camera.js";
import type { NumArr3 } from "./defines.js";
import { TinyEarthEvent } from "./event.js";
import Frustum from "./frustum.js";
import { Tile, TileStatus } from "./maptiler.js";
import { type ProgramAdvanceOptions, type ProgramOptions } from "./program.js";
import SRS from "./proj.js";
import type Scene from "./scene.js";


import { MAT4, VEC2, VEC3, VEC4, type mat4, type vec2, type vec3, type vec4 } from "./matrix.js";
import { type TileSourceInfo, type TileURL } from "./tilesource.js";
import TinyEarth from "./tinyearth.js";

import { makeShaderDataDefinitions, makeStructuredView, type ShaderDataDefinitions } from "webgpu-utils";
import { dfloat, dfmat4, dfvec2, dfvec3, dfvec4 } from "./math.js";
import tileWGSLSrouce from './shader/tile.wgsl';
import type { CanvasGPUInfo, GPUInfo } from "./webgpu.js";
import { WGSLSource } from "./wgsl.js";

const DefaultTileSize: number = 256;

export interface GlobeTilePorgramAdvanceOptions extends ProgramAdvanceOptions {
}

interface GlobeTileProgramOptions extends Omit<ProgramOptions, 'vertSource' | 'fragSource'> {
    tinyearth: TinyEarth;
    gpuinfo: GPUInfo;
    canvasinfo: CanvasGPUInfo;
    advance: GlobeTilePorgramAdvanceOptions;
}

export class GlobeTileProgram {

    tinyearth: TinyEarth;

    numElements: number = 0;

    tileProviders: TileProvider[] = [];

    advance: GlobeTilePorgramAdvanceOptions = {
        depthTest: false,
        wireframe: false
    }

    gpuinfo: GPUInfo;
    canvasinfo: CanvasGPUInfo;
    label = "tilerender";
    module: GPUShaderModule | null = null;
    pipeline: GPURenderPipeline | null = null;
    pipelineReverseZ: GPURenderPipeline | null = null;
    sampler: GPUSampler;
    shaderDefinitions: ShaderDataDefinitions;
    tileUniform: GPUBuffer | null = null;
    materialUniform: GPUBuffer | null = null;

    constructor(options: GlobeTileProgramOptions) {
        this.tinyearth = options.tinyearth;
        const advance = options.advance ?? {};
        const depthTest = advance.depthTest ?? false;
        const wireframe = advance.wireframe ?? false;

        this.advance.depthTest = depthTest;
        this.advance.wireframe = wireframe;

        this.gpuinfo = options.gpuinfo;
        this.canvasinfo = options.canvasinfo;
        const { device } = this.gpuinfo;
        const wgslsource = new WGSLSource(tileWGSLSrouce);
        const code = wgslsource.resovleSource();
        this.shaderDefinitions = makeShaderDataDefinitions(code);

        this.module = device.createShaderModule({
            label: this.label,
            code
        });

        const sceneBindGroupLayout = this.tinyearth.scene!.bindGroupLayout;
        const ctgBindGroupLayout = device.createBindGroupLayout({
            label: "ctgBindGroupLayout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: 'float',
                        viewDimension: '2d',
                        multisampled: false
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: 'filtering'
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform'
                    }
                }
            ]
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [
                sceneBindGroupLayout,
                ctgBindGroupLayout
            ]
        });

        const descriptor: GPURenderPipelineDescriptor = {
            label: this.label,
            layout: pipelineLayout,
            vertex: {
                module: this.module,
                buffers: [
                    { arrayStride: 3 * 4, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
                    { arrayStride: 3 * 4, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] },
                    { arrayStride: 3 * 4, attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x3' }] },
                    { arrayStride: 2 * 4, attributes: [{ shaderLocation: 3, offset: 0, format: 'float32x2' }] },
                    { arrayStride: 3 * 4, attributes: [{ shaderLocation: 4, offset: 0, format: 'float32x3' }] },
                    { arrayStride: 3 * 4, attributes: [{ shaderLocation: 5, offset: 0, format: 'float32x3' }] },
                    { arrayStride: 3 * 4, attributes: [{ shaderLocation: 6, offset: 0, format: 'float32x3' }] },
                ],
                constants: {
                    ENABLE_LOG_DEPTH: this.tinyearth.advance.logdepth ? 1 : 0
                }
            },
            fragment: {
                module: this.module,
                targets: [{
                    format: this.canvasinfo.context.getConfiguration()!.format,
                    blend: {
                        color: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                            operation: "add",
                        },
                        alpha: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                            operation: "add",
                        },
                    },
                    writeMask: GPUColorWrite.ALL
                }],
                constants: {
                    ENABLE_LOG_DEPTH: this.tinyearth.advance.logdepth ? 1 : 0
                }
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
                frontFace: 'ccw'
            },
            depthStencil: {
                format: this.tinyearth.renderStatus.depthFormat,
                depthWriteEnabled: this.tinyearth.renderStatus.depthWriteEnabled,
                depthCompare: 'less-equal'
            }
        }

        this.pipeline = device.createRenderPipeline(descriptor);

        descriptor.depthStencil!.depthCompare = 'greater-equal';

        this.pipelineReverseZ = device.createRenderPipeline(descriptor);

        this.sampler = device.createSampler({
            label: this.label,
            magFilter: 'nearest',
            minFilter: 'nearest'
        });

    }

    existTileProvider(tileProvider: TileProvider): boolean {
        return this.tileProviders.filter(p => p === tileProvider).length > 0;
    }

    addTileProvider(tileProvider: TileProvider) {
        this.tileProviders.push(tileProvider);
    }

    removeTileProvider(tileProvider: TileProvider) {
        this.tileProviders = this.tileProviders.filter(p => p !== tileProvider);
    }

    setTileNodeVertexBuffers(node: TileNode): void {

        const { device } = this.gpuinfo;

        const data = node.tile.mesh!;
        const positionArray = []; //3
        const texcoordArray = []; //2
        const normalArray = []; //3

        for (let i = 0; i < data.length; i += 8) {
            positionArray.push(...data.slice(i, i + 3));
            texcoordArray.push(...data.slice(i + 3, i + 3 + 2));
            normalArray.push(...data.slice(i + 3 + 2, i + 3 + 2 + 3));
        }

        const positions = new Float32Array(positionArray);
        const texcoords = new Float32Array(texcoordArray);
        const normals = new Float32Array(normalArray);

        if (!node.positionBuffer) {
            node.positionBuffer = device.createBuffer({
                label: `${this.label}, positionBuffer`,
                size: positions.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(node.positionBuffer, 0, positions.buffer);
        }

        const dfpositions = positionArray.map(d => dfloat.create(d));
        const positions_high = new Float32Array(dfpositions.map(d => d[0]));
        const positions_low = new Float32Array(dfpositions.map(d => d[1]));

        if (!node.positionHighBuffer) {
            node.positionHighBuffer = device.createBuffer({
                label: `${this.label}, positionHighBuffer`,
                size: positions_high.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(node.positionHighBuffer, 0, positions_high.buffer);
        }


        if (!node.positionLowBuffer) {
            node.positionLowBuffer = device.createBuffer({
                label: `${this.label}, positionLowBuffer`,
                size: positions_low.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(node.positionLowBuffer, 0, positions_low.buffer);
        }


        if (!node.texoordBuffer) {
            node.texoordBuffer = device.createBuffer({
                label: `${this.label}, texcoordBuffer`,
                size: texcoords.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(node.texoordBuffer, 0, texcoords.buffer);
        }


        if (!node.normalBuffer) {
            node.normalBuffer = device.createBuffer({
                label: `${this.label}, normalBuffer`,
                size: normals.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(node.normalBuffer, 0, normals.buffer);
        }

        const dfnormas = normalArray.map(n => dfloat.create(n));
        const normals_high = new Float32Array(dfnormas.map(d => d[0]));
        const normals_low = new Float32Array(dfnormas.map(d => d[1]));

        if (!node.normalHighBuffer) {
            node.normalHighBuffer = device.createBuffer({
                label: `${this.label}, normalHighBuffer`,
                size: normals_high.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(node.normalHighBuffer, 0, normals_high.buffer);
        }


        if (!node.normalLowBuffer) {
            node.normalLowBuffer = device.createBuffer({
                label: `${this.label}, normalLowBuffer`,
                size: normals_low.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            device.queue.writeBuffer(node.normalLowBuffer, 0, normals_low.buffer);
        }
    }

    setTileNodeTexture(node: TileNode) {

        if (!node.texture) {
            const image = node.tile.image;
            if (image) {
                const { device } = this.gpuinfo;
                node.texture = device.createTexture({
                    label: this.label,
                    format: 'rgba8unorm',
                    size: [image.width, image.height, 1],
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST
                });
                device.queue.copyExternalImageToTexture(
                    { source: image, flipY: true },
                    { texture: node.texture },
                    [image.width, image.height]
                );
            }
        }

    }

    setTileUniform(opacity: number = 1.0, enableNight: boolean = false, isNight: boolean = false) {

        const tileUniView = makeStructuredView(this.shaderDefinitions.uniforms.tileUniform!);

        if (!this.tileUniform) {
            this.tileUniform = this.gpuinfo.device.createBuffer({
                label: `${this.label}, tileUniform`,
                size: tileUniView.arrayBuffer.byteLength,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
        }

        tileUniView.set({
            opacity: opacity,
            enableNight: enableNight ? 1 : 0,
            isNight: isNight ? 1 : 0
        });

        this.gpuinfo.device.queue.writeBuffer(this.tileUniform, 0, tileUniView.arrayBuffer);


    }

    /**
     * @param {TileNode} node
     * @param {mat4} modelMtx
     * @param {Camera} camera
     * @param {mat4} projMtx       
    */
    drawTileNode(pass: GPURenderPassEncoder, node: TileNode, opacity: number = 1.0, isNight: boolean = false) {

        if (node.tile && node.tile.ready) {

            this.setTileNodeVertexBuffers(node);
            this.setTileNodeTexture(node);
            this.setTileUniform(opacity, this.tinyearth.night, isNight);
            // this.setMaterialUniform();

            const sceneBindGroup = this.gpuinfo.device.createBindGroup({
                label: `${this.label} sceneBindGroup`,
                layout: this.pipeline!.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: { buffer: this.tinyearth.scene!.webgpuResources.sceneUniform! } },
                    { binding: 1, resource: { buffer: this.tinyearth.scene!.webgpuResources.sceneDFUniform! } }
                ]
            });

            const tileBindGroup = this.gpuinfo.device.createBindGroup({
                label: `${this.label} tileBindGroup`,
                layout: this.pipeline!.getBindGroupLayout(1),
                entries: [
                    { binding: 0, resource: node.texture! },
                    { binding: 1, resource: this.sampler },
                    { binding: 2, resource: { buffer: this.tileUniform! } },
                    // { binding: 3, resource: { buffer: this.materialUniform! } }
                ]
            })

            pass.setBindGroup(0, sceneBindGroup);
            pass.setBindGroup(1, tileBindGroup);
            pass.setVertexBuffer(0, node.positionBuffer);
            pass.setVertexBuffer(1, node.positionHighBuffer);
            pass.setVertexBuffer(2, node.positionLowBuffer);
            pass.setVertexBuffer(3, node.texoordBuffer);
            pass.setVertexBuffer(4, node.normalBuffer);
            pass.setVertexBuffer(5, node.normalHighBuffer);
            pass.setVertexBuffer(6, node.normalLowBuffer);
            pass.draw(node.tile.mesh!.length / 8);
        }
    }

    draw(): void {
        this.render();
    }

    render() {
        if (this.gpuinfo) {

            const that = this;
            const pass = this.tinyearth.renderStatus.currentPass;
            if (!pass) {
                return;
            }

            const status = this.tinyearth.renderStatus;

            if (status.reverseZ) {
                pass.setPipeline(this.pipelineReverseZ!);
            } else {
                pass.setPipeline(this.pipeline!);
            }

            for (let provider of this.tileProviders) {
                if (provider.isStop()) {
                    continue;
                }
                if (provider.night && !this.tinyearth.night) {
                    continue;
                }

                provider.frustum = this.tinyearth.scene!.frustum;
                const level = provider.source.maxLevel;

                let nodes = provider.tiletree.dynamicLevelProvide(level, this.tinyearth.scene!, (node) => {});
                nodes = nodes.filter(node => node.tile && node.tile.ready);
                nodes.sort((a, b) => a.key.z - b.key.z);

                let i = 0;
                for (let node of nodes) {
                    that.drawTileNode(pass, node, provider.getOpacity(), provider.night);
                    i++;
                }
            }
        }
    }

    setFrustum(frustum: Frustum) {
        for (let provider of this.tileProviders) {
            provider.setFrustum(frustum);
        }
    }
}

interface TileNodeKey {
    x: number
    y: number
    z: number
}

export class TileNode {

    #key: TileNodeKey;

    #tile: Tile;

    positionBuffer: GPUBuffer | null = null;
    positionHighBuffer: GPUBuffer | null = null;
    positionLowBuffer: GPUBuffer | null = null;
    texoordBuffer: GPUBuffer | null = null;
    normalBuffer: GPUBuffer | null = null;
    normalHighBuffer: GPUBuffer | null = null;
    normalLowBuffer: GPUBuffer | null = null;

    #texture: GPUTexture | null = null;

    #children: TileNode[] = [];

    constructor(url: TileURL, z: number, x: number, y: number) {
        this.#key = { z, x, y };
        this.#tile = new Tile(url, x, y, z);
        this.#children = [];
    }

    get key(): TileNodeKey {
        return { ...this.#key };
    }

    get tile(): Tile {
        return this.#tile;
    }

    set tile(tile: Tile) {
        this.#tile = tile;
        // TODO need refresh texture.
    }

    set texture(t: GPUTexture | null) {
        this.#texture = t;
    }

    get texture(): GPUTexture | null {
        return this.#texture;
    }

    get children(): TileNode[] {
        return this.#children;
    }

    get ready(): boolean {
        return this.#tile?.ready ?? false;
    }
}

type TileNodeCallback = (node: TileNode) => void;

enum TileNodeOmitStatus {
    OMIT = "OMIT"
}

type TileNodeStatus = TileStatus | TileNodeOmitStatus;

/**
 * Tile Tree
*/
export class TileTree {

    //TODO or directly use Map<key,node> for tile tree instead?

    root: TileNode;
    source: TileSourceInfo;
    #startRecLevel: number = 2;
    frustum: Frustum | null = null;

    provideCount: number = 0;

    constructor(source: TileSourceInfo) {
        this.source = source;
        this.root = new TileNode(this.source.url, 0, 0, 0);
    }

    addTile(tile: Tile): TileNode | null {
        const node = this.#addTileRec(this.root, tile);
        return node;
    }

    #addTileRec(curNode: TileNode, tile: Tile): TileNode | null {
        if (tile.z === curNode.key.z) {
            if (tile.x === curNode.key.x && tile.y === curNode.key.y) {
                curNode.tile = tile;
                return curNode;
            } else {
                return null;
            }
        } else if (curNode.key.z < tile.z) {

            const dz = tile.z - curNode.key.z;
            const px = tile.x >> dz;
            const py = tile.y >> dz;

            if (px !== curNode.key.x || py !== curNode.key.y) {
                return null;
            }

            if (curNode.children.length === 0) {

                const cz = curNode.key.z;
                const cx = curNode.key.x;
                const cy = curNode.key.y;

                curNode.children.push(new TileNode(this.source.url, cz + 1, cx << 1, cy << 1));
                curNode.children.push(new TileNode(this.source.url, cz + 1, cx << 1 | 1, cy << 1));
                curNode.children.push(new TileNode(this.source.url, cz + 1, cx << 1, cy << 1 | 1));
                curNode.children.push(new TileNode(this.source.url, cz + 1, cx << 1 | 1, cy << 1 | 1));

            }

            let r: TileNode | null = null;

            for (let node of curNode.children) {
                const thenode = this.#addTileRec(node, tile);
                if (thenode !== null) {
                    r = thenode;
                }
            }

            return r;

        } else {
            console.error("should not be here.");
            return null;
        }
    }

    forEachNode(callback: TileNodeCallback) {
        this.#forEachNode(this.root, callback);
    }

    #forEachNode(curNode: TileNode, callback: TileNodeCallback) {
        if (curNode) {
            callback(curNode);
        }
        for (let node of curNode.children) {
            this.#forEachNode(node, callback);
        }
    }

    getTileNode(z: number, x: number, y: number): TileNode | null {

        return this.#getTileNodeRec(this.root, z, x, y);

    }

    #getTileNodeRec(curnode: TileNode | null, z: number, x: number, y: number): TileNode | null {
        if (curnode == null) {
            return null;
        } else if (curnode.key.z > z) {
            return null;
        } else if (curnode.key.z === z) {
            if (curnode.key.x === x && curnode.key.y === y) {
                return curnode;
            } else {
                return null;
            }
        } else {
            const px = x >> (z - curnode.key.z);
            const py = y >> (z - curnode.key.z);
            if (curnode.key.x !== px || curnode.key.y !== py) {
                return null;
            } else {
                const children = curnode.children;
                if (!children) {
                    return null;
                }
                let c0 = this.#getTileNodeRec(children[0]!, z, x, y);
                if (c0 !== null) {
                    return c0;
                }
                let c1 = this.#getTileNodeRec(children[1]!, z, x, y);
                if (c1 !== null) {
                    return c1;
                }
                let c2 = this.#getTileNodeRec(children[2]!, z, x, y);
                if (c2 !== null) {
                    return c2;
                }
                let c3 = this.#getTileNodeRec(children[3]!, z, x, y);
                if (c3 !== null) {
                    return c3;
                }
                return null;
            }
        }
    }

    fixedLevelProvide(level: number, frustum: Frustum, callback: TileNodeCallback) {
        this.provideCount = 0;
        this.#fixedLevelProvideRec(this.root, level, frustum, callback);
    }

    #fixedLevelProvideRec(node: TileNode, level: number, frustum: Frustum, callback: TileNodeCallback): TileNodeStatus {


        if (node.key.z > level) {
            return TileNodeOmitStatus.OMIT;
        }

        if (node.key.z > this.#startRecLevel && (!node.tile.intersectFrustum(frustum)) || (node.key.z > this.#startRecLevel && node.tile.tileIsBack(frustum))) {
            return TileNodeOmitStatus.OMIT;
        }

        let status: TileNodeStatus = TileNodeOmitStatus.OMIT;

        if (node.key.z === level) {

            status = node.tile.load();
            if (status === TileStatus.READY) {
                this.provideCount++;
                callback(node);
            }

        } else if (node.key.z < level) {

            if (node.children.length === 0) {
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1, node.key.y << 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1 | 1, node.key.y << 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1, node.key.y << 1 | 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1 | 1, node.key.y << 1 | 1));
            }

            const childrenStatus = node.children.map(child => this.#fixedLevelProvideRec(child, level, frustum, callback));

            if (this.#needInternalNodeRender(childrenStatus)) {
                status = node.tile.load();
                if (status === TileStatus.READY) {
                    this.provideCount++;
                    callback(node);
                }
            } else {
                status = TileStatus.READY;
            }
        }

        return status;
    }


    #vec4_dist2d(v0: vec4, v1: vec4): number {

        return Math.sqrt(Math.pow(v1[0] - v0[0], 2) + Math.pow(v1[1] - v0[1], 2));

    }

    getTileResolution(scene: Scene, tile: Tile): number {

        const corners = tile.getTileCorner();
        const m = scene.worldToScreenMatrix;

        let p0 = VEC3.force4(corners[0]); // lowerleft
        let p1 = VEC3.force4(corners[1]); // upperleft
        let p2 = VEC3.force4(corners[2]); // upperright
        let p3 = VEC3.force4(corners[3]); // lowerright

        p0 = VEC4.affine(p0, m);
        p1 = VEC4.affine(p1, m);
        p2 = VEC4.affine(p2, m);
        p3 = VEC4.affine(p3, m);

        const r0 = this.#vec4_dist2d(p0, p1) / DefaultTileSize;
        const r1 = this.#vec4_dist2d(p1, p2) / DefaultTileSize;
        const r2 = this.#vec4_dist2d(p2, p3) / DefaultTileSize;
        const r3 = this.#vec4_dist2d(p3, p0) / DefaultTileSize;

        const mr = Math.max(Math.max(Math.max(r0, r1), r2), r3);

        return mr;
    }

    #pointOnTile(p: vec3, tile: Tile): boolean {

        const [xmin, ymin, xmax, ymax] = tile.extent(); //xmin, ymin, xmax, ymax
        const p4326 = SRS.transform(SRS.ECEF, SRS.WGS84, [p[0], p[1], p[2]]) as NumArr3;
        const p3857 = SRS.transform(SRS.WGS84, SRS.WEB, [p4326[0], p4326[1], p4326[2]]) as NumArr3;

        if (p3857[0] >= xmin && p3857[0] <= xmax && p3857[1] >= ymin && p3857[2] <= ymax) {
            return true;
        } else {
            return false;
        }

    }

    dynamicLevelProvide(level: number, scene: Scene, callback: TileNodeCallback): TileNode[] {
        this.provideCount = 0;
        const nodes: TileNode[] = [];
        this.#dynamicLevelProvideRec(this.root, level, scene, nodes, callback);
        return nodes;
    }

    #dynamicLevelProvideRec(node: TileNode, level: number, scene: Scene, nodes: TileNode[], callback: TileNodeCallback): TileNodeStatus {

        if (node.key.z > level) {
            return TileNodeOmitStatus.OMIT;
        }

        if (node.key.z > this.#startRecLevel) {
            if (!node.tile.intersectFrustum(scene.frustum)) {
                return TileNodeOmitStatus.OMIT;
            }

            const cameraDeviate = scene.camera.getCameraDeviate();

            if (cameraDeviate > 0.5 && node.tile.tileIsBack(scene.frustum)) {
                return TileNodeOmitStatus.OMIT;
            }

        }

        let status: TileNodeStatus = TileNodeOmitStatus.OMIT;

        const tileRes = this.getTileResolution(scene, node.tile);

        if ((node.key.z > 3 && tileRes <= 1.0) || node.key.z === level) {

            status = node.tile.load();
            if (status === TileStatus.READY) {
                this.provideCount++;
                nodes.push(node);
                callback(node);
            }

        } else if (node.key.z < level) {

            if (node.children.length === 0) {
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1, node.key.y << 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1 | 1, node.key.y << 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1, node.key.y << 1 | 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1 | 1, node.key.y << 1 | 1));
            }

            const childrenStatus = node.children.map(child => this.#dynamicLevelProvideRec(child, level, scene, nodes, callback));

            if (this.#needInternalNodeRender(childrenStatus)) {
                status = node.tile.load();
                if (status === TileStatus.READY) {
                    this.provideCount++;
                    nodes.push(node);
                    callback(node);
                }
            } else {
                status = TileStatus.READY;
            }
        }

        return status;
    }

    // NEW LAOADING FAILED DEAD [READY OMIT]
    #needInternalNodeRender(status: TileNodeStatus[]): boolean {
        return !status.every(s => s === TileStatus.READY || s === TileNodeOmitStatus.OMIT);
    }

    vaccum() {
        //TODO 定期清理不用的tile
    }

}

type TileProviderCameraCallback = (info: { camera: Camera; type?: string }) => void


export class TileProvider {

    tinyearth: TinyEarth;

    source: TileSourceInfo;

    #curlevel: number = 0;

    tiletree: TileTree;

    #stop: boolean = false;

    frustum: Frustum | null = null;

    modelmtx: mat4 = MAT4.create();

    #cameraCallback: TileProviderCameraCallback = (info) => {
        if (info.camera === null || info.camera !== this.tinyearth.scene!.camera) {
            return;
        }
        const level = this.tileLevelWithCamera(info.camera);
        this.#curlevel = level;
    };

    opacity: number = 1.0;

    constructor(source: TileSourceInfo, tinyearth: TinyEarth) {
        this.tinyearth = tinyearth;
        this.source = source;
        this.tiletree = new TileTree(source);
        this.#cameraCallback({ camera: this.tinyearth.scene!.camera });
        this.tinyearth.eventBus.addEventListener(TinyEarthEvent.CAMERA_CHANGE, {
            callback: this.#cameraCallback
        });
    }

    get night(): boolean {
        return this.source.night ?? false;
    }

    set night(b: boolean | undefined | null) {
        this.source.night = b ?? false;

    }

    changeTileSource(source: TileSourceInfo) {
        this.source = source;
        const that = this;
        if (this.tiletree) {
            this.tiletree.forEachNode(node => {
                node.tile = new Tile(source.url, node.key.x, node.key.y, node.key.z);
                if (node.texture) {
                    node.texture.destroy();
                    node.texture = null;
                }
                //TODO destroy other vertex buffers
                // if (node.vertexBuffer) {
                //     node.vertexBuffer.destroy();
                //     node.vertexBuffer = null;
                // }
            });
        }
        this.curlevel = this.tileLevel();
        this.tiletree = new TileTree(source);
    }

    setFrustum(frustum: Frustum) {
        this.frustum = frustum;
    }

    setOpacity(opacity: number) {
        this.opacity = opacity;
    }

    getOpacity(): number {
        return this.opacity;
    }

    stop() {
        this.#stop = true;
    }

    start() {
        this.#stop = false;
    }

    isStop(): boolean {
        return this.#stop;
    }

    get curlevel() {
        return this.#curlevel;
    }

    set curlevel(level) {
        this.#curlevel = level;
    }

    tileLevel() {
        const camera = this.tinyearth.scene!.camera;
        if (camera) {
            return this.tileLevelWithCamera(camera);
        } else {
            return this.source.minLevel;
        }
    }

    tileLevelWithCamera(camera: Camera) {
        const tileSize = 256;
        const from = camera.from
        let pos: NumArr3 = SRS.transform(SRS.ECEF, SRS.WGS84, [from[0], from[1], from[2]]);
        let height = pos[2];
        const initialResolution = 2 * Math.PI * SRS.SPHERIOD_WGS84.a / tileSize;
        const groundResolution = height * 2 / tileSize;
        const zoom = Math.log2(initialResolution / groundResolution) + 1;
        return Math.min(Math.max(Math.ceil(zoom), this.source.minLevel), this.source.maxLevel);
    }

}

