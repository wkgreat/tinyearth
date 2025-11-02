import proj4 from "proj4";
import type { NumArr3 } from "./defines";
import { OblateSpheriod, toDegrees, toRadians } from "./math";

export type projcode_t = string | number;

/**
 * class SRS
 * Spatial Reference System
*/
export default class SRS {

    static readonly EPSG_3857: projcode_t = 3857;
    static readonly EPSG_4326: projcode_t = 4326;
    static readonly EPSG_4978: projcode_t = 4978;
    static readonly EPSG_4978_TEXT: string = "+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs";
    static readonly WGS84: projcode_t = 4326;
    static readonly WEB: projcode_t = 3857;
    static readonly ECEF: projcode_t = 4978;

    static readonly SPHERIOD_WGS84 = new OblateSpheriod(6378137.0, 6356752.314245);

    static proj4text(proj: projcode_t): string {

        if (typeof proj === 'number') {
            if (proj === 4978) {
                return SRS.EPSG_4978_TEXT;
            } else {
                return `EPSG:${proj}`;
            }
        }
        return proj;
    }

    static transform(src: projcode_t, dst: projcode_t, p: NumArr3): NumArr3 {

        if (src === 3857 && dst === 4326) {
            return SRS.transform_3857_4326(p);
        }

        if (src === 4326 && dst === 4978) {
            return SRS.transform_4326_4978(p);
        }

        if (src === 3857 && dst === 4978) {
            return SRS.transform_3857_4978(p);
        }

        if (src === 4978 && dst === 4326) {
            return SRS.transform_4978_4326(p);
        }

        return proj4(SRS.proj4text(src), SRS.proj4text(dst), p);

    }

    static transform_3857_4326(p: NumArr3): NumArr3 {
        const r = SRS.SPHERIOD_WGS84.a;
        const [x0, y0, z0] = p;
        const x1 = toDegrees(x0 / r);
        const y1 = toDegrees(2 * Math.atan(Math.exp(y0 / r)) - Math.PI / 2);
        const z1 = z0;
        return [x1, y1, z1];
    }

    static transform_4326_4978(p: NumArr3): NumArr3 {

        const a = SRS.SPHERIOD_WGS84.majorRadius;
        const e2 = SRS.SPHERIOD_WGS84.e2;

        const [x0, y0, z0] = [toRadians(p[0]), toRadians(p[1]), p[2]];
        const N = a / Math.sqrt(1 - e2 * Math.pow(Math.sin(y0), 2));
        const x1 = (N + z0) * Math.cos(y0) * Math.cos(x0);
        const y1 = (N + z0) * Math.cos(y0) * Math.sin(x0);
        const z1 = (N * (1 - e2) + z0) * Math.sin(y0);
        return [x1, y1, z1];
    }

    static transform_4978_4326(point: NumArr3): NumArr3 {

        const a = SRS.SPHERIOD_WGS84.majorRadius;
        const f = SRS.SPHERIOD_WGS84.f;
        const e2 = SRS.SPHERIOD_WGS84.e2;

        const [x0, y0, z0] = point;

        const x1 = Math.atan2(y0, x0); // longitude

        const p = Math.sqrt(x0 * x0 + y0 * y0);

        let py1 = Math.atan2(z0, p * (1 - e2));
        let n = a / Math.sqrt(1 - e2 * Math.pow(Math.sin(py1), 2));
        let y1 = Math.atan2(z0 + n * e2 * Math.sin(py1), p);

        for (let i = 0; i < 3; ++i) {
            py1 = y1;
            n = a / Math.sqrt(1 - e2 * Math.pow(Math.sin(py1), 2));
            y1 = Math.atan2(z0 + n * e2 * Math.sin(py1), p);
        }
        n = a / Math.sqrt(1 - e2 * Math.pow(Math.sin(y1), 2));
        const z1 = p / Math.cos(y1) - n;
        return [toDegrees(x1), toDegrees(y1), z1];
    }

    static transform_3857_4978(point: NumArr3): NumArr3 {
        return SRS.transform_4326_4978(SRS.transform_3857_4326(point));
    }

}








