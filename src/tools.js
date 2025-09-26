import { vec3, vec4 } from "gl-matrix";
import { Point3D, Ray, rayCrossSphere, rayCrossSpheriod, Sphere, Spheriod } from "./geometry.js";
import Scene from "./scene.js";
import { mat4_inv, mat4_mul, vec3_normalize, vec3_sub, vec4_affine, vec4_t3 } from "./glmatrix_utils.js";
import { EARTH_RADIUS, EPSG_4326, EPSG_4978, WGS84_SPHERIOD_A, WGS84_SPHERIOD_B } from "./proj.js";
import TinyEarth from "./tinyearth.js";
import proj4 from "proj4";

/**
 * @param {Scene} scene 
 * @param {double} x
 * @param {double} y
 * @returns {Point3D} 
*/
export function positionAtPixel(scene, x, y) {

    const m_sreen = scene.getViewportMatrix();
    const m_proj = scene.getProjection().perspective();
    const m_view = scene.getCamera().getMatrix().viewMtx;
    const m_projview = mat4_mul(m_proj, m_view);
    const im_proj = mat4_inv(m_proj);
    const im_view = mat4_inv(m_view);
    const im_projview = mat4_inv(m_projview);
    const im_sceen = mat4_inv(m_sreen);

    const sp = vec4.fromValues(x, y, 0, 1);
    const cp = vec4_affine(sp, im_sceen);

    const wp = vec4_t3(vec4_affine(cp, im_projview));
    // const wp = vec4_t3(vec4_affine(vec4_affine(cp, im_proj), im_view));
    const vf = vec4_t3(scene.getCamera().getFrom());
    const d = vec3_normalize(vec3_sub(wp, vf));

    const ray = new Ray(vf, d);
    const spheriod = new Spheriod(WGS84_SPHERIOD_A, WGS84_SPHERIOD_A, WGS84_SPHERIOD_B);
    const crossPoints = rayCrossSpheriod(ray, spheriod, false);
    if (crossPoints === null || crossPoints.length === 0) {
        return null;
    } else {
        return crossPoints[0];
    }
}

export class MousePositionTool {

    /**@type {TinyEarth}*/
    tinyearth = null;
    handleMouseMoveFunc = null;

    mouseX = 0;
    mouseY = 0;



    constructor(tinyearth) {
        this.tinyearth = tinyearth;
        const contextMenu = document.getElementById("contextMenu");
        const option = document.createElement('li');
        option.innerHTML = "复制坐标";
        contextMenu.appendChild(option);
        const that = this;
        option.addEventListener('click', () => {
            const p = positionAtPixel(that.tinyearth.scene, this.mouseX, this.mouseY);
            let text = "";
            if (p) {
                const lonLatAlt = proj4(EPSG_4978, EPSG_4326, [p.getX(), p.getY(), p.getZ()]);
                text = `${lonLatAlt[0]}, ${lonLatAlt[1]}`;
            } else {
                text = "";
            }
            navigator.clipboard.writeText(text)
                .then(() => { alert(`坐标已复制到剪贴板: ${text}`) })
                .catch(err => { alert(`坐标复制失败`) });
        });

    }

    handleMouseMove() {
        const that = this;
        return (event) => {
            const canvas = that.tinyearth.canvas;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;
            this.mouseX = x;
            this.mouseY = y;
            const p = positionAtPixel(that.tinyearth.scene, x, y);
            const input = document.getElementById("status-mouse-location-input");
            if (p) {
                const lonLatAlt = proj4(EPSG_4978, EPSG_4326, [p.getX(), p.getY(), p.getZ()]);
                input.value = `${lonLatAlt[0]}, ${lonLatAlt[1]}`;
            } else {
                input.value = "";
            }
        }
    }

    enable() {
        this.handleMouseMoveFunc = this.handleMouseMove();
        this.tinyearth.canvas.addEventListener('mousemove', this.handleMouseMoveFunc);
    }

    disable() {
        this.canvas.removeEventListener('mousemove', this.handleMouseMoveFunc);
        this.handleMouseMoveFunc = null;
    }

}