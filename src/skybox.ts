import { makeShaderDataDefinitions, makeStructuredView, type ShaderDataDefinitions } from "webgpu-utils";
import starsky_nx from "./assets/starsky/nx.png";
import starsky_ny from "./assets/starsky/ny.png";
import starsky_nz from "./assets/starsky/nz.png";
import starsky_px from "./assets/starsky/px.png";
import starsky_py from "./assets/starsky/py.png";
import starsky_pz from "./assets/starsky/pz.png";
import Camera from "./camera.js";
import { VEC3, VEC4, type mat4, type vec3 } from "./matrix";
import { type ProgramOptions } from "./program.js";
import type Projection from "./projection.js";
import Scene from "./scene.js";
import skyboxSource from "./shader/skybox.wgsl";
import type TinyEarth from "./tinyearth";
import type { CanvasGPUInfo, GPUInfo } from "./webgpu";
import { WGSLSource } from "./wgsl";

export interface CubeMapInfo {
    face: string,
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

export interface SkyBoxProgramOptions extends Omit<ProgramOptions, 'vertSource' | 'fragSource'> {
    tinyearth: TinyEarth;
    gpuinfo: GPUInfo;
    canvasinfo: CanvasGPUInfo;
}


interface SkyBoxWebGPU {
    gpuinfo: GPUInfo;
    canvasinfo: CanvasGPUInfo;
    module?: GPUShaderModule;
    shaderDefinition?: ShaderDataDefinitions;
    pipelineLayout?: GPUPipelineLayout;
    pipelines?: {
        commonZ?: GPURenderPipeline;
        reverseZ?: GPURenderPipeline;
    }
    sampler?: GPUSampler;
    bindGroupLayout?: GPUBindGroupLayout;
    vertexBuffer?: GPUBuffer;
    skybox?: GPUTexture;
    skyboxUniform?: GPUBuffer;
}

export class SkyBoxProgram {

    label = "skybox";
    tinyearth: TinyEarth;
    #webgpu: SkyBoxWebGPU;
    images: (HTMLImageElement | null)[] = [];
    #exposure: number = 1.0;
    #contrast: number = 1.0;

    constructor(options: SkyBoxProgramOptions) {

        const source = new WGSLSource(skyboxSource);
        const code = source.resovleSource();

        this.#webgpu = {
            gpuinfo: options.gpuinfo,
            canvasinfo: options.canvasinfo
        }

        const { device } = this.#webgpu.gpuinfo;

        this.#webgpu.shaderDefinition = makeShaderDataDefinitions(code);

