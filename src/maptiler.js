import { glMatrix, vec3, vec4 } from "gl-matrix";
import proj4 from "proj4";
import Frustum from "./frustum.js";
import { Plane, planeCrossPlane, pointOutSidePlane, rayCrossTriangle, Triangle } from "./geometry.js";
import { vec3_add, vec3_normalize, vec3_scale, vec3_sub, vec3_t4 } from "./glmatrix_utils.js";
import { EPSG_3857, EPSG_4326, EPSG_4978 } from "./proj.js";
import { loadTileImage } from "./tileutils.js";
glMatrix.setMatrixArrayType(Array);

const XLIMIT = [-20037508.3427892, 20037508.3427892];
const YLIMIT = [-20037508.3427892, 20037508.3427892];

/**
 * @class Tile
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {Image} image
 * @property {TileProvider} provider
*/
export class Tile {

    x = 0;
    y = 0;
    z = 0;
    urltem = "";
    url = "";
    image = null;
    provider = null;
    /**@type {boolean}*/
    ready = false;
    /**@type {TileMesh|null}*/
    mesh = null;

    extentCache = []; //TODO 缓存extent

    normals = null;

    corners = null;

    constructor(x, y, z, url) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.urltem = url;
        this.url = url.replace("{z}", `${z}`).replace("{x}", `${x}`).replace("{y}", `${y}`);
    }

    supTileAtLevel(level) {
        if (level > this.z) {
            console.error("supTile error");
        }

        let curTile = this;
        while (curTile.z > level) {
            curTile = curTile.supTile();
        }
        return curTile;
    }

    supTile() {
        const newZ = this.z - 1;
        const newX = this.x >> 1;
        const newY = this.y >> 1;
        return new Tile(newX, newY, newZ, this.urltem);
    }

    subTiles() {
        return [
            new Tile(this.x * 2, this.y * 2, this.z + 1, this.urltem),
            new Tile(this.x * 2 + 1, this.y * 2, this.z + 1, this.urltem),
            new Tile(this.x * 2, this.y * 2 + 1, this.z + 1, this.urltem),
            new Tile(this.x * 2 + 1, this.y * 2 + 1, this.z + 1, this.urltem)
        ];
    }

    /**
     * @param {vec4} p
     * @param {vec4} plane
     * @returns {boolean}  
    */
    pointInFrustumPlane(p, plane) {
        if (!plane) {
            return true;
        }
        const v = vec4.dot(p, plane);
        return Math.abs(v) > 0;
    }

    /**
     * @param {math.Matrix} p
     * @param {Frustum} frustum
     * @returns {boolean}  
    */
    pointInFrustum(p, frustum) {

        return this.pointInFrustumPlane(p, frustum.left) &&
            this.pointInFrustumPlane(p, frustum.right) &&
            this.pointInFrustumPlane(p, frustum.bottom) &&
            this.pointInFrustumPlane(p, frustum.top) &&
            this.pointInFrustumPlane(p, frustum.near) &&
            this.pointInFrustumPlane(p, frustum.far);
    }

    getNormals() {
        if (!this.normals) {
            // console.log("CALC");
            const ext = this.extent();
            let p0 = [ext[0], ext[1]];
            let p1 = [ext[0], ext[3]];
            let p2 = [ext[2], ext[1]];
            let p3 = [ext[2], ext[3]];
            p0 = proj4(EPSG_3857, EPSG_4326, p0);
            p1 = proj4(EPSG_3857, EPSG_4326, p1);
            p2 = proj4(EPSG_3857, EPSG_4326, p2);
            p3 = proj4(EPSG_3857, EPSG_4326, p3);

            p0 = proj4(EPSG_4326, EPSG_4978, [...p0, 0]);
            p1 = proj4(EPSG_4326, EPSG_4978, [...p1, 0]);
            p2 = proj4(EPSG_4326, EPSG_4978, [...p2, 0]);
            p3 = proj4(EPSG_4326, EPSG_4978, [...p3, 0]);

            p0 = vec3.fromValues(p0[0], p0[1], p0[2]);
            p1 = vec3.fromValues(p1[0], p1[1], p1[2]);
            p2 = vec3.fromValues(p2[0], p2[1], p2[2]);
            p3 = vec3.fromValues(p3[0], p3[1], p3[2]);

            this.normals = [p0, p1, p2, p3];
        } else {
            // console.log("SKIP");
        }
        return this.normals;
    }

    /**
     * @param {Frustum} frustum
     * @returns {boolean}
    */
    tileIsBack(frustum) {

        if (frustum.getViewpoint() == null) {
            return true;
        }

        const [p0, p1, p2, p3] = this.getNormals();

        if (this.z <= 5) {
            const viewpoint = frustum.getViewpoint();
            const targetpoint = frustum.getTargetpoint();
            const view = vec3_normalize(vec3_sub(targetpoint, viewpoint));
            const np0 = vec3_normalize(p0);
            const np1 = vec3_normalize(p1);
            const np2 = vec3_normalize(p2);
            const np3 = vec3_normalize(p3);

            const d0 = vec3.dot(np0, view);
            const d1 = vec3.dot(np1, view);
            const d2 = vec3.dot(np2, view);
            const d3 = vec3.dot(np3, view);

            return d0 >= 0 && d1 >= 0 && d2 >= 0 && d3 >= 0;
        } else {
            const viewpoint = frustum.getViewpoint();
            const targetpoint = frustum.getTargetpoint();
            const backview = vec3_normalize(vec3_sub(viewpoint, targetpoint));
            const backviewpoint = vec3_add(viewpoint, vec3_scale(backview, 1E5));
            const sp0 = vec3_normalize(p0);
            const sp1 = vec3_normalize(p1);
            const sp2 = vec3_normalize(p2);
            const sp3 = vec3_normalize(p3);

            const vp0 = vec3_sub(backviewpoint, p0);
            const vp1 = vec3_sub(backviewpoint, p1);
            const vp2 = vec3_sub(backviewpoint, p2);
            const vp3 = vec3_sub(backviewpoint, p3);

            const d0 = vec3.dot(sp0, vp0);
            const d1 = vec3.dot(sp1, vp1);
            const d2 = vec3.dot(sp2, vp2);
            const d3 = vec3.dot(sp3, vp3);

            const cp = vec3_add(p0, vec3_add(p1, vec3_add(p2, p3)));
            const cv0 = vec3_normalize(cp)
            const cv1 = vec3_normalize(vec3_sub(backviewpoint, cp));
            const cd = vec3.dot(cv0, cv1);

            return !(d0 >= 0 || d1 >= 0 || d2 >= 0 || d3 >= 0 || cd >= 0);
        }



    }

    intersectwithFrustumECEF(frustum) {

        const ext = this.extent();
        let p0 = [ext[0], ext[1]];
        let p1 = [ext[0], ext[3]];
        let p2 = [ext[2], ext[1]];
        let p3 = [ext[2], ext[3]];
        p0 = proj4(EPSG_3857, EPSG_4326, p0);
        p1 = proj4(EPSG_3857, EPSG_4326, p1);
        p2 = proj4(EPSG_3857, EPSG_4326, p2);
        p3 = proj4(EPSG_3857, EPSG_4326, p3);

        p0 = proj4(EPSG_4326, EPSG_4978, [...p0, 0]);
        p1 = proj4(EPSG_4326, EPSG_4978, [...p1, 0]);
        p2 = proj4(EPSG_4326, EPSG_4978, [...p2, 0]);
        p3 = proj4(EPSG_4326, EPSG_4978, [...p3, 0]);

        const vp0 = vec4.fromValues(p0[0], p0[1], p0[2], 1);
        const vp1 = vec4.fromValues(p1[0], p1[1], p1[2], 1);
        const vp2 = vec4.fromValues(p2[0], p2[1], p2[2], 1);
        const vp3 = vec4.fromValues(p3[0], p3[1], p3[2], 1);

        return this.pointInFrustum(vp0, frustum) || this.pointInFrustum(vp1, frustum)
            || this.pointInFrustum(vp2, frustum) || this.pointInFrustum(vp3, frustum);

    }

    getTileCorner() {

        if (!this.corners) {
            const ext = this.extent();
            let p0 = [ext[0], ext[1]];
            let p1 = [ext[0], ext[3]];
            let p2 = [ext[2], ext[3]];
            let p3 = [ext[2], ext[1]];
            p0 = proj4(EPSG_3857, EPSG_4326, p0);
            p1 = proj4(EPSG_3857, EPSG_4326, p1);
            p2 = proj4(EPSG_3857, EPSG_4326, p2);
            p3 = proj4(EPSG_3857, EPSG_4326, p3);

            p0 = proj4(EPSG_4326, EPSG_4978, [...p0, 0]);
            p1 = proj4(EPSG_4326, EPSG_4978, [...p1, 0]);
            p2 = proj4(EPSG_4326, EPSG_4978, [...p2, 0]);
            p3 = proj4(EPSG_4326, EPSG_4978, [...p3, 0]);

            this.corners = [vec3.fromValues(...p0), vec3.fromValues(...p1), vec3.fromValues(...p2), vec3.fromValues(...p3)]
        }
        return this.corners;;

    }

    /**@param {Frustum} frustum */
    intersectFrustum(frustum) {
        const points = this.getTileCorner();
        const leftPlane = new Plane(frustum.left);
        const rightPlane = new Plane(frustum.right);
        const bottomPlane = new Plane(frustum.bottom);
        const topPlane = new Plane(frustum.top);
        const nearPlane = new Plane(frustum.near);
        const farPlane = new Plane(frustum.far);

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

        // //tile拆成两个三角形
        // const triangle0 = new Triangle(points[0], points[1], points[2]);
        // const triangle1 = new Triangle(points[0], points[2], points[3]);
        // //视锥体边是否穿过三角形
        // const r0 = planeCrossPlane(leftPlane, bottomPlane);
        // const r1 = planeCrossPlane(bottomPlane, rightPlane);
        // const r2 = planeCrossPlane(rightPlane, topPlane);
        // const r3 = planeCrossPlane(leftPlane, topPlane);
        // const ray0 = r0.ray;
        // const ray1 = r1.ray;
        // const ray2 = r2.ray;
        // const ray3 = r3.ray;

        // if (rayCrossTriangle(ray0, triangle0).cross
        //     || rayCrossTriangle(ray1, triangle0).cross
        //     || rayCrossTriangle(ray2, triangle0).cross
        //     || rayCrossTriangle(ray3, triangle0).cross) {
        //     return true;
        // }

        // if (rayCrossTriangle(ray0, triangle1).cross
        //     || rayCrossTriangle(ray1, triangle1).cross
        //     || rayCrossTriangle(ray2, triangle1).cross
        //     || rayCrossTriangle(ray3, triangle1).cross) {
        //     return true;
        // }

        return true;

    }

    /* 注意GOOGLE切片原点视左上角，不是左下角*/
    extent() {
        const dx = (XLIMIT[1] - XLIMIT[0]) / Math.pow(2, this.z);
        const dy = (YLIMIT[1] - YLIMIT[0]) / Math.pow(2, this.z);
        const xmin = XLIMIT[0] + dx * this.x;
        const xmax = XLIMIT[0] + dx * (this.x + 1);
        const ymin = YLIMIT[1] - dy * (this.y + 1);
        const ymax = YLIMIT[1] - dy * (this.y);
        return [xmin, ymin, xmax, ymax];
    }

    async fetchTile() {
        const image = await loadTileImage(this.url, this.x, this.y, this.z);
        this.image = image;
        this.ready = true;
        return this.image;
    }

    center() {
        const ext = this.extent();
        return [(ext[0] + ext[2]) / 2, (ext[1] + ext[3]) / 2];
    }

    async toMesh() {
        await this.fetchTile();
        const data = TileMesher.toMesh(this, 4, EPSG_4978);
        this.mesh = data.vertices;
    }
}

