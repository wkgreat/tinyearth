import { describe, expect } from '@jest/globals';
import { vec3, vec4, glMatrix } from 'gl-matrix';
import proj4 from 'proj4';
import Camera from '../src/camera';
import { buildFrustum } from '../src/frustum';
import { Tile } from '../src/maptiler';
import Projection from '../src/projection';
import { TileNode, TileTree } from '../src/tilerender';
import Scene from '../src/scene';
import SRS from '../src/proj';
import { NumArr3 } from '../src/defines';
import { TileResources } from '../src/tilesource';
glMatrix.setMatrixArrayType(Array);

describe("tile", () => {

    test("point_in_tile", () => {

        const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        const z = 15;
        const x = 27194;
        const y = 13301;

        const point4326 = [118.767335, 32.050471, 0] as NumArr3;
        const point3857 = SRS.transform(SRS.EPSG_4326, SRS.EPSG_3857, point4326);
        const tile = new Tile(url, x, y, z);
        const [xmin, ymin, xmax, ymax] = tile.extent();

        expect(point3857[0]).toBeGreaterThan(xmin);
        expect(point3857[0]).toBeLessThan(xmax);
        expect(point3857[1]).toBeGreaterThan(ymin);
        expect(point3857[1]).toBeLessThan(ymax);

    });

    test("point_in_frustum", () => {


        const width = 1000;
        const height = 500;

        const cameraFrom = [-2659251.75, 4792728.5, 3401463.25];
        const cameraTo = [0, 0, 0];
        const cameraUp = [0, 0, 1];

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


        const p4326 = [118.767335, 32.050471, 0] as NumArr3;
        const p4978 = SRS.transform(SRS.EPSG_4326, SRS.EPSG_4978, p4326);
        const vp = vec4.fromValues(p4978[0], p4978[1], p4978[2], 1);


        const projection = new Projection(scene, Math.PI / 3, width / height, 1, 1E10, false);
        // const cameraFrom = proj4(EPSG_4326, EPSG_4978, [118.767335, 32.050471, 10000]);
        const camera = new Camera(scene, cameraFrom, cameraTo, cameraUp);
        const projMtx = projection.perspectiveMatrix;
        const viewMtx = camera.viewMatrix;
        const frustum = buildFrustum(projection, camera);


        const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        const z = 15;
        const x = 27194;
        const y = 13301;
        const tile = new Tile(url, x, y, z);

        expect(tile.pointInFrustum(vp, frustum)).toBeTruthy();

    });

    test("tile_in_frustum", () => {

        const width = 1000;
        const height = 500;
        const cameraFrom = [-2659251.75, 4792728.5, 3401463.25];
        const cameraTo = [0, 0, 0];
        const cameraUp = [0, 0, 1];

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

        const projection = new Projection(scene, Math.PI / 3, width / height, 1, 1E10, false);
        const camera = new Camera(scene, cameraFrom, cameraTo, cameraUp);
        const projMtx = projection.perspectiveMatrix;
        const viewMtx = camera.viewMatrix;

        const frustum = buildFrustum(projection, camera);

        const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        const z = 15;
        const x = 27194;
        const y = 13301;
        const tile = new Tile(url, x, y, z);

        let curtile = tile;
        while (curtile.z >= 6) {
            expect(curtile.intersectwithFrustumECEF(frustum)).toBeTruthy();
            curtile = curtile.supTile();
        }


    });

});


describe("TileTree", () => {


});