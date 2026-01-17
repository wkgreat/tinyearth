import type { ColorLike } from "./color.js";
import Color from "./color.js";
import EventBus, { TinyEarthEvent } from "./event.js";
import Scene, { type SceneOptions } from "./scene.js";
import { defaultSkyBoxSourceInfo, SkyBoxProgram, type SkyBoxSourceInfo } from "./skybox.js";
import { GlobeTileProgram, TileProvider } from "./tilerender.js";
import { TileResources, type TileSourceInfo } from "./tilesource.js";
import Timer from "./timer.js";
import CameraMouseControlTool from "./tools/camera_mouse_control.js";
import type BaseTool from "./tools/tool.js";
import { createCanvasGPUInfo, createGPUInfo, GPUFrameBuffer, type CanvasGPUInfo, type GPUInfo } from "./webgpu.js";

export interface TinyEarthAdvanceOptions {
    debug?: boolean,
    logdepth?: boolean,
    wireframe?: boolean,
    reverseZ?: boolean | 'auto'
}

export interface TinyEarthOptions {
    canvas: HTMLCanvasElement | string;
    scene?: Omit<SceneOptions, "viewport" | "tinyearth">
    night?: boolean
    skybox?: boolean
    bgcolor?: ColorLike,
    advance?: TinyEarthAdvanceOptions
}

interface TinyEarthWebGPUResources {
    framebuffer?: GPUFrameBuffer
}

interface TinyEarthRenderStatus {
    depthFormat: GPUTextureFormat
    depthWriteEnabled: boolean
    reverseZ: boolean
    depthFunc: GPUCompareFunction
    clearDepth: number
    currentPass?: GPURenderPassEncoder
}

export default class TinyEarth {

    canvas: HTMLCanvasElement;

    gpuinfo: GPUInfo | null = null;

    canvasinfo: CanvasGPUInfo | null = null;

    scene: Scene | null = null;

    timer: Timer;

    viewWidth = 512;

    viewHeight = 512;

    eventBus: EventBus;

    globeTilePorgram: GlobeTileProgram | null = null;

    skyboxProgram: SkyBoxProgram | null = null;

    #startDrawFrame: boolean = true;

    #defaultTileProvider: TileProvider | null = null;

    night: boolean = false

    skybox: boolean = true

    bgcolor: Color = new Color(0, 0, 0, 1);

    #tools: BaseTool[] = [];

