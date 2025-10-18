import type { NumArr3 } from "./defines";
import type Scene from "./scene";
import type TinyEarth from "./tinyearth";

function toRadians(deg: number): number {
    return deg * Math.PI / 180;
}

function toDegrees(rad: number): number {
    return rad * 180 / Math.PI;
}

function julianDate(date: Date): number {
    const time = date.getTime();
    return (time / 86400000.0) + 2440587.5;
}

function getGMST(jd: number): number {
    const d = jd - 2451545.0;
    let gmst = 280.46061837 + 360.98564736629 * d;
    gmst = ((gmst % 360) + 360) % 360;
    return toRadians(gmst);
}

export interface xyzObject {
    x: number,
    y: number,
    z: number
}

function getSunECI(jd: number): xyzObject {
    const n = jd - 2451545.0;
    const L = (280.460 + 0.9856474 * n) % 360;
    const g = toRadians((357.528 + 0.9856003 * n) % 360);
    const lambda = toRadians((L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360);

    const epsilon = toRadians(23.439 - 0.0000004 * n); // 地轴倾角

    const r = 1.496e+8; // 太阳到地球的距离（千米）

    const x = r * Math.cos(lambda);
    const y = r * Math.cos(epsilon) * Math.sin(lambda);
    const z = r * Math.sin(epsilon) * Math.sin(lambda);

    return { x, y, z };
}

function eciToEcef(eci: xyzObject, gmst: number): xyzObject {
    const cosGMST = Math.cos(gmst);
    const sinGMST = Math.sin(gmst);

    return {
        x: eci.x * cosGMST + eci.y * sinGMST,
        y: -eci.x * sinGMST + eci.y * cosGMST,
        z: eci.z
    };
}

// 主函数：获取太阳ECEF坐标
export function getSunPositionECEF(date: Date = new Date()): xyzObject {
    const jd = julianDate(date);
    const gmst = getGMST(jd);
    const sunEci = getSunECI(jd);
    const sunEcef = eciToEcef(sunEci, gmst);
    return sunEcef;
}

export class Sun {

    #scene: Scene;

    constructor(scene: Scene) {
        this.#scene = scene;
    }

    get position(): NumArr3 {
        const p = Sun.getPositionAtTime(this.#scene.tinyearth.timer.currentDate);
        return p;
    }

    static getPositionAtTime(date: Date): NumArr3 {
        const p = getSunPositionECEF(date);
        return [p.x, p.y, p.z];
    }

}

