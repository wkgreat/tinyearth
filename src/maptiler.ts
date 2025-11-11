import { glMatrix, vec3, vec4 } from "gl-matrix";
import type { Extent, Interval, NumArr3 } from "./defines.js";
import Frustum from "./frustum.js";
import { vec3_add, vec3_dot, vec3_fromarray, vec3_normalize, vec3_scale, vec3_sub, vec3_t4 } from "./glmatrix_utils.js";
import { Plane, pointOutSidePlane } from "./math.js";
import SRS, { type projcode_t } from "./proj.js";
import type { TileProvider } from "./tilerender.js";
import type { TileURL } from "./tilesource.js";
import { loadTileImage } from "./tileutils.js";

glMatrix.setMatrixArrayType(Array);

const XLIMIT: Interval = [-20037508.3427892, 20037508.3427892];
const YLIMIT: Interval = [-20037508.3427892, 20037508.3427892];

export enum TileStatus {
    NEW = "NEW",
    LOADING = "LOADING",
    READY = "READY",
    FAILED = "FAILED",
    DEAD = "DEAD"
};

/**
 * Tile
*/
export class Tile {

    x: number = 0;

    y: number = 0;

    z: number = 0;

    urltem: string = "";

    url: string = "";

    image: HTMLImageElement | null = null;

    provider: TileProvider | null = null;

    #retryTime: number = 0;

    #maxRetryTile: number = 10;

    #status: TileStatus = TileStatus.NEW;

    mesh: Float32Array | null = null;

    normals: [vec3, vec3, vec3, vec3] | null = null;

    corners: [vec3, vec3, vec3, vec3] | null = null;

    subdivisionLevel: number = 3;

    constructor(url: TileURL, x: number = 0, y: number = 0, z: number = 0) {
        this.setUrl(url, x, y, z);
        this.#status = TileStatus.NEW;
    }

    setUrl(url: TileURL, x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        if (typeof url === 'function') {
            this.url = url(x, y, z);
            this.urltem = this.url;
        } else {
            this.urltem = url;
            this.url = url.replace("{z}", `${z}`).replace("{x}", `${x}`).replace("{y}", `${y}`);
        }
    }

    supTileAtLevel(level: number): Tile {
        if (level > this.z) {
            console.error("supTile error");
        }

        let curTile: Tile = this;
        while (curTile.z > level) {
            curTile = curTile.supTile();
        }
        return curTile;
    }

    supTile(): Tile {
        const newZ = this.z - 1;
        const newX = this.x >> 1;
        const newY = this.y >> 1;
        return new Tile(this.urltem, newX, newY, newZ);
    }

    subTiles(): [Tile, Tile, Tile, Tile] {
        return [
            new Tile(this.urltem, this.x * 2, this.y * 2, this.z + 1),
            new Tile(this.urltem, this.x * 2 + 1, this.y * 2, this.z + 1),
            new Tile(this.urltem, this.x * 2, this.y * 2 + 1, this.z + 1),
            new Tile(this.urltem, this.x * 2 + 1, this.y * 2 + 1, this.z + 1)
        ];
    }

    pointInFrustumPlane(p: vec4, plane: vec4): boolean {
        if (!plane) {
            return true;
        }
        const v = vec4.dot(p, plane);
        return Math.abs(v) > 0;
    }

    pointInFrustum(p: vec4, frustum: Frustum): boolean {

        // TODO check frustum plane is null
        return this.pointInFrustumPlane(p, frustum.left!) &&
            this.pointInFrustumPlane(p, frustum.right!) &&
            this.pointInFrustumPlane(p, frustum.bottom!) &&
            this.pointInFrustumPlane(p, frustum.top!) &&
            this.pointInFrustumPlane(p, frustum.near!) &&
            this.pointInFrustumPlane(p, frustum.far!);
    }

    /* 注意GOOGLE切片原点视左上角，不是左下角*/
    extent(): Extent {
        const dx = (XLIMIT[1] - XLIMIT[0]) / Math.pow(2, this.z);
        const dy = (YLIMIT[1] - YLIMIT[0]) / Math.pow(2, this.z);
        const xmin = XLIMIT[0] + dx * this.x;
        const xmax = XLIMIT[0] + dx * (this.x + 1);
        const ymin = YLIMIT[1] - dy * (this.y + 1);
        const ymax = YLIMIT[1] - dy * (this.y);
        return [xmin, ymin, xmax, ymax];
    }

