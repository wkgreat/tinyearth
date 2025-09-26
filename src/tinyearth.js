import { mat4, vec4, glMatrix } from "gl-matrix";
import { buildFrustum } from "./frustum.js";
import Scene from "./scene.js";
import { getSunPositionECEF } from "./sun.js";
import { addTileProviderHelper, addTileSelectHelper, GlobeTileProgram, TileProvider } from "./tilerender.js";
import Timer, { addTimeHelper, EVENT_TIMER_TICK } from "./timer.js";
import proj4 from "proj4";
import { EPSG_4326, EPSG_4978 } from "./proj.js";
import EventBus from "./event.js";
import { addDebugHelper } from "./helper.js";
import { MousePositionTool } from "./tools.js";
import { addMenu } from "./menu.js";
import { SkyBoxProgram } from "./skybox.js";
import { mat4_inv, mat4_mul, vec4_t3 } from "./glmatrix_utils.js";
import { checkGLError } from "./debug.js";
glMatrix.setMatrixArrayType(Array);

export default class TinyEarth {

    /**@type {HTMLCanvasElement|null}*/
    canvas = null;
    /**@type {WebGLRenderingContext}*/
    gl = null;

    /**@type {Scene|null}*/
    scene = null;

    /**@type {Timer|null}*/
    timer = null;

    viewWidth = 512;

    viewHeight = 512;

    /**@type {EventBus|null} */
    eventBus = null;

    /**@type {GlobeTileProgram|null}*/
    globeTilePorgram = null;

    /** @type {SkyBoxProgram} */
    skyboxProgram = null;


    /**@type {boolean}*/
    #startDrawFrame = true;


    /**@param {HTMLCanvasElement} canvas */
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext("webgl", { alpha: true });
        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        this.viewHeight = canvas.height;
        this.viewWidth = canvas.width;
        const that = this;
        this.eventBus = new EventBus();
        window.addEventListener('resize', () => {
            that.canvas.height = that.canvas.clientHeight;
            that.canvas.width = that.canvas.clientWidth;
            that.viewHeight = canvas.height;
            that.viewWidth = canvas.width;
            that.gl.viewport(0, 0, that.viewWidth, that.viewHeight);
            if (that.scene) {
                this.scene.setViewHeight(that.viewHeight);
                this.scene.setViewWidth(that.viewWidth);
            }
        });
        this.globeTilePorgram = new GlobeTileProgram(this);
        this.skyboxProgram = new SkyBoxProgram(this);
    }

    glInit() {
        /*清理及配置*/
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

    addScene(scene) {
        this.scene = scene;
    }

    addTimer(timer) {
        this.timer = timer;
        this.timer.setEventBus(this.eventBus);
    }

    addTileProvider(provider) {
        this.globeTilePorgram.addTileProvider(provider);
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
        this.glInit();

        this.globeTilePorgram.setMaterial(getSunPositionECEF(this.timer.getDate()), this.scene.getCamera());

        let that = this;

        this.eventBus.addEventListener(EVENT_TIMER_TICK, {
            callback: (timer) => {
                if (timer === that.timer) {
                    const sunPos = getSunPositionECEF(timer.getDate());
                    that.globeTilePorgram.setUniform3f("light.position", sunPos.x, sunPos.y, sunPos.z);
                }
            }
        });


        async function drawFrame(t) {
            if (that.isStartDraw()) {

                that.timer.tick(t);

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

                that.skyboxProgram.setUniforms({
                    u_invProjViewMtx: invProjViewMtx,
                    u_worldCameraPos: cameraWorldPos
                });

                that.skyboxProgram.render();

                checkGLError(that.gl, "render");

                const frustum = buildFrustum(
                    that.scene.getProjection(),
                    that.scene.getCamera());
                that.globeTilePorgram.setFrustum(frustum);
                that.globeTilePorgram.render(modelMtx, that.scene.getCamera(), projMtx);
            }
            requestAnimationFrame(drawFrame);
        }

        requestAnimationFrame(drawFrame);
    }
}