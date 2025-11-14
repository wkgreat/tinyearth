import { type NumArr2, type NumArr3 } from "./defines.js";
import { TinyEarthEvent } from "./event.js";
import Scene from "./scene.js";
import SRS from "./proj.js";
import { MAT4, VEC3, VEC4, type mat4, type vec3, type vec4 } from "./matrix.js";

export type CameraEventCallback = (camera: Camera, info: any) => void;

class Camera {

    #from: vec4 = VEC4.fromValues(1, 1, 1, 1);
    #to: vec4 = VEC4.fromValues(0, 0, 0, 1);
    #up: vec4 = VEC4.fromValues(0, 1, 0, 0);
    #viewMtx: mat4 = MAT4.create();
    #invViewMtx: mat4 = MAT4.create();
    #relViewMtx: mat4 = MAT4.create();
    #invRelViewMtx: mat4 = MAT4.create();

    #scene: Scene;

    constructor(scene: Scene, from: vec4, to: vec4, up: vec4) {
        this.#scene = scene;
        this.#setVec4(this.#from, from)
        this.#setVec4(this.#to, to)
        this.#setVec4(this.#up, up)
        this._look();
    }

    #setVec4(vout: vec4, vin: vec3 | vec4) {
        if (vin.length == 3) {
            VEC4.set(vout, vin[0], vin[1], vin[2], 1);
        } else {
            VEC4.set(vout, vin[0], vin[1], vin[2], vin[3] as number);
        }
    }

    _look() {
        this.#viewMtx = MAT4.lookAt(VEC4.force3(this.#from), VEC4.force3(this.#to), VEC4.force3(this.#up));
        this.#invViewMtx = MAT4.invert(this.#viewMtx)!;
        const d = VEC3.sub(VEC4.force3(this.#to), VEC4.force3(this.#from));
        this.#relViewMtx = MAT4.lookAt(VEC3.fromValues(0, 0, 0), d, VEC4.force3(this.#up));
        this.#invRelViewMtx = MAT4.invert(this.#relViewMtx)!;

        this.#computeHightToSurface();
        this.#computeCameraDeviate();
    }

    get viewMatrix() {
        return this.#viewMtx;
    }

    get ViewMatrixInv() {
        return this.#invViewMtx;
    }

    get relViewMatrix() {
        return this.#relViewMtx;
    }

    get relViewMatrixInv() {
        return this.#invRelViewMtx;
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

        const ax = Math.atan(lx / SRS.SPHERIOD_WGS84.a);
        const ay = Math.atan(ly / SRS.SPHERIOD_WGS84.a);

        const viewFrom4 = VEC4.transform(this.#from, this.#viewMtx);
        const viewTo4 = VEC4.transform(this.#to, this.#viewMtx);
        let viewFrom3 = VEC4.force3(viewFrom4);
        let viewTo3 = VEC4.force3(viewTo4);

        viewFrom3 = VEC3.rotateY(viewFrom3, viewTo3, ax); // 绕Y轴旋转dx
        viewFrom3 = VEC3.rotateX(viewFrom3, viewTo3, ay); // 绕x轴旋转dy

        VEC4.set(viewFrom4, viewFrom3[0], viewFrom3[1], viewFrom3[2], 1);
        this.#from = VEC4.transform(viewFrom4, this.#invViewMtx);

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
        let mat = MAT4.create();
        mat = MAT4.rotateZ(mat, -a);
        this.#from = VEC4.transform(this.#from, mat);
        this.#to = VEC4.fromValues(0, 0, 0, 1);
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
        let d = VEC4.create();
        const fromLonLatAlt: NumArr3 = SRS.transform(SRS.ECEF, SRS.WGS84, [this.#from[0], this.#from[1], this.#from[2]]);
        const toLonLatAlt: NumArr3 = [fromLonLatAlt[0], fromLonLatAlt[1], 1];
        const to = SRS.transform(SRS.WGS84, SRS.ECEF, toLonLatAlt);
        const toVec4 = VEC4.fromValues(to[0], to[1], to[2], 1);
        d = VEC4.sub(toVec4, this.#from);
        const factor = Math.sign(f) * 0.1;
        d = VEC4.scale(d, factor);
        this.#from = VEC4.add(this.#from, d);
        this._look();

        this.#scene.tinyearth?.eventBus.fire(TinyEarthEvent.CAMERA_CHANGE, {
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
        const viewFrom4 = VEC4.transform(this.#from, this.#viewMtx);
        const viewTo4 = VEC4.transform(this.#to, this.#viewMtx);

        const mtx = MAT4.create();
        MAT4.translate_(mtx, mtx, [dx, dy, 0]);
        VEC4.transform_(viewFrom4, viewFrom4, mtx);
        VEC4.transform_(viewTo4, viewTo4, mtx);
        VEC4.transform_(this.#from, viewFrom4, this.#invViewMtx);
        VEC4.transform_(this.#to, viewTo4, this.#invViewMtx);

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
        const panAxis = VEC3.force4(VEC3.normalize(VEC4.force3(this.#from)), 1);

        // the axis of view space x axis transformed to world space
        const tiltAxis = VEC4.fromValues(1, 0, 0, 0); // the x axis in view space
        VEC4.transform_(tiltAxis, tiltAxis, this.#invViewMtx); // transform to world space

        // transform
        const panMatrix = MAT4.rotateAroundLine(this.#from, panAxis, ax);
        const tiltMatrix = MAT4.rotateAroundLine(this.#from, tiltAxis, ay);
        const m = MAT4.mul(panMatrix, tiltMatrix);
        const to = VEC4.create();
        VEC4.transform_(to, this.#to, m);

        const d = Camera.computeDeviateVertical(this.#from, to);

        if (d > 0) {
            this.#to = to;

            // set camera up alwary perpendicular to ground.
            if (d < 1 - 1E-5) {
                this.#up = panAxis;
            }

            this._look();

            this.#scene.tinyearth.eventBus.fire(TinyEarthEvent.CAMERA_CHANGE, {
                camera: this,
                type: "panTilt"
            });
        }
    }

    get from() {
        return this.#from;
    }

    get position() {
        return this.#from;
    }

    get to() {
        return this.#to;
    }

    get target() {
        return this.#to;
    }

    get up() {
        return this.#up;
    }

    set from(from: vec4) {
        this.#from = from;
        this.#scene.tinyearth.eventBus.fire(TinyEarthEvent.CAMERA_CHANGE, {
            camera: this,
            type: "from"
        });
        this._look();
    }

    set to(to: vec4) {
        this.#to = to;
        this.#scene.tinyearth.eventBus.fire(TinyEarthEvent.CAMERA_CHANGE, {
            camera: this,
            type: "to"
        });
        this._look();
    }

    set up(up: vec4) {
        this.#up = up;
        this.#scene.tinyearth.eventBus.fire(TinyEarthEvent.CAMERA_CHANGE, {
            camera: this,
            type: "up"
        });
        this._look();
    }

    static computeDeviateVertical(from: vec3, to: vec3): number {
        const viewNormal = VEC3.normalize(VEC3.sub(to, from));
        const verticalNormal = VEC3.normalize(VEC3.scale(from, -1));
        const d = VEC3.dot(viewNormal, verticalNormal);
        return d;
    }

    #cameraDeviate: number = 0.0;
    #computeCameraDeviate() {
        const viewNormal = VEC3.normalize(VEC3.sub(VEC4.force3(this.#to), VEC4.force3(this.#from)));
        const verticalNormal = VEC3.normalize(VEC3.scale(this.#from, -1));
        const d = VEC3.dot(viewNormal, verticalNormal);
        this.#cameraDeviate = d;
    }

    getCameraDeviate(): number {
        return this.#cameraDeviate;
    }

    #heightToSurface: number = 0.0;
    #computeHightToSurface() {
        const from = SRS.transform(SRS.ECEF, SRS.WGS84, VEC3.array(VEC4.force3(this.#from)));
        this.#heightToSurface = from[2];
    }
    getHeightToSurface() {
        return this.#heightToSurface;
    }

    getViewDistanceToSurface() {
        //TODO
    }

    /**  
     * TODO 暂时不考虑视角倾斜
     * TODO lazy calc
    */
    getResolution(): NumArr2 {
        const projection = this.#scene.projection;
        const viewWidth = this.#scene.viewWidth;
        const viewHeight = this.#scene.viewHeight;
        const height = this.getHeightToSurface();
        const half_foy = projection.fovy / 2.0;
        const half_fox = projection.fovx / 2.0;
        const h = height * Math.tan(half_foy) * 2;
        const v = height * Math.tan(half_fox) * 2;
        return [v / viewWidth, h / viewHeight];
    }

    //TODO lazy calc
    getFieldFromEarthCenter() {
        const projection = this.#scene.projection;
        const height = this.getHeightToSurface();
        const half_foy = projection.fovy / 2.0;
        const half_fox = projection.fovx / 2.0;
        const vlength = height * Math.tan(half_foy);
        const hlength = height * Math.tan(half_fox);
        const radius = SRS.SPHERIOD_WGS84.a;
        const fieldx = Math.atan(hlength / radius) * 2;
        const fieldy = Math.atan(vlength / radius) * 2;
        return [fieldx, fieldy];
    }

};

export default Camera;