    center() {
        const ext = this.extent();
        let p: NumArr3 = [(ext[0] + ext[2]) / 2, (ext[1] + ext[3]) / 2, 0];
        p = SRS.transform(SRS.WEB, SRS.ECEF, p);
        return vec3_fromarray(p);
    }

    centerNormal() {
        return vec3_normalize(this.center());
    }

    getNormals(): [vec3, vec3, vec3, vec3] {
        if (!this.normals) {

            const ext = this.extent();
            let p0: NumArr3 = [ext[0], ext[1], 0];
            let p1: NumArr3 = [ext[0], ext[3], 0];
            let p2: NumArr3 = [ext[2], ext[3], 0];
            let p3: NumArr3 = [ext[2], ext[1], 0];
            p0 = SRS.transform(SRS.WEB, SRS.ECEF, p0);
            p1 = SRS.transform(SRS.WEB, SRS.ECEF, p1);
            p2 = SRS.transform(SRS.WEB, SRS.ECEF, p2);
            p3 = SRS.transform(SRS.WEB, SRS.ECEF, p3);

            const v0 = vec3_normalize(vec3_fromarray(p0));
            const v1 = vec3_normalize(vec3_fromarray(p1));
            const v2 = vec3_normalize(vec3_fromarray(p2));
            const v3 = vec3_normalize(vec3_fromarray(p3));

            this.normals = [v0, v1, v2, v3];
        }
        return this.normals;
    }

    getTileCorner(): [vec3, vec3, vec3, vec3] {

        if (!this.corners) {
            const ext = this.extent(); // xmin, ymin, xmax, ymax
            let p0: NumArr3 = [ext[0], ext[1], 0]; // lowerleft
            let p1: NumArr3 = [ext[0], ext[3], 0]; // upperleft
            let p2: NumArr3 = [ext[2], ext[3], 0]; // upperright
            let p3: NumArr3 = [ext[2], ext[1], 0]; // lowerright

            p0 = SRS.transform(SRS.WEB, SRS.ECEF, p0);
            p1 = SRS.transform(SRS.WEB, SRS.ECEF, p1);
            p2 = SRS.transform(SRS.WEB, SRS.ECEF, p2);
            p3 = SRS.transform(SRS.WEB, SRS.ECEF, p3);

            this.corners = [
                vec3.fromValues(p0[0], p0[1], p0[2]), // lowerleft
                vec3.fromValues(p1[0], p1[1], p1[2]), // upperleft
                vec3.fromValues(p2[0], p2[1], p2[2]), // upperright
                vec3.fromValues(p3[0], p3[1], p3[2])  // lowerright
            ]
        }
        return this.corners as [vec3, vec3, vec3, vec3];

    }

    tileIsBack(frustum: Frustum | null): boolean {

        if (frustum === null) {
            return true;
        }

        if (frustum.getViewpoint() == null) {
            return true;
        }

        if (this.z <= 5) {
            const [n0, n1, n2, n3] = this.getNormals();
            const [p0, p1, p2, p3] = this.getTileCorner();
            const n4 = this.centerNormal();
            const p4 = this.center();
            const targetpoint = frustum.getTargetpoint() as vec3;
            const viewpoint = frustum.getViewpoint() as vec3;
            const viewline = vec3_normalize(vec3_sub(targetpoint, viewpoint));

            const d0 = vec3_dot(n0, viewline);
            const d1 = vec3_dot(n1, viewline);
            const d2 = vec3_dot(n2, viewline);
            const d3 = vec3_dot(n3, viewline);
            const d4 = vec3_dot(n4, viewline);

            const tileNotBack = d0 <= 0 || d1 <= 0 || d2 <= 0 || d3 <= 0 || d4 <= 0;

            return !tileNotBack;

        } else {
            const [n0, n1, n2, n3] = this.getNormals();
            const [p0, p1, p2, p3] = this.getTileCorner();

            const targetpoint = frustum.getTargetpoint() as vec3;
            const viewpoint = frustum.getViewpoint() as vec3;

            const viewNormalInv = vec3_normalize(vec3_sub(viewpoint, targetpoint));
            const viewScale = vec3_scale(viewNormalInv, 1E5);

            const remoteFrom = vec3_add(viewpoint, viewScale);
            const v0 = vec3_normalize(vec3_sub(p0, remoteFrom));
            const v1 = vec3_normalize(vec3_sub(p1, remoteFrom));
            const v2 = vec3_normalize(vec3_sub(p2, remoteFrom));
            const v3 = vec3_normalize(vec3_sub(p3, remoteFrom));

            const d0 = vec3_dot(v0, n0);
            const d1 = vec3_dot(v1, n1);
            const d2 = vec3_dot(v2, n2);
            const d3 = vec3_dot(v3, n3);

            const tileNotBack = d0 <= 0 || d1 <= 0 || d2 <= 0 || d3 <= 0;

            return !tileNotBack;
        }
    }

