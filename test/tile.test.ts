import { describe, expect } from '@jest/globals';
import { vec3, vec4, glMatrix } from 'gl-matrix';
import proj4 from 'proj4';
import Camera from '../src/camera';
import { buildFrustum } from '../src/frustum';
import { Tile } from '../src/maptiler';
import { EPSG_3857, EPSG_4326, EPSG_4978 } from '../src/proj';
import Projection from '../src/projection';
import { TileNode, TileTree } from '../src/tilerender';
import Scene from '../src/scene';
glMatrix.setMatrixArrayType(Array);

describe("tile", () => {

    test("point_in_tile", () => {

        const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        const z = 15;
        const x = 27194;
        const y = 13301;

        const point4326 = [118.767335, 32.050471, 0];
        const point3857 = proj4(EPSG_4326, EPSG_3857, point4326);
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


        const p4326 = [118.767335, 32.050471, 0];
        const p4978 = proj4(EPSG_4326, EPSG_4978, p4326);
        const vp = vec4.fromValues(p4978[0], p4978[1], p4978[2], 1);


        const projection = new Projection(scene, Math.PI / 3, width / height, 1, 1E10);
        // const cameraFrom = proj4(EPSG_4326, EPSG_4978, [118.767335, 32.050471, 10000]);
        const camera = new Camera(scene, cameraFrom, cameraTo, cameraUp);
        const projMtx = projection.perspective();
        const viewMtx = camera.getMatrix().viewMtx;
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

        const projection = new Projection(scene, Math.PI / 3, width / height, 1, 1E10);
        const camera = new Camera(scene, cameraFrom, cameraTo, cameraUp);
        const projMtx = projection.perspective();
        const viewMtx = camera.getMatrix().viewMtx;

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

    test("tile_tree_add", () => {

        const tree = new TileTree("");

        const tile = new Tile("", 0, 0, 1);

        tree.addTile(tile);

        expect(tree.root.children.length === 4).toBeTruthy();

        let node = tree.getTileNode(1, 0, 0);

        expect(node).not.toBeNull();

        node = node as TileNode

        expect(node).toBeInstanceOf(TileNode);
        expect(node.key.z === 1).toBeTruthy();
        expect(node.key.x === 0).toBeTruthy();
        expect(node.key.y === 0).toBeTruthy();
        expect(node.tile).toBe(tile);

        let tn = 0;
        let hn = 0;
        let mn = 0;
        tree.forEachTileNodesOfLevel(1, (node) => {
            tn += 1;
            if (node && node.tile) {
                hn += 1;
                expect(node.key.z === 1).toBeTruthy();
                expect(node.key.x === 0).toBeTruthy();
                expect(node.key.y === 0).toBeTruthy();
            } else {
                mn += 1;
            }
        })

        expect(tn === 4).toBeTruthy();
        expect(hn === 1).toBeTruthy();
        expect(mn === 3).toBeTruthy();

    })

});