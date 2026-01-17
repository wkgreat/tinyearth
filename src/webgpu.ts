import type { FullArraySpec } from "webgpu-utils";

export interface createGPUInfoOptions {}

export interface GPUInfo {
    gpu: GPU,
    adaptor: GPUAdapter,
    device: GPUDevice
}

export async function createGPUInfo(options: createGPUInfoOptions = {}): Promise<GPUInfo | null> {

    const gpu = navigator.gpu;
    const adaptor = await gpu.requestAdapter();
    if (adaptor === null) {
        return null;
    }
    const device = await adaptor?.requestDevice();
    if (device === null) {
        return null;
    }

    return {
        gpu,
        adaptor,
        device
    };

}

export interface CreateCanvasGPUInfoOptions {
    canvas: string | HTMLCanvasElement,
    config: GPUCanvasConfiguration
};

export interface CanvasGPUInfo {
    canvas: HTMLCanvasElement
    context: GPUCanvasContext
}

export function createCanvasGPUInfo(options: CreateCanvasGPUInfoOptions): CanvasGPUInfo | null {

    let canvas: HTMLCanvasElement | null = null;

    if (typeof options.canvas === 'string') {
        canvas = document.getElementById(options.canvas) as HTMLCanvasElement | null;
    } else {
        canvas = options.canvas;
    }

    if (canvas === null) {
        return null;
    }

    const context = canvas.getContext('webgpu') as GPUCanvasContext | null;

    if (context === null) {
        return null;
    }

    context.configure(options.config);

    return {
        canvas,
        context
    }
}

export class GPUFrameBuffer {
    gpuinfo: GPUInfo;
    canvasinfo: CanvasGPUInfo;
    width: number;
    height: number;
    depthTexture: GPUTexture;

    constructor(gpuinfo: GPUInfo, canvasinfo: CanvasGPUInfo) {
        this.gpuinfo = gpuinfo;
        this.canvasinfo = canvasinfo;
        this.width = canvasinfo.canvas.width;
        this.height = canvasinfo.canvas.height;
        this.depthTexture = GPUFrameBuffer.createDepthTexture(this.gpuinfo, this.width, this.height);
    }

    refresh() {
        this.width = this.canvasinfo.canvas.width;
        this.height = this.canvasinfo.canvas.height;
        this.depthTexture.destroy();
        this.depthTexture = GPUFrameBuffer.createDepthTexture(this.gpuinfo, this.width, this.height);
    }

    static createDepthTexture(gpuinfo: GPUInfo, width: number, height: number): GPUTexture {

        const depthTexture = gpuinfo.device.createTexture({
            label: "depthTexture",
            size: [width, height],
            format: 'depth32float',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST
        });

        return depthTexture;

    }
}