    intersectwithFrustumECEF(frustum: Frustum): boolean {

        const ext = this.extent();
        let p0: NumArr3 = [ext[0], ext[1], 0];
        let p1: NumArr3 = [ext[0], ext[3], 0];
        let p2: NumArr3 = [ext[2], ext[1], 0];
        let p3: NumArr3 = [ext[2], ext[3], 0];
        p0 = SRS.transform(SRS.WEB, SRS.WGS84, p0);
        p1 = SRS.transform(SRS.WEB, SRS.WGS84, p1);
        p2 = SRS.transform(SRS.WEB, SRS.WGS84, p2);
        p3 = SRS.transform(SRS.WEB, SRS.WGS84, p3);

        p0 = SRS.transform(SRS.WGS84, SRS.ECEF, p0);
        p1 = SRS.transform(SRS.WGS84, SRS.ECEF, p1);
        p2 = SRS.transform(SRS.WGS84, SRS.ECEF, p2);
        p3 = SRS.transform(SRS.WGS84, SRS.ECEF, p3);

        const vp0 = vec4.fromValues(p0[0]!, p0[1]!, p0[2]!, 1);
        const vp1 = vec4.fromValues(p1[0]!, p1[1]!, p1[2]!, 1);
        const vp2 = vec4.fromValues(p2[0]!, p2[1]!, p2[2]!, 1);
        const vp3 = vec4.fromValues(p3[0]!, p3[1]!, p3[2]!, 1);

        return this.pointInFrustum(vp0, frustum) || this.pointInFrustum(vp1, frustum)
            || this.pointInFrustum(vp2, frustum) || this.pointInFrustum(vp3, frustum);

    }

    intersectFrustum(frustum: Frustum | null): boolean {
        if (frustum === null) {
            return true;
        }
        const points = this.getTileCorner();
        if (points === null) {
            return false;
        }
        //TODO check frustum plane is null
        const leftPlane = new Plane(frustum.left!);
        const rightPlane = new Plane(frustum.right!);
        const bottomPlane = new Plane(frustum.bottom!);
        const topPlane = new Plane(frustum.top!);
        const nearPlane = new Plane(frustum.near!);
        const farPlane = new Plane(frustum.far!);

        const planeList = [leftPlane, rightPlane, bottomPlane, topPlane, nearPlane, farPlane];

        // 所有点都在某平面外部
        for (let plane of planeList) {
            let f = true;
            for (let p of points) {
                if (!pointOutSidePlane(vec3_t4(p), plane)) {
                    f = false;
                    break;
                }
            }
            if (f) {
                return false;
            }
        }

        // 某个点在视锥体内部
        for (let p of points) {
            let f = true;
            for (let plane of planeList) {
                if (pointOutSidePlane(vec3_t4(p), plane)) {
                    f = false;
                    break;
                }
            }
            if (f) {
                return true;
            }
        }

        return true;

    }

