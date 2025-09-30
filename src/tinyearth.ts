import { glMatrix, mat4 } from "gl-matrix";
import { checkGLError } from "./debug.js";
import EventBus from "./event.js";
import { buildFrustum } from "./frustum.js";
import { vec4_t3 } from "./glmatrix_utils.js";
import Scene from "./scene.js";
import { SkyBoxProgram } from "./skybox.js";
import { getSunPositionECEF } from "./sun.js";
import { GlobeTileProgram, TileProvider } from "./tilerender.js";
import Timer, { EVENT_TIMER_TICK } from "./timer.js";
glMatrix.setMatrixArrayType(Array);

export default class TinyEarth {

    canvas: HTMLCanvasElement | null = null;

    gl: WebGLRenderingContext | null = null;

    scene: Scene | null = null;

    timer: Timer;

    viewWidth = 512;

    viewHeight = 512;

    eventBus: EventBus;

    globeTilePorgram: GlobeTileProgram | null = null;

    skyboxProgram: SkyBoxProgram | null = null;

    #startDrawFrame: boolean = true;

    constructor(canvas: HTMLCanvasElement) {

        this.eventBus = new EventBus();
        this.timer = new Timer(Date.now());
        this.timer.setEventBus(this.eventBus);

        this.canvas = canvas;
        this.gl = canvas.getContext("webgl", { alpha: true });
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        this.viewHeight = canvas.height;
        this.viewWidth = canvas.width;
        const that = this;
        window.addEventListener('resize', () => {
            if (that.canvas !== null) {
                that.canvas.height = that.canvas.clientHeight;
                that.canvas.width = that.canvas.clientWidth;
                that.viewHeight = canvas.height;
                that.viewWidth = canvas.width;
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

    addScene(scene: Scene) {
        this.scene = scene;
    }

    addTimer(timer: Timer) {
        this.timer = timer;
        this.timer.setEventBus(this.eventBus);
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