import { glMatrix } from "gl-matrix";
import proj4 from "proj4";
import type { ColorLike } from "./color.js";
import Color from "./color.js";
import EventBus, { TinyEarthEvent } from "./event.js";
import { EPSG_4326, EPSG_4978 } from "./proj.js";
import Scene, { type SceneOptions } from "./scene.js";
import { defaultSkyBoxSourceInfo, SkyBoxProgram, type SkyBoxSourceInfo } from "./skybox.js";
import { GlobeTileProgram, TileProvider } from "./tilerender.js";
import { TileResources, type TileSourceInfo } from "./tilesource.js";
import Timer from "./timer.js";
import CameraMouseControlTool from "./tools/camera_mouse_control.js";
import type BaseTool from "./tools/tool.js";
glMatrix.setMatrixArrayType(Array);

interface TinyEarthOptions {
    canvas: HTMLCanvasElement | string;
    scene?: Omit<SceneOptions, "viewport">
    night?: boolean
    skybox?: boolean
    bgcolor?: ColorLike
}

const cameraFrom = proj4(EPSG_4326, EPSG_4978, [118.778869, 32.043823, 1E7]);
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

        _gl = this.canvas.getContext("webgl2", { alpha: true, depth: true, antialias: false });

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


        const _sceneOpts: Omit<SceneOptions, "viewport" | "tinyearth"> = options.scene ?? defaultSceneOptions;
        const viewportOpts = {
            viewport: {
                width: this.viewWidth,
                height: this.viewHeight
            }
        }
        this.scene = new Scene({ ..._sceneOpts, ...viewportOpts, tinyearth: this });

        const that = this;
        window.addEventListener('resize', () => {
            if (that.canvas !== null) {
                that.canvas.height = that.canvas.clientHeight;
                that.canvas.width = that.canvas.clientWidth;
                that.viewHeight = that.canvas.height;
                that.viewWidth = that.canvas.width;
                if (that.gl !== null) {
                    that.gl.viewport(0, 0, that.viewWidth, that.viewHeight);
                }
                if (that.scene !== null) {
                    that.scene.viewHeight = that.viewHeight;
                    that.scene.viewWidth = that.viewWidth;
                }
            }
        });

        // config
        this.night = options.night ?? false;

        this.skybox = options.skybox ?? true;

        // tile program
        this.globeTilePorgram = new GlobeTileProgram({ tinyearth: this });

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
    }

    clearColor() {
        this.gl.clearColor(this.bgcolor.r, this.bgcolor.g, this.bgcolor.b, this.bgcolor.a);
    }

    // webgl clear and setup
    glInit() {
        if (this.gl !== null) {
            this.clearColor();
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

    draw() {

        if (this.globeTilePorgram === null || this.scene === null) {
            return;
        }
        this.glInit();

        let that = this;

        function drawFrame(t: number) {
            if (that.isStartDraw()) {

                that.timer.tick(t);

                if (that.gl && that.scene) {
                    that.clearColor();
                    that.gl.clear(that.gl.COLOR_BUFFER_BIT | that.gl.DEPTH_BUFFER_BIT);
                    that.scene.viewWidth = that.viewWidth;
                    that.scene.viewHeight = that.viewHeight;

                    if (that.skyboxProgram !== null) {
                        that.skyboxProgram.render();
                    }

                    if (that.globeTilePorgram !== null) {
                        that.globeTilePorgram.setMaterial();
                        that.globeTilePorgram.render();
                    }

                    that.scene.drawLayers();

                }

                that.eventBus.fire(TinyEarthEvent.TINYEARTH_FRAME, {
                    tinyearth: that,
                    frameTime: t
                })
            }
            requestAnimationFrame(drawFrame);
        }

        requestAnimationFrame(drawFrame);
    }
}