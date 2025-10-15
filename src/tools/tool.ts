import { vec4, type mat4 } from "gl-matrix";
import { Ray, rayCrossSpheriod, Spheriod, type Point3D } from "../geometry";
import { mat4_inv, mat4_mul, vec3_normalize, vec3_sub, vec4_affine, vec4_t3 } from "../glmatrix_utils";
import type Scene from "../scene";
import { WGS84_SPHERIOD_A, WGS84_SPHERIOD_B } from "../proj";
import type TinyEarth from "../tinyearth";

export interface BaseToolOptions {
    tinyearth: TinyEarth
}

export default abstract class BaseTool {

    #tinyearth: TinyEarth

    constructor(options: BaseToolOptions) {
        this.#tinyearth = options.tinyearth;
        this.bind();
    }

    get tinyearth(): TinyEarth {
        return this.#tinyearth;
    }

    bind() {
        this.#tinyearth.addTool(this);
    }

}

export function positionAtPixel(scene: Scene, x: number, y: number): Point3D | null {

    const m_sreen = scene.viewportMatrix;
    const m_proj = scene.projection.perspectiveMatrix;
    const m_view = scene.camera.viewMatrix;
    const m_projview = mat4_mul(m_proj, m_view);
    const im_proj = mat4_inv(m_proj);
    const im_view = mat4_inv(m_view);
    const im_projview: mat4 = mat4_inv(m_projview) as mat4;
    const im_sceen: mat4 = mat4_inv(m_sreen) as mat4;

    const sp = vec4.fromValues(x, y, 0, 1);
    const cp = vec4_affine(sp, im_sceen);

    const wp = vec4_t3(vec4_affine(cp, im_projview));
    // const wp = vec4_t3(vec4_affine(vec4_affine(cp, im_proj), im_view));
    const vf = vec4_t3(scene.camera.from);
    const d = vec3_normalize(vec3_sub(wp, vf));

    const ray = new Ray(vf, d);
    const spheriod = new Spheriod(WGS84_SPHERIOD_A, WGS84_SPHERIOD_A, WGS84_SPHERIOD_B);
    const crossPoints = rayCrossSpheriod(ray, spheriod, false);
    if (crossPoints === null || crossPoints.length === 0) {
        return null;
    } else {
        return crossPoints[0] ?? null;
    }
}