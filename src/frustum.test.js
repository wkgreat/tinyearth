import { beforeAll, describe, expect } from '@jest/globals';
import { vec4 } from 'gl-matrix';
import proj4 from 'proj4';
import Camera from './camera';
import { buildFrustum } from './frustum';
import { mat4_inv, mat4_mul } from './glmatrix_utils';
import { EPSG_4326, EPSG_4978 } from './proj';
import Projection from './projection';

function clipToWord(p, IM) {
    let wp = vec4.transformMat4(vec4.create(), p, IM);
    wp = vec4.scale(vec4.create(), wp, 1.0 / wp[3]);
    return wp;
}

describe("frustum", () => {

    let projection;
    let cameraFrom;
    let cameraTo;
    let cameraUp;
    let camera;
    let projMtx;
    let viewMtx;
    let M;
    let IM;
    let frustum;

    beforeAll(() => {

        const width = 1000;
        const height = 500;

        projection = new Projection(Math.PI / 3, width / height, 1, 10000);
        cameraFrom = proj4(EPSG_4326, EPSG_4978, [117, 32, 1E7]);
        cameraTo = [0, 0, 0];
        cameraUp = [0, 0, 1];
        camera = new Camera(null, cameraFrom, cameraTo, cameraUp);
        projMtx = projection.perspective();
        viewMtx = camera.getMatrix().viewMtx;
        M = mat4_mul(projMtx, viewMtx);
        IM = mat4_inv(M);
        // frustum = buildFrustum(projMtx, viewMtx, cameraFrom);
        frustum = buildFrustum(projection, camera);

    });

    test("point on the left plane", () => {
        let cp = vec4.fromValues(-1, 0, 0, 1);
        let wp = clipToWord(cp, IM);
        let dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"]).toBeCloseTo(0, 1E-6);
        expect(dist["right"] > 0).toBeTruthy();
        expect(dist["bottom"] > 0).toBeTruthy();
        expect(dist["top"] > 0).toBeTruthy();
        expect(dist["near"] > 0).toBeTruthy();
        expect(dist["far"] > 0).toBeTruthy();
    });

    test("point to the left of left plane", () => {
        cp = vec4.fromValues(-100000, 0, 0, 1);
        wp = clipToWord(cp, IM);
        dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"] < 0).toBeTruthy();
        expect(dist["right"] > 0).toBeTruthy();
        expect(dist["bottom"] > 0).toBeTruthy();
        expect(dist["top"] > 0).toBeTruthy();
        expect(dist["near"] > 0).toBeTruthy();
        expect(dist["far"] > 0).toBeTruthy();
    });

    test("point on the center", () => {
        cp = vec4.fromValues(0, 0, 0, 1);
        wp = clipToWord(cp, IM);
        dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"] > 0).toBeTruthy();
        expect(dist["right"] > 0).toBeTruthy();
        expect(dist["bottom"] > 0).toBeTruthy();
        expect(dist["top"] > 0).toBeTruthy();
        expect(dist["near"] > 0).toBeTruthy();
        expect(dist["far"] > 0).toBeTruthy();
    });

    test("point to the right of right plane", () => {
        cp = vec4.fromValues(2, 0, 0, 1);
        wp = clipToWord(cp, IM);
        dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"] > 1).toBeTruthy();
        expect(dist["right"] < -1).toBeTruthy();
        expect(dist["bottom"] > 0).toBeTruthy();
        expect(dist["top"] > 0).toBeTruthy();
        expect(dist["near"] > 0).toBeTruthy();
        expect(dist["far"] > 0).toBeTruthy();
    });

});