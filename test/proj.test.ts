import { NumArr3 } from "../src/defines";
import { EPSG_3857, EPSG_4326, EPSG_4978, transform_3857_4326, transform_4326_4978, transform_4978_4326 } from "../src/proj";
import proj4 from 'proj4';

describe("proj", () => {


    test("transform_3857_4326", () => {

        const p0 = [117, 32, 0];
        const p1 = proj4(EPSG_4326, EPSG_3857, p0) as NumArr3;
        const p2 = transform_3857_4326(p1);

        expect(p2[0]).toBeCloseTo(p0[0], 6);
        expect(p2[1]).toBeCloseTo(p0[1], 6);
        expect(p2[2]).toBeCloseTo(p0[2], 6);

    });


    test("transform_4326_4978", () => {

        const p0: NumArr3 = [117, 32, 0];
        const p1 = proj4(EPSG_4326, EPSG_4978, p0) as NumArr3;
        const p2 = transform_4326_4978(p0);

        expect(p2[0]).toBeCloseTo(p1[0], 6);
        expect(p2[1]).toBeCloseTo(p1[1], 6);
        expect(p2[2]).toBeCloseTo(p1[2], 6);

    });

    test("transform_4978_4326", () => {

        const p0: NumArr3 = [117, 32, 0];
        const p1 = transform_4326_4978(p0);
        const p2 = transform_4978_4326(p1);

        expect(p2[0]).toBeCloseTo(p0[0], 6);
        expect(p2[1]).toBeCloseTo(p0[1], 6);
        expect(p2[2]).toBeCloseTo(p0[2], 6);
    });

});