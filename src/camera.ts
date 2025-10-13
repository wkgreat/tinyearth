import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import proj4 from "proj4";
import { mat4_mul, mat4_rotateAroundLine, vec3_array, vec3_normalize, vec3_t4, vec4_t3 } from "./glmatrix_utils.js";
import { EARTH_RADIUS, EPSG_4326, EPSG_4978 } from "./proj.js";
import Scene from "./scene.js";
import { LEFTBUTTON, WHEELBUTTON, type MouseEventHandler, type NumArr2, type NumArr3, type WheelEventHandler } from "./defines.js";
import { TinyEarthEvent } from "./event.js";
glMatrix.setMatrixArrayType(Array);

export type CameraEventCallback = (camera: Camera, info: any) => void;

class Camera {

    #from: vec4 = vec4.fromValues(1, 1, 1, 1);
    #to: vec4 = vec4.fromValues(0, 0, 0, 1);
    #up: vec4 = vec4.fromValues(0, 1, 0, 0);
    #viewMtx: mat4 = mat4.create();
    #invViewMtx: mat4 = mat4.create();

    #scene: Scene;

    constructor(scene: Scene, from: vec4, to: vec4, up: vec4) {
        this.#scene = scene;
        this.setFrom(from);
        this.setTo(to);
        this.setUp(up);
    }