    #advance: TinyEarthAdvanceOptions = {
        debug: false,
        logdepth: false,
        wireframe: false,
        reverseZ: false
    }

    #renderStatus: TinyEarthRenderStatus;

    #webgpuResources: TinyEarthWebGPUResources = {};

    // screen quad
    // #fullScreenQuad: ScreenQuad;

    // #screenQuadProgram: ScreenQuadProgram;

    #isReady: boolean = false;
    #readyTaskQueue: (() => void)[] = [];

    constructor(options: TinyEarthOptions) {

        //advance options
        const advance = options.advance ?? {};
        if (advance.debug !== undefined) {
            this.#advance.debug = advance.debug;
        }
        if (advance.logdepth !== undefined) {
            this.#advance.logdepth = advance.logdepth;
        }
        if (advance.wireframe !== undefined) {
            this.#advance.wireframe = advance.wireframe;
        }
        if (advance.reverseZ !== undefined) {
            this.#advance.reverseZ = advance.reverseZ;
        }

        // basic
        this.eventBus = new EventBus();
        this.timer = new Timer(Date.now());
        this.timer.setEventBus(this.eventBus);

        let _canvas: HTMLCanvasElement | null = null;

        if (options.canvas instanceof HTMLCanvasElement) {
            _canvas = options.canvas;
        } else if (typeof options.canvas === 'string') {
            const elem = document.getElementById(options.canvas);
            if (elem instanceof HTMLCanvasElement) {
                _canvas = elem;
            } else {
                throw new Error("the input canvas is not HTMLCanvasElement!");
            }
        } else {
            throw new Error("the input canvas is not HTMLCanvasElement!");
        }

        if (_canvas === null) {
            throw new Error("canvas is null");
        }

        this.canvas = _canvas;

        //renderStatus
        this.#renderStatus = {
            depthFormat: 'depth32float',
            depthWriteEnabled: true,
            reverseZ: true,
            depthFunc: 'greater-equal',
            clearDepth: 0.0
        }

        createGPUInfo().then(info => {
            this.gpuinfo = info;
            if (this.gpuinfo === null) {
                throw new Error("gpuinfo is null");
            }
            this.canvasinfo = createCanvasGPUInfo({
                canvas: this.canvas,
                config: {
                    device: this.gpuinfo.device,
                    format: this.gpuinfo.gpu.getPreferredCanvasFormat()
                }
            });
            if (this.canvasinfo === null) {
                throw new Error("canvasinfo is null");
            }

            this.canvas.height = this.canvas.clientHeight;
            this.canvas.width = this.canvas.clientWidth;
            this.viewHeight = this.canvas.height;
            this.viewWidth = this.canvas.width;

            const viewportOpts = {
                viewport: {
                    width: this.viewWidth,
                    height: this.viewHeight
                }
            }
            this.scene = new Scene({ ...options.scene, ...viewportOpts, tinyearth: this });

            // config
            this.night = options.night ?? false;

            this.skybox = options.skybox ?? true;

            // tile program
            this.globeTilePorgram = new GlobeTileProgram({
                tinyearth: this,
                gpuinfo: this.gpuinfo,
                canvasinfo: this.canvasinfo,
                advance: {
                    wireframe: this.#advance.wireframe ?? false,
                    logDepth: this.#advance.logdepth ?? false
                }
            });

            this.#defaultTileProvider = this.getDefaultTileProvider();

            this.addTileProvider(this.#defaultTileProvider);

            // skybox program
            this.skyboxProgram = new SkyBoxProgram({
                tinyearth: this,
                gpuinfo: this.gpuinfo,
                canvasinfo: this.canvasinfo,
                advance: {
                    logDepth: this.#advance.logdepth ?? false
                }
            });

            this.setSkyboxSource(defaultSkyBoxSourceInfo);

            // default Tools
            const cameraMouseControlTool = new CameraMouseControlTool({
                tinyearth: this
            });
            cameraMouseControlTool.enable();

            // screen quad
            // this.#fullScreenQuad = new ScreenQuad({
            //     tinyearth: this
            // })

            // this.#screenQuadProgram = new ScreenQuadProgram({
            //     tinyearth: this
            // })


            this.#webgpuResources.framebuffer = new GPUFrameBuffer(this.gpuinfo, this.canvasinfo);

            //event
            window.addEventListener('resize', this.resizeHandler.bind(this));
            this.eventBus.addEventListener(TinyEarthEvent.CAMERA_CHANGE, {
                callback: (info) => {
                    this.#refreshReverseZ();
                }
            });

            this.#refreshReverseZ();

            this.#isReady = true;
            this.#readyTaskQueue.forEach(fn => fn());
            this.#readyTaskQueue = [];
        });

    }

    onReady(fn: () => void) {
        if (this.#isReady) {
            fn();
        } else {
            this.#readyTaskQueue.push(fn);
        }
    }

    createRenderPassDescriptor(firstpass: boolean = true): GPURenderPassDescriptor {
        let loadOp: GPULoadOp = 'clear';
        if (firstpass) {
            loadOp = 'clear';
        } else {
            loadOp = 'load';
        }
        const passDescriptor: GPURenderPassDescriptor = {
            label: `tinyearth`,
            colorAttachments: [
                {
                    clearValue: this.bgcolor,
                    loadOp: loadOp,
                    storeOp: 'store',
                    view: this.canvasinfo!.context.getCurrentTexture().createView()
                }
            ],
            depthStencilAttachment: {
                view: this.frameBuffer!.depthTexture.createView(),
                depthClearValue: this.renderStatus.clearDepth,
                depthLoadOp: loadOp,  // 清空
                depthStoreOp: "store",
            }
        }
        return passDescriptor;
    }

    get advance(): TinyEarthAdvanceOptions {
        return this.#advance;
    }

    get nearDepth(): number {
        return this.#renderStatus.reverseZ ? 1.0 : 0.0;
    }

    get farDepth(): number {
        return this.#renderStatus.reverseZ ? 0.0 : 1.0;
    }

    get webgpuResources() {
        return this.#webgpuResources;
    }

    get frameBuffer() {
        return this.#webgpuResources.framebuffer;
    }

    #refreshReverseZ() {

        if (this.#advance.reverseZ === 'auto') {
            const threshold = 10000;
            const h = this.scene!.camera.getHeightToSurface();
            console.log("height: ", h);
            const reverseZ = h > threshold;
            this.#renderStatus.reverseZ = reverseZ;
        } else {
            this.#renderStatus.reverseZ = this.#advance.reverseZ!;
        }

        if (this.#renderStatus.reverseZ) {
            this.#renderStatus.depthFunc = 'greater-equal';
            this.#renderStatus.clearDepth = 0.0;
        } else {
            this.#renderStatus.depthFunc = 'less-equal';
            this.#renderStatus.clearDepth = 1.0;
        }

        console.log(this.#renderStatus.reverseZ);

    }

    get renderStatus() {
        return this.#renderStatus;
    }

    getRenderPassDescriptor(first: boolean): GPURenderPassDescriptor {
        return this.createRenderPassDescriptor(first);
    }

    get debug() {
        return this.#advance.debug ?? false;
    }

    resizeHandler() {
        if (this.canvas !== null) {
            this.canvas.height = this.canvas.clientHeight;
            this.canvas.width = this.canvas.clientWidth;
            this.viewHeight = this.canvas.height;
            this.viewWidth = this.canvas.width;
            if (this.scene !== null) {
                this.scene.viewHeight = this.viewHeight;
                this.scene.viewWidth = this.viewWidth;
            }
            this.refreshFrameBuffer();
        }
    }

    refreshFrameBuffer() {

        if (this.#webgpuResources.framebuffer) {
            this.#webgpuResources.framebuffer.refresh();
        }
    }

    addTileSource(tileInfo: TileSourceInfo): TileProvider {
        const tileProvider = new TileProvider(tileInfo, this);
        tileProvider.night = tileInfo.night;
        this.addTileProvider(tileProvider);
        return tileProvider;
    }

    addTileProvider(provider: TileProvider) {
        if (this.globeTilePorgram !== null) {
            const isNight = provider.source.night ?? false;
            if (!isNight && this.#defaultTileProvider) {
                this.globeTilePorgram.removeTileProvider(this.#defaultTileProvider);
            }
            this.globeTilePorgram.addTileProvider(provider);
        }
    }

    removeTileProvider(provider: TileProvider) {
        if (this.globeTilePorgram !== null) {
            this.globeTilePorgram.removeTileProvider(provider);
        }
    }

    getDefaultTileProvider(): TileProvider {
        const tileInfo = TileResources.OFFLINE_IMAGERY;
        const tileProvider = new TileProvider(tileInfo, this);
        tileProvider.night = tileInfo.night;
        return tileProvider;
    }

    addDefaultTileProvider() {
        if (this.globeTilePorgram !== null) {
            this.globeTilePorgram.addTileProvider(this.#defaultTileProvider!);
        }
    }

    removeAllTileProvider() {
        if (this.globeTilePorgram !== null) {
            this.globeTilePorgram.tileProviders = [];
        }
    }

    get defaultTilePorvider(): TileProvider {
        return this.#defaultTileProvider!;
    }

    setSkyboxSource(skyboxInfo: SkyBoxSourceInfo) {
        const cubemapInfo = [
            { face: "posx", src: skyboxInfo.posx },
            { face: "negx", src: skyboxInfo.negx },
            { face: "posy", src: skyboxInfo.posy },
            { face: "negy", src: skyboxInfo.negy },
            { face: "posz", src: skyboxInfo.posz },
            { face: "negz", src: skyboxInfo.negz }
        ]
        this.skyboxProgram?.setCubeMap(cubemapInfo);
    }

    setBackGroudColor(c: ColorLike) {
        const color = Color.build(c);
        if (color) {
            this.bgcolor = color;
        }
    }

    getBackGroudColor(): Color {
        return this.bgcolor;
    }

    addTool(tool: BaseTool) {
        if (!this.#tools.includes(tool)) {
            this.#tools.push(tool);
        }
    }

    startDraw() {
        this.#startDrawFrame = true;
    }

    stopDraw() {
        this.#startDrawFrame = false;
    }

    isStartDraw() {
        return this.#startDrawFrame;
    }

    setTimerMultipler(m: number = 1) {
        this.timer.setMultipler(m);
    }
    startTimer() {
        this.timer.start();
    }
    stopTimer() {
        this.timer.stop();
    }

    enableNight() {
        this.night = true;
    }
    disableNight() {
        this.night = false;
    }

    enableSkybox() {
        this.skybox = true;
    }
    disableSkybox() {
        this.skybox = false;
    }

    addTimerTickCallback(callback: (timer: Timer) => void): string {
        return this.eventBus.addEventListener(TinyEarthEvent.TIMER_TICK, { callback });
    }

    drawFrame(t: number) {
        if (this.isStartDraw()) {

            this.timer.tick(t);

            if (this.gpuinfo && this.canvasinfo && this.scene) {

                const encoder = this.gpuinfo.device.createCommandEncoder();

                this.#renderStatus.currentPass = encoder.beginRenderPass(this.getRenderPassDescriptor(true));

                this.scene.refreshSceneUniform();

                if (this.skyboxProgram !== null) {
                    this.skyboxProgram.render();
                }

                if (this.globeTilePorgram !== null) {
                    this.globeTilePorgram.render();
                }

                this.scene.drawLayers();

                this.#renderStatus.currentPass.end();

                const commandBuffer = encoder.finish();

                this.gpuinfo.device.queue.submit([commandBuffer]);


            }

            this.eventBus.fire(TinyEarthEvent.TINYEARTH_FRAME, {
                tinyearth: this,
                frameTime: t
            })
        }

        requestAnimationFrame(this.drawFrame.bind(this));
    }

    draw() {

        if (this.globeTilePorgram === null || this.scene === null) {
            return;
        }

        requestAnimationFrame(this.drawFrame.bind(this));
    }
}