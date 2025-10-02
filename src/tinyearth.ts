import { glMatrix, mat4 } from "gl-matrix";
import { checkGLError } from "./debug.js";
import EventBus from "./event.js";
import { buildFrustum } from "./frustum.js";
import { vec4_t3 } from "./glmatrix_utils.js";
import Scene, { type SceneOptions } from "./scene.js";
import { SkyBoxProgram } from "./skybox.js";
import { getSunPositionECEF } from "./sun.js";
import { GlobeTileProgram, TileProvider, type TileSourceInfo } from "./tilerender.js";
import Timer, { EVENT_TIMER_TICK } from "./timer.js";
import proj4 from "proj4";
import { EPSG_4326, EPSG_4978 } from "./proj.js";
glMatrix.setMatrixArrayType(Array);

interface TinyEarthOptions {
    canvas: HTMLCanvasElement | string;
    scene?: Omit<SceneOptions, "viewport">
}

const cameraFrom = proj4(EPSG_4326, EPSG_4978, [118.778869, 32.043823, 1E7]);
const cameraTo = [0, 0, 0];
const cameraUp = [0, 0, 1];

const defaultSceneOptions: Omit<SceneOptions, "viewport"> = {
    camera: {
        from: cameraFrom,
        to: cameraTo,
        up: cameraUp
    },
    projection: {
        fovy: Math.PI / 3,
        near: 1,
        far: 1E8
    },
}

export default class TinyEarth {

    canvas: HTMLCanvasElement;

    gl: WebGLRenderingContext;

    scene: Scene | null = null;

    timer: Timer;

    viewWidth = 512;

    viewHeight = 512;

    eventBus: EventBus;

    globeTilePorgram: GlobeTileProgram | null = null;

    skyboxProgram: SkyBoxProgram | null = null;

    #startDrawFrame: boolean = true;

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

        _gl = this.canvas.getContext("webgl", { alpha: true });

        if (_gl === null) {
            throw new Error("webgl context is null");
        }

        this.gl = _gl;

        this.canvas.height = this.canvas.clientHeight;
        this.canvas.width = this.canvas.clientWidth;
        this.viewHeight = this.canvas.height;
        this.viewWidth = this.canvas.width;


        const _sceneOpts: Omit<SceneOptions, "viewport"> = options.scene ?? defaultSceneOptions;
        const viewportOpts = {
            viewport: {
                width: this.viewWidth,
                height: this.viewHeight
            }
        }
        this.scene = new Scene({ ..._sceneOpts, ...viewportOpts });

        this.scene.addCameraControl(this.canvas);

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
                    that.scene.setViewHeight(that.viewHeight);
                    that.scene.setViewWidth(that.viewWidth);
                }
            }
        });

        this.globeTilePorgram = new GlobeTileProgram(this);

        this.skyboxProgram = new SkyBoxProgram(this);
    }

    // webgl clear and setup
    glInit() {
        if (this.gl !== null) {
            this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
            this.gl.clearDepth(1.0);
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.enable(this.gl.CULL_FACE);
            this.gl.depthFunc(this.gl.LEQUAL);
            this.gl.viewport(0, 0, this.viewWidth, this.viewHeight);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        }
    }

    addTileSource(tileInfo: TileSourceInfo): TileProvider {
        const tileProvider = new TileProvider(tileInfo.url, this);
        tileProvider.setMinLevel(tileInfo.minLevel);
        tileProvider.setMaxLevel(tileInfo.maxLevel);
        tileProvider.setIsNight(!!tileInfo.night);
        this.addTileProvider(tileProvider);
        return tileProvider;
    }

    addTileProvider(provider: TileProvider) {
        if (this.globeTilePorgram !== null) {
            this.globeTilePorgram.addTileProvider(provider);
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

    draw() {

        if (this.globeTilePorgram === null || this.scene === null) {
            return;
        }
        this.glInit();

        this.globeTilePorgram.setMaterial(getSunPositionECEF(this.timer.getDate()), this.scene.getCamera());

        let that = this;

        if (this.eventBus !== null) {
            this.eventBus.addEventListener(EVENT_TIMER_TICK, {
                callback: (timer: Timer) => {
                    if (timer === that.timer) {
                        const sunPos = getSunPositionECEF(timer.getDate());
                        that.globeTilePorgram!.setUniform3f("light.position", sunPos.x, sunPos.y, sunPos.z);
                    }
                }
            });
        }

        async function drawFrame(t: number) {
            if (that.isStartDraw()) {

                that.timer.tick(t);

                if (that.gl && that.scene) {
                    that.gl.clearColor(0.0, 0.0, 0.0, 0.0);
                    that.gl.clearDepth(1.0);
                    that.gl.clear(that.gl.COLOR_BUFFER_BIT | that.gl.DEPTH_BUFFER_BIT);
                    that.scene.setViewWidth(that.viewWidth);
                    that.scene.setViewHeight(that.viewHeight);

                    const modelMtx = mat4.create();
                    const projMtx = that.scene.getProjection().perspective();
                    const viewMtx = that.scene.getCamera().getMatrix().viewMtx;

                    const invProjViewMtx = mat4.create();
                    mat4.multiply(invProjViewMtx, projMtx, viewMtx);
                    mat4.invert(invProjViewMtx, invProjViewMtx);
                    const cameraWorldPos = vec4_t3(that.scene.getCamera().getFrom());


                    if (that.skyboxProgram !== null) {
                        that.skyboxProgram.setUniforms({
                            u_invProjViewMtx: invProjViewMtx,
                            u_worldCameraPos: cameraWorldPos
                        });

                        that.skyboxProgram.render();
                    }

                    checkGLError(that.gl, "render");

                    if (that.globeTilePorgram !== null) {
                        const frustum = buildFrustum(
                            that.scene.getProjection(),
                            that.scene.getCamera());
                        that.globeTilePorgram.setFrustum(frustum);
                        that.globeTilePorgram.render(modelMtx, that.scene.getCamera(), projMtx);
                    }
                }
            }
            requestAnimationFrame(drawFrame);
        }

        requestAnimationFrame(drawFrame);
    }
}