    load(): TileStatus {
        if (this.#status === TileStatus.NEW || this.#status === TileStatus.FAILED) {
            this.#status = TileStatus.LOADING;

            //TODO asynd load and toMesh
            loadTileImage(this.url, this.x, this.y, this.z).then(image => {
                this.image = image;
                const data = TileMesher.toMesh(this, this.subdivisionLevel, SRS.ECEF);
                this.mesh = data.vertices;
                this.#status = TileStatus.READY;
            }).catch(e => {
                this.#status = TileStatus.FAILED;
                this.#retryTime++;
                if (this.#retryTime > this.#maxRetryTile) {
                    this.#status = TileStatus.DEAD;
                }
            });
        }
        return this.#status;
    }

    get status(): TileStatus {
        return this.#status;
    }

    get ready(): boolean {
        return this.#status === TileStatus.READY;
    }
}

export class TileMesher {

    static toRootMeshVertex(): Float32Array {

        const vertices: number[] = [];
        const posExt: Extent = [XLIMIT[0], YLIMIT[1], XLIMIT[1], YLIMIT[1]];
        const texExt: Extent = [0, 0, 1, 1];
        this.toRootMeshVertexRec(posExt, texExt, 0, 4, vertices);
        return new Float32Array(vertices);
    }

    static toRootMeshVertexRec(posExt: Extent, texExt: Extent, curlevel: number, level: number, vertices: number[]) {

        if (curlevel == level) {

            vertices.push(posExt[0], posExt[1], texExt[0], texExt[1]);
            vertices.push(posExt[2], posExt[3], texExt[2], texExt[3]);
            vertices.push(posExt[0], posExt[3], texExt[0], texExt[3]);
            vertices.push(posExt[0], posExt[1], texExt[0], texExt[1]);
            vertices.push(posExt[2], posExt[1], texExt[2], texExt[1]);
            vertices.push(posExt[2], posExt[3], texExt[2], texExt[3]);

        } else if (curlevel < level) {
            const newPosExt: Extent = [0, 0, 0, 0];
            const newTexExt: Extent = [0, 0, 0, 0];

            newPosExt[0] = posExt[0];
            newPosExt[1] = posExt[1];
            newPosExt[2] = (posExt[0] + posExt[2]) / 2;
            newPosExt[3] = (posExt[1] + posExt[3]) / 2;

            newTexExt[0] = texExt[0];
            newTexExt[1] = texExt[1];
            newTexExt[2] = (texExt[0] + texExt[2]) / 2;
            newTexExt[3] = (texExt[1] + texExt[3]) / 2;

            this.toRootMeshVertexRec(newPosExt, newTexExt, curlevel + 1, level, vertices);

            newPosExt[0] = (posExt[0] + posExt[2]) / 2;
            newPosExt[1] = posExt[1];
            newPosExt[2] = posExt[2];
            newPosExt[3] = (posExt[1] + posExt[3]) / 2;

            newTexExt[0] = (texExt[0] + texExt[2]) / 2;
            newTexExt[1] = texExt[1];
            newTexExt[2] = texExt[2];
            newTexExt[3] = (texExt[1] + texExt[3]) / 2;

            this.toRootMeshVertexRec(newPosExt, newTexExt, curlevel + 1, level, vertices);

            newPosExt[0] = posExt[0];
            newPosExt[1] = (posExt[1] + posExt[3]) / 2;
            newPosExt[2] = (posExt[0] + posExt[2]) / 2;
            newPosExt[3] = posExt[3];

            newTexExt[0] = texExt[0];
            newTexExt[1] = (texExt[1] + texExt[3]) / 2;
            newTexExt[2] = (texExt[0] + texExt[2]) / 2;
            newTexExt[3] = texExt[3];

            this.toRootMeshVertexRec(newPosExt, newTexExt, curlevel + 1, level, vertices);

            newPosExt[0] = (posExt[0] + posExt[2]) / 2;
            newPosExt[1] = (posExt[1] + posExt[3]) / 2;
            newPosExt[2] = posExt[2];
            newPosExt[3] = posExt[3];

            newTexExt[0] = (texExt[0] + texExt[2]) / 2;
            newTexExt[1] = (texExt[1] + texExt[3]) / 2;
            newTexExt[2] = texExt[2];
            newTexExt[3] = texExt[3];

            this.toRootMeshVertexRec(newPosExt, newTexExt, curlevel + 1, level, vertices);

        }
    }