//
export class TileMesher {

    static toMesh(tile, level, targetProj) {
        const vertices = [];
        const posExt = tile.extent();
        const texExt = [0, 0, 1, 1];
        this.toMeshRec(posExt, texExt, 0, level, targetProj, vertices);
        return {
            vertices: new Float32Array(vertices),
            texImage: tile.image
        };
    }

    static normalize(x, y, z) {
        let p = vec3.fromValues(x, y, z);
        vec3.normalize(p, p);
        return [p[0], p[1], p[2]];
    }

    static toMeshRec(posExt, texExt, curlevel, level, targetProj, vertices) {

        if (curlevel == level) {
            let p = proj4(EPSG_3857, targetProj, [posExt[0], posExt[1], 0]);
            let n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[1], n[0], n[1], n[2]);
            p = proj4(EPSG_3857, targetProj, [posExt[2], posExt[3], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[3], n[0], n[1], n[2]);
            p = proj4(EPSG_3857, targetProj, [posExt[0], posExt[3], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[3], n[0], n[1], n[2]);

            p = proj4(EPSG_3857, targetProj, [posExt[0], posExt[1], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[0], texExt[1], n[0], n[1], n[2]);
            p = proj4(EPSG_3857, targetProj, [posExt[2], posExt[1], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[1], n[0], n[1], n[2]);
            p = proj4(EPSG_3857, targetProj, [posExt[2], posExt[3], 0]);
            n = this.normalize(p[0], p[1], p[2]);
            vertices.push(p[0], p[1], p[2], texExt[2], texExt[3], n[0], n[1], n[2]);


        } else if (curlevel < level) {
            const newPosExt = [];
            const newTexExt = [];

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