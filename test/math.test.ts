import { NumArr3 } from "../src/defines";
import SRS from "../src/proj"

describe("spheriod", () => {


    test("clampToSurface", () => {

        const s = SRS.SPHERIOD_WGS84;

        const p0_4326: NumArr3 = [110, 30, 0];
        const p1_4326: NumArr3 = [120, 40, 0];

        const p0_4978 = SRS.transform(SRS.WGS84, SRS.ECEF, p0_4326);
        const p1_4978 = SRS.transform(SRS.WGS84, SRS.ECEF, p1_4326);
        const mv_4978 = vec3.fromValues((p0_4978[0] + p1_4978[0]) / 2, (p0_4978[1] + p1_4978[1]) / 2, (p0_4978[2] + p1_4978[2]) / 2);

        let mv_4978_clamp = s.clampToSurface(mv_4978);
        let mv_4326_clmap = SRS.transform(SRS.ECEF, SRS.WGS84, vec3_array(mv_4978_clamp));
        expect(mv_4326_clmap[2]).toBeCloseTo(0, 6);

        mv_4978_clamp = s.clampToSurface(mv_4978, 100);
        mv_4326_clmap = SRS.transform(SRS.ECEF, SRS.WGS84, vec3_array(mv_4978_clamp));
        expect(mv_4326_clmap[2]).toBeCloseTo(100, 3);

    })


})