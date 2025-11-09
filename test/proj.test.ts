import { transform } from "@babel/core";
import { NumArr3 } from "../src/defines";
import SRS from "../src/proj";
import proj4 from 'proj4';

describe("proj", () => {


    test("transform_3857_4326", () => {

        const p0: NumArr3 = [117, 32, 0];
        const p1 = SRS.transform(SRS.WGS84, SRS.WEB, p0) as NumArr3;
        const p2 = SRS.transform(SRS.WEB, SRS.WGS84, p1);

        expect(p2[0]).toBeCloseTo(p0[0], 6);
        expect(p2[1]).toBeCloseTo(p0[1], 6);
        expect(p2[2]).toBeCloseTo(p0[2], 6);

    });


    test("transform_4326_4978", () => {

        const p0: NumArr3 = [117, 32, 0];
        const p1 = SRS.transform(SRS.WGS84, SRS.ECEF, p0) as NumArr3;
        const p2 = SRS.transform(SRS.ECEF, SRS.WGS84, p1);

        expect(p2[0]).toBeCloseTo(p0[0], 6);
        expect(p2[1]).toBeCloseTo(p0[1], 6);
        expect(p2[2]).toBeCloseTo(p0[2], 6);

    });

});