    setFrom(vin: vec3 | vec4) {
        this.setVector4(this.#from, vin);
    }
    setTo(vin: vec3 | vec4) {
        this.setVector4(this.#to, vin);
    }
    setUp(vin: vec3 | vec4) {
        this.setVector4(this.#up, vin);
    }

    setVector4(vout: vec4, vin: vec3 | vec4) {
        const len = vin.length;
        if (len < 3) {
            console.log("len < 3");
        } else if (len == 3) {
            vec4.set(vout, vin[0], vin[1], vin[2], 1);
        } else {
            vec4.set(vout, vin[0], vin[1], vin[2], vin[3] as number);
        }
    }

    _vec3(v: vec3 | vec4) {
        return vec3.set(vec3.create(), v[0], v[1], v[2]);
    }

    _look() {
        mat4.lookAt(this.#viewMtx, this._vec3(this.#from), this._vec3(this.#to), this._vec3(this.#up));
        mat4.invert(this.#invViewMtx, this.#viewMtx);
    }

    getMatrix() {
        this._look();
        return {
            viewMtx: this.#viewMtx,
            invViewMtx: this.#invViewMtx
        };
    }

    /**
     * round by to point, in camera view coordinate system
     * @param dx rotation angle in x axis direction (round by y axis)
     * @param dy rotation angle in y axis direction (round by x axis)
    */
    round(dx: number, dy: number) {

        const [rx, ry] = this.getResolution();
        const lx = -dx * rx;
        const ly = -dy * ry;

        const ax = Math.atan(lx / EARTH_RADIUS);
        const ay = Math.atan(ly / EARTH_RADIUS);

        const viewFrom4 = vec4.transformMat4(vec4.create(), this.#from, this.#viewMtx);
        const viewTo4 = vec4.transformMat4(vec4.create(), this.#to, this.#viewMtx);
        const viewFrom3 = this._vec3(viewFrom4);
        const viewTo3 = this._vec3(viewTo4);

        vec3.rotateY(viewFrom3, viewFrom3, viewTo3, ax); // 绕Y轴旋转dx
        vec3.rotateX(viewFrom3, viewFrom3, viewTo3, ay); // 绕x轴旋转dy

        vec4.set(viewFrom4, viewFrom3[0], viewFrom3[1], viewFrom3[2], 1);
        vec4.transformMat4(this.#from, viewFrom4, this.#invViewMtx);

        this._look();

        this.#scene.tinyearth.eventBus.fire(TinyEarthEvent.CAMERA_CHANGE, {
            camera: this,
            type: "round"
        });
    }

    /**
     * camera round like earth is self rotating
     * @param a the angular velocity in radians of earth rotation (from west to east)
     * {@link ../docs/source/camera.md | Earth Self Rotation Effect}
    */
    roundForEarthSelfRotationEffect(a: number) {
        const mat = mat4.create();
        mat4.identity(mat);
        mat4.rotateZ(mat, mat, -a);
        vec4.transformMat4(this.#from, this.#from, mat);
        this.#to = vec4.fromValues(0, 0, 0, 1);
        this._look();

        this.#scene.tinyearth.eventBus.fire(TinyEarthEvent.CAMERA_CHANGE, {
            camera: this,
            type: "roundForEarthSelfRotationEffect"
        });
    }

    /**
     * @description 缩放（相机前进或后退）
     * @param f 缩放系数 
    */
    zoom(f: number) {

        //TODO 考虑地球为椭球体
        const d = vec4.create();
        const fromLonLatAlt: NumArr3 = proj4(EPSG_4978, EPSG_4326, [this.#from[0], this.#from[1], this.#from[2]]);
        const toLonLatAlt: NumArr3 = [fromLonLatAlt[0], fromLonLatAlt[1], 1];
        const to = proj4(EPSG_4326, EPSG_4978, toLonLatAlt);
        const toVec4 = vec4.fromValues(to[0], to[1], to[2], 1);
        vec4.sub(d, toVec4, this.#from);
        const factor = Math.sign(f) * 0.1;
        vec4.scale(d, d, factor);
        vec4.add(this.#from, this.#from, d);
        this._look();

        this.#scene.tinyearth.eventBus.fire(TinyEarthEvent.CAMERA_CHANGE, {
            camera: this,
            type: "zoom"
        });
    }

    /**
     * @description 相机平移
     * @param dx x轴方向平移量
     * @param dy y轴方向平移量
     * TODO 根据比例尺移动，move时避免重复请求
    */
    move(dx: number, dy: number) {
        const viewFrom4 = vec4.transformMat4(vec4.create(), this.#from, this.#viewMtx);
        const viewTo4 = vec4.transformMat4(vec4.create(), this.#to, this.#viewMtx);

        const mtx = mat4.create();
        mat4.translate(mtx, mtx, [dx, dy, 0]);
        vec4.transformMat4(viewFrom4, viewFrom4, mtx);
        vec4.transformMat4(viewTo4, viewTo4, mtx);

        vec4.transformMat4(this.#from, viewFrom4, this.#invViewMtx);
        vec4.transformMat4(this.#to, viewTo4, this.#invViewMtx);

        this._look();

        this.#scene.tinyearth.eventBus.fire(TinyEarthEvent.CAMERA_CHANGE, {
            camera: this,
            type: "move"
        });
    }

    /**
     * @param ax angle(radians) of target point orbit around line (earth center to camera position)
     * @param ay angle(radians) of target point orbit around by x axis of view coordinator system
    */
    moveTarget(ax: number, ay: number) {

        // the axis from earth center to camera position (perpendicular to ground)
        const panAxis = vec3_t4(vec3_normalize(vec4_t3(this.#from)), 1);

        // the axis of view space x axis transformed to world space
        const tiltAxis = vec4.fromValues(1, 0, 0, 0); // the x axis in view space
        vec4.transformMat4(tiltAxis, tiltAxis, this.#invViewMtx); // transform to world space

        // transform
        const panMatrix = mat4_rotateAroundLine(this.#from, panAxis, ax);
        const tiltMatrix = mat4_rotateAroundLine(this.#from, tiltAxis, ay);
        const m = mat4_mul(panMatrix, tiltMatrix);
        vec4.transformMat4(this.#to, this.#to, m);

        // set camera up alwary perpendicular to ground.
        this.#up = panAxis;

        this._look();

        this.#scene.tinyearth.eventBus.fire(TinyEarthEvent.CAMERA_CHANGE, {
            camera: this,
            type: "panTilt"
        });

    }

    getFrom() {
        return this.#from;
    }

    getTo() {
        return this.#to;
    }

    getHeightToSurface() {
        const from = proj4(EPSG_4978, EPSG_4326, vec3_array(vec4_t3(this.#from)));
        return from[2];
    }

    getViewDistanceToSurface() {
        //TODO
    }

    /**  
     * TODO 暂时不考虑视角倾斜
    */
    getResolution(): NumArr2 {
        const projection = this.#scene.projection;
        const viewWidth = this.#scene.viewWidth;
        const viewHeight = this.#scene.viewHeight;
        const height = this.getHeightToSurface();
        const half_foy = projection.fovy / 2.0;
        const half_fox = projection.getFovx() / 2.0;
        const h = height * Math.tan(half_foy) * 2;
        const v = height * Math.tan(half_fox) * 2;
        return [v / viewWidth, h / viewHeight];
    }

    getFieldFromEarthCenter() {
        const projection = this.#scene.projection;
        const height = this.getHeightToSurface();
        const half_foy = projection.fovy / 2.0;
        const half_fox = projection.getFovx() / 2.0;
        const vlength = height * Math.tan(half_foy);
        const hlength = height * Math.tan(half_fox);
        const radius = EARTH_RADIUS;
        const fieldx = Math.atan(hlength / radius) * 2;
        const fieldy = Math.atan(vlength / radius) * 2;
        return [fieldx, fieldy];
    }



};

export class CameraMouseControl {

    camera: Camera;
    canvas: HTMLCanvasElement;
    leftButtonDown: boolean = false;
    wheelButtonDown: boolean = false;
    lastMouseX: number = 0;
    lastMouseY: number = 0;
    handleMouseDownFunc: MouseEventHandler | null = null;
    handleMouseMoveFunc: MouseEventHandler | null = null;
    handleMouseUpFunc: MouseEventHandler | null = null;
    handleMouseLeaveFunc: MouseEventHandler | null = null;
    handleMouseWheelFunc: WheelEventHandler | null = null;

    constructor(camera: Camera, canvas: HTMLCanvasElement) {
        this.camera = camera;
        this.canvas = canvas;
    }

    handleMouseDown(): MouseEventHandler {
        const that = this;
        return (e) => {
            if (e.button == LEFTBUTTON) {
                that.leftButtonDown = true;
            } else if (e.button == WHEELBUTTON) {
                that.wheelButtonDown = true;
            }
            that.lastMouseX = e.clientX;
            that.lastMouseY = e.clientY;

        }
    }

    handleMouseMove(): MouseEventHandler {
        const that = this;
        return (e) => {
            if (this.leftButtonDown) {
                const dx = e.clientX - that.lastMouseX;
                const dy = e.clientY - that.lastMouseY;
                that.camera.round(dx, dy);
            } else if (this.wheelButtonDown) {
                e.preventDefault();
                const dx = e.clientX - that.lastMouseX;
                const dy = e.clientY - that.lastMouseY;
                that.camera.moveTarget(-dx * (Math.PI / 180.0) / 10, -dy * (Math.PI / 180.0) / 10);
            }
            that.lastMouseX = e.clientX;
            that.lastMouseY = e.clientY;
        }
    }

    handleMouseUp(): MouseEventHandler {
        const that = this;
        return (e) => {
            if (e.button == LEFTBUTTON) {
                that.leftButtonDown = false;
            }
            if (e.button == WHEELBUTTON) {
                that.wheelButtonDown = false;
            }
        }
    }

    handleMouseLeave(): MouseEventHandler {
        const that = this;
        return (e) => {
            that.leftButtonDown = false;
            that.wheelButtonDown = false;
        }
    }

    handleMouseWheel(): WheelEventHandler {
        const that = this;
        return (e) => {
            e.preventDefault();
            this.camera.zoom(e.deltaY / 120 * (1 / 10));
        }
    }

    enable() {
        this.handleMouseDownFunc = this.handleMouseDown();
        this.handleMouseMoveFunc = this.handleMouseMove();
        this.handleMouseUpFunc = this.handleMouseUp();
        this.handleMouseLeaveFunc = this.handleMouseLeave();
        this.handleMouseWheelFunc = this.handleMouseWheel();
        this.canvas.addEventListener('mousedown', this.handleMouseDownFunc);
        this.canvas.addEventListener('mousemove', this.handleMouseMoveFunc)
        this.canvas.addEventListener('mouseup', this.handleMouseUpFunc);
        this.canvas.addEventListener('mouseleave', this.handleMouseLeaveFunc);
        this.canvas.addEventListener('wheel', this.handleMouseWheelFunc);
    }
    disable() {
        //TODO resolve any type
        this.canvas.removeEventListener('mousedown', this.handleMouseDownFunc as any);
        this.canvas.removeEventListener('mousemove', this.handleMouseMoveFunc as any)
        this.canvas.removeEventListener('mouseup', this.handleMouseUpFunc as any);
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeaveFunc as any);
        this.canvas.removeEventListener('wheel', this.handleMouseWheelFunc as any);
        this.handleMouseDownFunc = null;
        this.handleMouseMoveFunc = null;
        this.handleMouseUpFunc = null;
        this.handleMouseLeaveFunc = null;
        this.handleMouseWheelFunc = null;
    }
};

export default Camera;