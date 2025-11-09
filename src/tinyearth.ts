import { glMatrix } from "gl-matrix";
import type { ColorLike } from "./color.js";
import Color from "./color.js";
import type { NumArr4 } from "./defines.js";
import EventBus, { TinyEarthEvent } from "./event.js";
import type { Program } from "./program.js";
import SRS from "./proj.js";
import Scene, { type SceneOptions } from "./scene.js";
import { defaultSkyBoxSourceInfo, SkyBoxProgram, type SkyBoxSourceInfo } from "./skybox.js";
import { GlobeTileProgram, RenderMethod, TileProvider } from "./tilerender.js";
import { TileResources, type TileSourceInfo } from "./tilesource.js";
import Timer from "./timer.js";
import CameraMouseControlTool from "./tools/camera_mouse_control.js";
import type BaseTool from "./tools/tool.js";
import { GLFrameBuffer } from "./webgl.js";
import { ScreenQuad, ScreenQuadProgram } from "./screenQuad.js";
glMatrix.setMatrixArrayType(Array);

export interface TinyEarthOptions {
    canvas: HTMLCanvasElement | string;
    scene?: Omit<SceneOptions, "viewport" | "tinyearth">
    night?: boolean
    skybox?: boolean
    bgcolor?: ColorLike,
    advance?: {
        glErrorCheck?: boolean
    }
}

const cameraFrom = SRS.transform(SRS.WGS84, SRS.ECEF, [118.778869, 32.043823, 1E7]);
const cameraTo = [0, 0, 0];
const cameraUp = [0, 0, 1];

const defaultSceneOptions: Omit<SceneOptions, "viewport" | "tinyearth"> = {
    camera: {
        from: cameraFrom,
        to: cameraTo,
        up: cameraUp
    },
    projection: {
        fovy: Math.PI / 3,
        near: 10,
        far: 1E8
    },
}

export default class TinyEarth {

    canvas: HTMLCanvasElement;

    gl: WebGL2RenderingContext;

    scene: Scene;

    timer: Timer;

    viewWidth = 512;

    viewHeight = 512;

    eventBus: EventBus;

    globeTilePorgram: GlobeTileProgram | null = null;

    skyboxProgram: SkyBoxProgram | null = null;

    #startDrawFrame: boolean = true;

    #defaultTileProvider: TileProvider;

    night: boolean = false

    skybox: boolean = true

    bgcolor: Color = new Color(0, 0, 0, 1);

    #tools: BaseTool[] = [];

