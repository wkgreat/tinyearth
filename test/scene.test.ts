import { beforeAll, describe, expect } from '@jest/globals';

import SRS from "../src/proj";
import Scene from "../src/scene";
import { VEC4 } from '../src/matrix';
import { Ray, rayCrossSpheriod } from '../src/math';

describe("scene", () => {

    test("scene_create", () => {

        const scene = new Scene({
            camera: {
                from: [0, 0, 0],
                to: [0, 0, 1],
                up: [0, 1, 0]
            },
            projection: {
                fovy: Math.PI / 2,
                near: 10,
                far: 100
            },

            viewport: {
                width: 5,
                height: 5
            }
        });

        expect(scene).not.toBeNull();
        expect(VEC4.eq(scene.camera.from, VEC4.fromValues(0, 0, 0, 1))).toBeTruthy();
        expect(VEC4.eq(scene.camera.to, VEC4.fromValues(0, 0, 1, 1))).toBeTruthy();
        expect(VEC4.eq(scene.camera.up, VEC4.fromValues(0, 1, 0, 1))).toBeTruthy();
        expect(scene.projection.fovy).toBeCloseTo(Math.PI / 2);
        expect(scene.projection.near).toBeCloseTo(10);
        expect(scene.projection.far).toBeCloseTo(100);
        expect(scene.projection.aspect).toBeCloseTo(5 / 5);

    });

    test("scene_point_9", () => {
        const scene = new Scene({
            camera: {
                from: SRS.transform(SRS.WGS84, SRS.ECEF, [0, 0, 1E7]),
                to: [0, 0, 0],
                up: [0, 0, 1]
            },
            viewport: {
                width: 5,
                height: 5
            }
        });

        const d9 = scene.computeDirection9();
        console.log(d9);

        const p9 = scene.computeEarthPoint9();
        console.log(p9);

        const depthRange = scene.computeStretchDepthRange();
        console.log(depthRange);
    });

})