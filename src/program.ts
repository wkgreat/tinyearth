import type TinyEarth from "./tinyearth";

export interface ProgramAdvanceOptions {
    depthTest?: boolean
    wireframe?: boolean
    logDepth?: boolean
}

export interface ProgramOptions {
    tinyearth: TinyEarth
    advance?: ProgramAdvanceOptions
}

type ReverseZChoice = 'reverseZ:off' | 'reverseZ:on';
type WireFrameChoice = 'wireframe:off' | 'wireframe:on';

export default class Program {

    static pipelineChoiceKey(reverseZ: boolean, wireframe: boolean): string {
        const reverseZkey: ReverseZChoice = reverseZ ? 'reverseZ:on' : 'reverseZ:off';
        // const wireframeKey: WireFrameChoice = wireframe ? 'wireframe:on' : 'wireframe:off';
        // const key = `${reverseZkey}-${wireframeKey}`

        const key = `${reverseZkey}`
        return key;
    }

    static createPipeline(device: GPUDevice, reverseZ: boolean, wireframe: boolean, descriptor: GPURenderPipelineDescriptor): { key: string, pipeline: GPURenderPipeline } {

        if (reverseZ) {
            descriptor.depthStencil!.depthCompare = 'greater-equal'
        }

        // if (wireframe) {
        //     descriptor.primitive!.topology = 'line-strip';
        // }

        const key = this.pipelineChoiceKey(reverseZ, wireframe);

        const pipeline = device.createRenderPipeline(descriptor);

        return {
            key,
            pipeline
        }
    }

}