        this.#webgpu.module = device.createShaderModule({
            label: this.label,
            code
        });

        this.tinyearth = options.tinyearth;

        const skyboxBindGroupLayout = this.createBindGroupLayout(this.#webgpu.gpuinfo);

        this.#webgpu.pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [
                this.tinyearth.scene!.bindGroupLayout,
                skyboxBindGroupLayout
            ]
        });

        this.#webgpu.sampler = device.createSampler({
            label: this.label,
            minFilter: 'linear',
            magFilter: 'linear',
            mipmapFilter: 'nearest',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
            addressModeW: 'clamp-to-edge',
        });

        this.#createPipelines();

        this.images = Array(6).fill(null);
    }

    #createPipelines() {

        const device = this.#webgpu.gpuinfo.device;

        const tnRenderStatus = this.tinyearth.renderStatus;

        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            label: this.label,
            layout: this.#webgpu.pipelineLayout!,
            vertex: {
                module: this.#webgpu.module!,
                buffers: [
                    {
                        arrayStride: 6 * 4, attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x3' },
                            { shaderLocation: 1, offset: 3 * 4, format: 'float32x3' }]
                    },
                ]
            },
            fragment: {
                module: this.#webgpu.module!,
                targets: [{
                    format: this.#webgpu.canvasinfo.context.getConfiguration()!.format,
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
                }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
                frontFace: 'ccw'
            },
            depthStencil: {
                format: tnRenderStatus.depthFormat,
                depthWriteEnabled: true,
                depthCompare: 'less-equal'
            }
        }

        if (!this.#webgpu.pipelines) {
            this.#webgpu.pipelines = {};
        }

        this.#webgpu.pipelines.commonZ = device.createRenderPipeline(pipelineDescriptor);

        pipelineDescriptor.depthStencil!.depthCompare = 'greater-equal';

        this.#webgpu.pipelines.reverseZ = device.createRenderPipeline(pipelineDescriptor);

    }

    get exposure(): number {
        return this.#exposure;
    }

    set exposure(v) {
        this.#exposure = v;
    }

    get contrast(): number {
        return this.#contrast;
    }

    set contrast(v) {
        this.#contrast = v;
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
        // [x,y,z,dx,dy,dz]
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

    /**
     * @typedef CubeMapInfo
     * @property {number} face
     * @property {string} src
    */

    setCubeMap(info: CubeMapInfo[]) {

        this.images = Array(6).fill(null);
        const that = this;

        info.forEach((face, idx) => {
            const img = new Image();
            img.src = face.src;
            img.onload = function () {
                that.images[idx] = img;
                console.log(img.width, img.height);
            }
        });
    }

    createBindGroupLayout(gpuinfo: GPUInfo): GPUBindGroupLayout {
        const { device } = gpuinfo;
        return device.createBindGroupLayout({
            label: "skyboxBindGroupLayout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        viewDimension: 'cube',
                        sampleType: 'float',
                        multisampled: false,
                    },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: 'filtering',
                    },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
            ]
        });
    }

    get bindGroupLayout(): GPUBindGroupLayout {

        if (!this.#webgpu.bindGroupLayout) {
            this.#webgpu.bindGroupLayout = this.createBindGroupLayout(this.#webgpu.gpuinfo)
        }
        return this.#webgpu.bindGroupLayout;
    }

    setSkyBoxTexture(): GPUTexture | null {

        if (!this.#webgpu.skybox) {
            if (this.images.some(image => image === null)) {
                return null;
            }
            const { device } = this.#webgpu.gpuinfo;
            const aImage = this.images[0]!;
            const texture = this.#webgpu.gpuinfo.device.createTexture({
                label: 'skybox',
                format: 'rgba8unorm',
                size: [aImage.width, aImage.height, this.images.length],
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT

            });
            this.images.forEach((image, layer) => {
                device.queue.copyExternalImageToTexture(
                    { source: image!, flipY: false },
                    { texture, origin: [0, 0, layer] },
                    { width: image!.width, height: image!.height }
                );
            })
            this.#webgpu.skybox = texture;
        }
        return this.#webgpu.skybox!;

    }

    setVertexBuffer(): GPUBuffer | null | undefined {

        const vertices = this.createVetexData(this.tinyearth.scene!);

        if (!this.#webgpu.vertexBuffer) {

            this.#webgpu.vertexBuffer = this.#webgpu.gpuinfo.device.createBuffer({
                label: this.label,
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
        }
        this.#webgpu.gpuinfo.device.queue.writeBuffer(
            this.#webgpu.vertexBuffer,
            0,
            vertices.buffer
        );
        return this.#webgpu.vertexBuffer;

    }

    setSkyBoxUniform() {

        const uniformView = makeStructuredView(this.#webgpu.shaderDefinition!.uniforms.skyboxUniforms!);

        const { device } = this.#webgpu.gpuinfo;

        if (!this.#webgpu.skyboxUniform) {
            this.#webgpu.skyboxUniform = device.createBuffer({
                label: "skyboxUniform",
                size: uniformView.arrayBuffer.byteLength,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
        }

        uniformView.set({
            exposure: this.exposure,
            contrast: this.contrast
        });

        device.queue.writeBuffer(this.#webgpu.skyboxUniform, 0, uniformView.arrayBuffer);

        return this.#webgpu.skyboxUniform;

    }

    draw(): void {
        this.render();
    }

    render() {

        if (this.setVertexBuffer() && this.setSkyBoxTexture() && this.setSkyBoxUniform()) {

            const { device } = this.#webgpu.gpuinfo;

            const status = this.tinyearth.renderStatus;

            const pass = status.currentPass;

            if (!pass) {
                return;
            }

            let pipeline;
            if (status.reverseZ) {
                pipeline = this.#webgpu.pipelines!.reverseZ!;
            } else {
                pipeline = this.#webgpu.pipelines!.commonZ!;
            }

            const sceneBindGroup = this.tinyearth.scene!.getBindGroup();
            const skyboxBindGroup = device.createBindGroup({
                label: 'skyboxBindGroup',
                layout: pipeline.getBindGroupLayout(1),
                entries: [
                    {
                        binding: 0, resource: this.#webgpu.skybox!.createView({
                            dimension: 'cube'
                        })
                    },
                    { binding: 1, resource: this.#webgpu.sampler! },
                    { binding: 2, resource: { buffer: this.#webgpu.skyboxUniform! } }
                ]
            });

            const decoder = device.createCommandEncoder({
                label: "skybox"
            });


            pass.setPipeline(pipeline);
            pass.setBindGroup(0, sceneBindGroup);
            pass.setBindGroup(1, skyboxBindGroup);
            pass.setVertexBuffer(0, this.#webgpu.vertexBuffer);
            pass.draw(6);

        }
    }

}