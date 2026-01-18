import { Ray, rayCrossSpheriod, Spheriod, type Point3D } from "../math";
import type Scene from "../scene";
import type TinyEarth from "../tinyearth";
import SRS from "../proj";
import { MAT4, VEC3, VEC4, type mat4 } from "../matrix";

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

    abstract enable(): void;
    abstract disable(): void;

}

export function positionAtPixel(scene: Scene, x: number, y: number): Point3D | null {

    const m_sreen = scene.viewportMatrix;
    const m_proj = scene.projection.perspectiveMatrix;
    const m_view = scene.camera.viewMatrix;
    const m_projview = MAT4.mul(m_proj, m_view);
    const im_proj = MAT4.invert(m_proj);
    const im_view = MAT4.invert(m_view);
    const im_projview: mat4 = MAT4.invert(m_projview) as mat4;
    const im_sceen: mat4 = MAT4.invert(m_sreen) as mat4;

    const sp = VEC4.fromValues(x, y, 0, 1);
    const cp = VEC4.affine(sp, im_sceen);

    const wp = VEC4.force3(VEC4.affine(cp, im_projview));
    // const wp = vec4_t3(vec4_affine(vec4_affine(cp, im_proj), im_view));
    const vf = VEC4.force3(scene.camera.from);
    const d = VEC3.normalize(VEC3.sub(wp, vf));

    const ray = new Ray(vf, d);
    const spheriod = new Spheriod(SRS.SPHERIOD_WGS84.a, SRS.SPHERIOD_WGS84.a, SRS.SPHERIOD_WGS84.c);
    const crossPoints = rayCrossSpheriod(ray, spheriod, false);
    if (crossPoints === null || crossPoints.length === 0) {
        return null;
    } else {
        return crossPoints[0] ?? null;
    }
}

export function formatNumber(num: number, intLen: number = 3, decLen: number = 2): string {

    let parts = num.toFixed(decLen).split('.');

    parts[0] = parts[0]!.padStart(intLen, '0');

    return parts.join('.');
}