    static toMesh(tile: Tile, level: number, targetProj: projcode_t) {
        const vertices: number[] = [];
        const posExt: Extent = tile.extent();
        const texExt: Extent = [0, 0, 1, 1];
        this.toMeshRec(posExt, texExt, 0, level, targetProj, vertices);
        return {
            vertices: new Float32Array(vertices),
            texImage: tile.image
        };
    }

    static normalize(x: number, y: number, z: number): NumArr3 {
        let p = vec3.fromValues(x, y, z);
        vec3.normalize(p, p);
        return [p[0], p[1], p[2]];
    }

    static toMeshRec(posExt: Extent, texExt: Extent, curlevel: number, level: number, targetProj: projcode_t, vertices: number[]) {

        if (curlevel == level) {
            let p: NumArr3 = SRS.transform(SRS.WEB, targetProj, [posExt[0], posExt[1], 0]);
            let n: NumArr3 = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[1], n[0], n[1], n[2]);
            p = SRS.transform(SRS.WEB, targetProj, [posExt[2], posExt[3], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[3], n[0], n[1], n[2]);
            p = SRS.transform(SRS.WEB, targetProj, [posExt[0], posExt[3], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[3], n[0], n[1], n[2]);

            p = SRS.transform(SRS.WEB, targetProj, [posExt[0], posExt[1], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[1], n[0], n[1], n[2]);
            p = SRS.transform(SRS.WEB, targetProj, [posExt[2], posExt[1], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[1], n[0], n[1], n[2]);
            p = SRS.transform(SRS.WEB, targetProj, [posExt[2], posExt[3], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[3], n[0], n[1], n[2]);


        } else if (curlevel < level) {
            const newPosExt: Extent = [0, 0, 0, 0];
            const newTexExt: Extent = [0, 0, 0, 0];

            newPosExt[0] = posExt[0];
            newPosExt[1] = posExt[1];
            newPosExt[2] = (posExt[0] + posExt[2]) / 2;
            newPosExt[3] = (posExt[1] + posExt[3]) / 2;

            newTexExt[0] = texExt[0];
            newTexExt[1] = texExt[1];
            newTexExt[2] = (texExt[0] + texExt[2]) / 2;
            newTexExt[3] = (texExt[1] + texExt[3]) / 2;

            this.toMeshRec(newPosExt, newTexExt, curlevel + 1, level, targetProj, vertices);

            newPosExt[0] = (posExt[0] + posExt[2]) / 2;
            newPosExt[1] = posExt[1];
            newPosExt[2] = posExt[2];
            newPosExt[3] = (posExt[1] + posExt[3]) / 2;

            newTexExt[0] = (texExt[0] + texExt[2]) / 2;
            newTexExt[1] = texExt[1];
            newTexExt[2] = texExt[2];
            newTexExt[3] = (texExt[1] + texExt[3]) / 2;

            this.toMeshRec(newPosExt, newTexExt, curlevel + 1, level, targetProj, vertices);

            newPosExt[0] = posExt[0];
            newPosExt[1] = (posExt[1] + posExt[3]) / 2;
            newPosExt[2] = (posExt[0] + posExt[2]) / 2;
            newPosExt[3] = posExt[3];

            newTexExt[0] = texExt[0];
            newTexExt[1] = (texExt[1] + texExt[3]) / 2;
            newTexExt[2] = (texExt[0] + texExt[2]) / 2;
            newTexExt[3] = texExt[3];

            this.toMeshRec(newPosExt, newTexExt, curlevel + 1, level, targetProj, vertices);

            newPosExt[0] = (posExt[0] + posExt[2]) / 2;
            newPosExt[1] = (posExt[1] + posExt[3]) / 2;
            newPosExt[2] = posExt[2];
            newPosExt[3] = posExt[3];

            newTexExt[0] = (texExt[0] + texExt[2]) / 2;
            newTexExt[1] = (texExt[1] + texExt[3]) / 2;
            newTexExt[2] = texExt[2];
            newTexExt[3] = texExt[3];

            this.toMeshRec(newPosExt, newTexExt, curlevel + 1, level, targetProj, vertices);

        }
    }
};