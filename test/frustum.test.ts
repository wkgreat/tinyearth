import { beforeAll, describe, expect } from '@jest/globals';
import { mat4, vec4 } from 'gl-matrix';
import proj4 from 'proj4';
import Camera from '../src/camera';
import Frustum, { buildFrustum } from '../src/frustum';
import { mat4_inv, mat4_mul } from '../src/glmatrix_utils';
import { EPSG_4326, EPSG_4978 } from '../src/proj';
import Projection from '../src/projection';
import Scene from '../src/scene';

function clipToWord(p: vec4, IM: mat4): vec4 {
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
    let IM: mat4;
    let frustum: Frustum;

    beforeAll(() => {

        const width = 1000;
        const height = 500;

        cameraFrom = proj4(EPSG_4326, EPSG_4978, [117, 32, 1E7]);
        cameraTo = [0, 0, 0];
        cameraUp = [0, 0, 1];

        const scene = new Scene({
            camera: {
                from: cameraFrom,
                to: cameraTo,
                up: cameraUp
            },
            projection: {
                fovy: Math.PI / 3,
                near: 1,
                far: 1E8
            },
            viewport: {
                width: width,
                height: height
            }
        });

        projection = new Projection(scene, Math.PI / 3, width / height, 1, 10000);
        camera = new Camera(scene, cameraFrom, cameraTo, cameraUp);
        projMtx = projection.perspective();
        viewMtx = camera.getMatrix().viewMtx;
        M = mat4_mul(projMtx, viewMtx);
        IM = mat4_inv(M) as mat4;
        // frustum = buildFrustum(projMtx, viewMtx, cameraFrom);
        frustum = buildFrustum(projection, camera);

    });

    test("point on the left plane", () => {
        let cp = vec4.fromValues(-1, 0, 0, 1);
        let wp = clipToWord(cp, IM);
        let dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"]).toBeCloseTo(0, 1E-6);
        expect(dist["right"] as number > 0).toBeTruthy();
        expect(dist["bottom"] as number > 0).toBeTruthy();
        expect(dist["top"] as number > 0).toBeTruthy();
        expect(dist["near"] as number > 0).toBeTruthy();
        expect(dist["far"] as number > 0).toBeTruthy();
    });

    test("point to the left of left plane", () => {
        let cp = vec4.fromValues(-100000, 0, 0, 1);
        let wp = clipToWord(cp, IM);
        let dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"] as number < 0).toBeTruthy();
        expect(dist["right"] as number > 0).toBeTruthy();
        expect(dist["bottom"] as number > 0).toBeTruthy();
        expect(dist["top"] as number > 0).toBeTruthy();
        expect(dist["near"] as number > 0).toBeTruthy();
        expect(dist["far"] as number > 0).toBeTruthy();
    });

    test("point on the center", () => {
        let cp = vec4.fromValues(0, 0, 0, 1);
        let wp = clipToWord(cp, IM);
        let dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"] as number > 0).toBeTruthy();
        expect(dist["right"] as number > 0).toBeTruthy();
        expect(dist["bottom"] as number > 0).toBeTruthy();
        expect(dist["top"] as number > 0).toBeTruthy();
        expect(dist["near"] as number > 0).toBeTruthy();
        expect(dist["far"] as number > 0).toBeTruthy();
    });

    test("point to the right of right plane", () => {
        let cp = vec4.fromValues(2, 0, 0, 1);
        let wp = clipToWord(cp, IM);
        let dist = frustum.getDistanceOfPoint(wp);
        expect(dist["left"] as number > 1).toBeTruthy();
        expect(dist["right"] as number < -1).toBeTruthy();
        expect(dist["bottom"] as number > 0).toBeTruthy();
        expect(dist["top"] as number > 0).toBeTruthy();
        expect(dist["near"] as number > 0).toBeTruthy();
        expect(dist["far"] as number > 0).toBeTruthy();
    });

});