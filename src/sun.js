function toRadians(deg) {
    return deg * Math.PI / 180;
}

function toDegrees(rad) {
    return rad * 180 / Math.PI;
}

function julianDate(date) {
    const time = date.getTime();
    return (time / 86400000.0) + 2440587.5;
}

function getGMST(jd) {
    const d = jd - 2451545.0;
    let gmst = 280.46061837 + 360.98564736629 * d;
    gmst = ((gmst % 360) + 360) % 360;
    return toRadians(gmst);
}

function getSunECI(jd) {
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

function eciToEcef(eci, gmst) {
    const cosGMST = Math.cos(gmst);
    const sinGMST = Math.sin(gmst);

    return {
        x: eci.x * cosGMST + eci.y * sinGMST,
        y: -eci.x * sinGMST + eci.y * cosGMST,
        z: eci.z
    };
}

// 主函数：获取太阳ECEF坐标
export function getSunPositionECEF(date = new Date()) {
    const jd = julianDate(date);
    const gmst = getGMST(jd);
    const sunEci = getSunECI(jd);
    const sunEcef = eciToEcef(sunEci, gmst);
    return sunEcef;
}

export class Sun {

    position = null;

    constructor() {}

    refreshSunPosition(date) {
        this.position = getSunPositionECEF(date);
    }

}