    #advance = {
        glErrorCheck: false
    }

    //framebuffer

    #frameBuffer: GLFrameBuffer | null = null;

    #groundFrameBuffer: GLFrameBuffer | null = null;

    // screen quad
    #fullScreenQuad: ScreenQuad;

    #screenQuadProgram: ScreenQuadProgram;

    constructor(options: TinyEarthOptions) {

        this.eventBus = new EventBus();
        this.timer = new Timer(Date.now());
        this.timer.setEventBus(this.eventBus);

        let _canvas: HTMLCanvasElement | null = null;
        let _gl: WebGLRenderingContext | null = null;

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

        _gl = this.canvas.getContext("webgl2", {
            alpha: true,
            depth: true,
            stencil: false,
            antialias: false
        });

        if (_gl === null) {
            throw new Error("webgl context is null");
        }

        this.gl = _gl as WebGL2RenderingContext;

        console.log("WebGL Version:", this.gl.getParameter(this.gl.VERSION));
        console.log("GLSL Version:", this.gl.getParameter(this.gl.SHADING_LANGUAGE_VERSION));
        console.log("Renderer:", this.gl.getParameter(this.gl.RENDERER));
        console.log("Vendor:", this.gl.getParameter(this.gl.VENDOR));

        this.canvas.height = this.canvas.clientHeight;
        this.canvas.width = this.canvas.clientWidth;
        this.viewHeight = this.canvas.height;
        this.viewWidth = this.canvas.width;

        this.refreshFrameBuffer();

        const _sceneOpts: Omit<SceneOptions, "viewport" | "tinyearth"> = options.scene ?? defaultSceneOptions;
        const viewportOpts = {
            viewport: {
                width: this.viewWidth,
                height: this.viewHeight
            }
        }
        this.scene = new Scene({ ..._sceneOpts, ...viewportOpts, tinyearth: this });

        const that = this;

        window.addEventListener('resize', this.resizeHandler.bind(this));

        // config
        this.night = options.night ?? false;

        this.skybox = options.skybox ?? true;

        // tile program
        this.globeTilePorgram = new GlobeTileProgram({
            tinyearth: this,
            advance: {
                renderMethod: RenderMethod.STATIC
            }
        });

        this.#defaultTileProvider = this.getDefaultTileProvider();

        this.addTileProvider(this.#defaultTileProvider);

        // skybox program
        this.skyboxProgram = new SkyBoxProgram({ tinyearth: this });

        this.setSkyboxSource(defaultSkyBoxSourceInfo);

        // default Tools
        const cameraMouseControlTool = new CameraMouseControlTool({
            tinyearth: this
        });
        cameraMouseControlTool.enable();

        //advance
        const advance = options.advance ?? {};
        this.#advance.glErrorCheck = advance.glErrorCheck ?? false;

        // screen quad

        this.#fullScreenQuad = new ScreenQuad({
            tinyearth: this
        })

        this.#screenQuadProgram = new ScreenQuadProgram({
            tinyearth: this
        })
    }

    clearColor() {
        this.gl.clearColor(this.bgcolor.r, this.bgcolor.g, this.bgcolor.b, this.bgcolor.a);
    }

    get frameBuffer() {
        return this.#frameBuffer;
    }

    get glErrorCheck() {
        return this.#advance.glErrorCheck;
    }

    // webgl clear and setup
    glInit() {
        if (this.gl !== null) {
            this.clearColor();

            this.gl.disable(this.gl.CULL_FACE);

            this.gl.clearDepth(1.0);
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.enable(this.gl.CULL_FACE);
            this.gl.depthFunc(this.gl.LEQUAL);
            this.gl.viewport(0, 0, this.viewWidth, this.viewHeight);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

            // default blend mode
            this.gl.enable(this.gl.BLEND);
            this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
        }
    }

    resizeHandler() {
        if (this.canvas !== null) {
            this.canvas.height = this.canvas.clientHeight;
            this.canvas.width = this.canvas.clientWidth;
            this.viewHeight = this.canvas.height;
            this.viewWidth = this.canvas.width;
            if (this.gl !== null) {
                this.gl.viewport(0, 0, this.viewWidth, this.viewHeight);
            }
            if (this.scene !== null) {
                this.scene.viewHeight = this.viewHeight;
                this.scene.viewWidth = this.viewWidth;
            }
            this.refreshFrameBuffer();
        }
    }

    refreshFrameBuffer() {

        if (this.#frameBuffer) {
            this.#frameBuffer.destroy();
        }

        this.#frameBuffer = new GLFrameBuffer({
            tinyearth: this,
            width: this.viewWidth,
            height: this.viewHeight,
            enableColor: true,
            enableDepth: true,
            enableStencil: true
        });

        if (this.#groundFrameBuffer) {
            this.#groundFrameBuffer.destroy();
        }

        this.#groundFrameBuffer = new GLFrameBuffer({
            tinyearth: this,
            width: this.viewWidth,
            height: this.viewHeight,
            enableColor: true,
            enableDepth: true,
            enableStencil: true
        });
    }

    getGroundFrameBuffer() {
        return this.#groundFrameBuffer;
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
            if (!isNight) {
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
            this.globeTilePorgram.addTileProvider(this.#defaultTileProvider);
        }
    }

    removeAllTileProvider() {
        if (this.globeTilePorgram !== null) {
            this.globeTilePorgram.tileProviders = [];
        }
    }

    get defaultTilePorvider(): TileProvider {
        return this.#defaultTileProvider;
    }

    setSkyboxSource(skyboxInfo: SkyBoxSourceInfo) {
        const cubemapInfo = [
            { face: this.gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: skyboxInfo.posx },
            { face: this.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: skyboxInfo.posy },
            { face: this.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: skyboxInfo.posz },
            { face: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: skyboxInfo.negx },
            { face: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: skyboxInfo.negy },
            { face: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: skyboxInfo.negz }
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

    clearFrameBuffer(fb: GLFrameBuffer | null, options?: {
        color?: NumArr4,
        depth?: number,
        stencil?: number
    }) {
        const opts = options ?? {};
        const color = opts.color ?? [0.0, 0.0, 0.0, 1.0];
        const depth = opts.depth ?? 1.0;
        const stencil = opts.stencil ?? 0.0;
        if (fb) {
            fb.clear({
                color: color,
                depth: depth,
                stencil: stencil
            })
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
            this.gl.viewport(0, 0, this.viewWidth, this.viewHeight);
            this.gl.clearColor(...color);
            this.gl.clearDepth(depth);
            this.gl.clearStencil(stencil);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);
        }

        GLFrameBuffer.bindGLFrameBuffer(this.gl, this.#frameBuffer);

    }

    drawFrame(t: number) {
        if (this.isStartDraw()) {

            this.timer.tick(t);

            if (this.gl && this.scene) {
                GLFrameBuffer.bindGLFrameBuffer(this.gl, this.#frameBuffer);
                this.clearFrameBuffer(
                    this.#frameBuffer,
                    {
                        color: this.bgcolor.toArray(),
                        depth: 1.0,
                        stencil: 0.0
                    }
                )
                GLFrameBuffer.bindGLFrameBuffer(this.gl, this.#groundFrameBuffer);
                if (this.#groundFrameBuffer) {
                    this.#groundFrameBuffer.clear({
                        color: this.bgcolor.toArray(),
                        depth: 1.0,
                        stencil: 0.0
                    });
                }

                GLFrameBuffer.bindGLFrameBuffer(this.gl, this.#frameBuffer);
                if (this.skyboxProgram !== null) {
                    this.skyboxProgram.render();
                }

                if (this.globeTilePorgram !== null) {
                    this.globeTilePorgram.setMaterial();
                    this.globeTilePorgram.render();
                }


                if (this.#groundFrameBuffer) {
                    GLFrameBuffer.bindGLFrameBuffer(this.gl, this.#groundFrameBuffer);
                    this.#groundFrameBuffer.tap();
                }

                GLFrameBuffer.bindGLFrameBuffer(this.gl, this.#frameBuffer);
                this.scene.drawLayers();

                GLFrameBuffer.bindGLFrameBuffer(this.gl, null);

                this.#screenQuadProgram.quad = this.#fullScreenQuad;
                this.#screenQuadProgram.texture = this.#frameBuffer?.colorTexture ?? null;
                this.#screenQuadProgram.draw();

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

        this.glInit();

        requestAnimationFrame(this.drawFrame.bind(this));
    }
}