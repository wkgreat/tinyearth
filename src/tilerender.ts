import { mat4, vec3, vec4 } from "gl-matrix";
import proj4 from "proj4";
import Camera from "./camera.js";
import type { NumArr3 } from "./defines.js";
import { TinyEarthEvent } from "./event.js";
import Frustum from "./frustum.js";
import { vec3_t4, vec4_affine } from "./glmatrix_utils.js";
import { GLSLSource } from "./glsl.js";
import { Tile, TileStatus } from "./maptiler.js";
import { Program, type ProgramOptions } from "./program.js";
import { EARTH_RADIUS, EPSG_3857, EPSG_4326, EPSG_4978 } from "./proj.js";
import type Scene from "./scene.js";
import tileFragSource from "./shader/tile.frag";
import tileVertSource from "./shader/tile.vert";
import { type TileSourceInfo, type TileURL } from "./tilesource.js";
import TinyEarth from "./tinyearth.js";

const DefaultTileSize: number = 256;

interface GlobeTileProgramBufferInfo {
    vertices?: WebGLBuffer,
    texture?: WebGLTexture
}

interface GlobeTileProgramOptions extends Omit<ProgramOptions, 'vertSource' | 'fragSource'> {}

export class GlobeTileProgram extends Program {

    buffers: GlobeTileProgramBufferInfo = {};

    numElements: number = 0;

    tileProviders: TileProvider[] = [];

    constructor(options: GlobeTileProgramOptions) {

        const vertGLSLSource = new GLSLSource(tileVertSource);
        const fragGLSLSource = new GLSLSource(tileFragSource, { DEBUG_DEPTH: false });

        super({
            ...options, vertSource: vertGLSLSource, fragSource: fragGLSLSource
        });

        this.createBuffer();
    }

    existTileProvider(tileProvider: TileProvider): boolean {
        return this.tileProviders.filter(p => p === tileProvider).length > 0;
    }

    addTileProvider(tileProvider: TileProvider) {
        this.tileProviders.push(tileProvider);
    }

    removeTileProvider(tileProvider: TileProvider) {
        this.tileProviders = this.tileProviders.filter(p => p !== tileProvider);
    }

    createBuffer() {
        if (this.gl) {
            this.buffers.vertices = this.gl.createBuffer();
            this.buffers.texture = this.gl.createTexture();
        }
    }

    setUniform3f(name: string, v0: number, v1: number, v2: number) {
        if (this.gl && this.program) {
            this.gl.useProgram(this.program);
            this.gl.uniform3f(this.gl.getUniformLocation(this.program, name), v0, v1, v2);
        }

    }
    setUniform4f(name: string, v0: number, v1: number, v2: number, v3: number) {
        if (this.gl && this.program) {
            this.gl.useProgram(this.program);
            this.gl.uniform4f(this.gl.getUniformLocation(this.program, name), v0, v1, v2, v3);
        }
    }
    setUniform1f(name: string, v: number) {
        if (this.gl && this.program) {
            this.gl.useProgram(this.program);
            this.gl.uniform1f(this.gl.getUniformLocation(this.program, name), v);
        }
    }

    setMaterial() {
        if (this.gl && this.program) {
            this.gl.useProgram(this.program);
            this.setUniform4f("material.ambient", 0.1, 0.1, 0.1, 1.0);
            this.setUniform4f("material.diffuse", 1.0, 1.0, 1.0, 1.0);
            this.setUniform4f("material.specular", 1.0, 1.0, 1.0, 1.0);
            this.setUniform4f("material.emission", 0.0, 0.0, 0.0, 1.0);
            this.setUniform1f("material.shininess", 1000);
        }
    }

    refreshUniforms(scene: Scene) {
        if (this.gl && this.program) {
            this.gl.useProgram(this.program);
            this.setCameraUniform();
            this.setProjectionUniform();
            this.setSunUniform();
        }
    }

    setVerticeData(verticeData: Float32Array) {
        if (this.gl && this.buffers.vertices) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.vertices);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, verticeData, this.gl.STATIC_DRAW);
            this.numElements = verticeData.length;
        }
    }

    createVertexBufferAndSetData(verticeData: Float32Array): WebGLBuffer | null {
        if (this.gl) {
            const buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, verticeData, this.gl.STATIC_DRAW);
            this.numElements = verticeData.length;
            return buffer;
        } else {
            return null;
        }
    }

    createTextureAndSetData(textureData: HTMLImageElement): WebGLTexture | null {
        if (this.gl) {
            const texture = this.gl.createTexture();
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            //设置纹理参数
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
            //纹理数据
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, textureData);

            return texture;
        } else {
            return null;
        }

    }

    setData(verticeData: Float32Array, textureData: HTMLImageElement) {

        if (this.gl && this.buffers.vertices && this.buffers.texture) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers["vertices"]);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, verticeData, this.gl.STATIC_DRAW);
            this.numElements = verticeData.length;

            this.gl.bindTexture(this.gl.TEXTURE_2D, this.buffers["texture"]);
            //设置纹理参数
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
            //纹理数据
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, textureData);
        }
    }

    /**
     * @param {TileNode} node
     * @param {mat4} modelMtx
     * @param {Camera} camera
     * @param {mat4} projMtx       
    */
    drawTileNode(node: TileNode, modelMtx: mat4, camera: Camera, projMtx: mat4, opacity: number = 1.0, isNight: boolean = false) {

        if (this.gl && this.program && node.tile && node.tile.ready) {
            this.gl.useProgram(this.program);

            if (node.vertexBuffer) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, node.vertexBuffer);
                this.numElements = node.tile.mesh!.length;
            } else {
                node.vertexBuffer = this.createVertexBufferAndSetData(node.tile.mesh!);
            }

            if (node.texture) {
                this.gl.bindTexture(this.gl.TEXTURE_2D, node.texture);
            } else {
                node.texture = this.createTextureAndSetData(node.tile.image!);
            }

            this.gl.vertexAttribPointer(this.gl.getAttribLocation(this.program, "a_position"), 3, this.gl.FLOAT, false, (3 + 2 + 3) * 4, 0); // 设置属性指针
            this.gl.enableVertexAttribArray(this.gl.getAttribLocation(this.program, "a_position")); // 激活属性

            this.gl.vertexAttribPointer(this.gl.getAttribLocation(this.program, "a_texcoord"), 2, this.gl.FLOAT, false, (3 + 2 + 3) * 4, 3 * 4); // 设置属性指针
            this.gl.enableVertexAttribArray(this.gl.getAttribLocation(this.program, "a_texcoord")); // 激活属性

            this.gl.vertexAttribPointer(this.gl.getAttribLocation(this.program, "a_normal"), 3, this.gl.FLOAT, false, (3 + 2 + 3) * 4, (3 + 2) * 4); // 设置属性指针
            this.gl.enableVertexAttribArray(this.gl.getAttribLocation(this.program, "a_normal")); // 激活属性

            this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "u_modelMtx"), false, modelMtx);
            this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "u_viewMtx"), false, camera.viewMatrix);
            this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "u_projMtx"), false, projMtx);

            this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_opacity"), opacity);
            this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_isNight"), isNight ? 1 : 0);

            this.gl.drawArrays(this.gl.TRIANGLES, 0, this.numElements / 8);
        }
    }

    draw(): void {
        this.render();
    }

    render() {
        if (this.gl && this.program) {
            this.gl.useProgram(this.program);

            this.refreshUniforms(this.tinyearth.scene);

            this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_enableNight"), this.tinyearth.night ? 1 : 0);

            const that = this;

            const modelMtx = mat4.create(); //TODO move to other place

            for (let provider of this.tileProviders) {
                if (provider.isStop()) {
                    continue;
                }
                if (provider.night && !this.tinyearth.night) {
                    continue;
                }

                provider.frustum = this.tinyearth.scene!.frustum;
                const level = provider.curlevel;
                provider.tiletree.dynamicLevelProvide(level, this.tinyearth.scene, (node) => {
                    if (node && node.tile && node.tile.ready) {
                        that.drawTileNode(node, modelMtx, this.tinyearth.scene.camera, this.tinyearth.scene.projection.perspectiveMatrix, provider.getOpacity(), provider.night);
                    }
                })
            }
        }
    }

    setFrustum(frustum: Frustum) {
        for (let provider of this.tileProviders) {
            provider.setFrustum(frustum);
        }
    }
}

interface TileNodeKey {
    x: number
    y: number
    z: number
}

export class TileNode {

    #key: TileNodeKey;

    #tile: Tile;

    #vertexBuffer: WebGLBuffer | null = null;

    #texture: WebGLTexture | null = null;

    #children: TileNode[] = [];

    constructor(url: TileURL, z: number, x: number, y: number) {
        this.#key = { z, x, y };
        this.#tile = new Tile(url, x, y, z);
        this.#children = [];
    }

    get key(): TileNodeKey {
        return { ...this.#key };
    }

    get tile(): Tile {
        return this.#tile;
    }

    set tile(tile: Tile) {
        this.#tile = tile;
        // TODO need refresh texture.
    }

    set vertexBuffer(buffer: WebGLBuffer | null) {
        this.#vertexBuffer = buffer;
    }

    get vertexBuffer(): WebGLBuffer | null {
        return this.#vertexBuffer;
    }

    set texture(t: WebGLTexture | null) {
        this.#texture = t;
    }

    get texture(): WebGLTexture | null {
        return this.#texture;
    }

    get children(): TileNode[] {
        return this.#children;
    }

    get ready(): boolean {
        return this.#tile?.ready ?? false;
    }
}

type TileNodeCallback = (node: TileNode) => void;

enum TileNodeOmitStatus {
    OMIT = "OMIT"
}

type TileNodeStatus = TileStatus | TileNodeOmitStatus;

/**
 * Tile Tree
*/
export class TileTree {

    //TODO or directly use Map<key,node> for tile tree instead?

    root: TileNode;
    source: TileSourceInfo;
    #startRecLevel: number = 2;
    frustum: Frustum | null = null;

    constructor(source: TileSourceInfo) {
        this.source = source;
        this.root = new TileNode(this.source.url, 0, 0, 0);
    }

    addTile(tile: Tile): TileNode | null {
        const node = this.#addTileRec(this.root, tile);
        return node;
    }

    #addTileRec(curNode: TileNode, tile: Tile): TileNode | null {
        if (tile.z === curNode.key.z) {
            if (tile.x === curNode.key.x && tile.y === curNode.key.y) {
                curNode.tile = tile;
                return curNode;
            } else {
                return null;
            }
        } else if (curNode.key.z < tile.z) {

            const dz = tile.z - curNode.key.z;
            const px = tile.x >> dz;
            const py = tile.y >> dz;

            if (px !== curNode.key.x || py !== curNode.key.y) {
                return null;
            }

            if (curNode.children.length === 0) {

                const cz = curNode.key.z;
                const cx = curNode.key.x;
                const cy = curNode.key.y;

                curNode.children.push(new TileNode(this.source.url, cz + 1, cx << 1, cy << 1));
                curNode.children.push(new TileNode(this.source.url, cz + 1, cx << 1 | 1, cy << 1));
                curNode.children.push(new TileNode(this.source.url, cz + 1, cx << 1, cy << 1 | 1));
                curNode.children.push(new TileNode(this.source.url, cz + 1, cx << 1 | 1, cy << 1 | 1));

            }

            let r: TileNode | null = null;

            for (let node of curNode.children) {
                const thenode = this.#addTileRec(node, tile);
                if (thenode !== null) {
                    r = thenode;
                }
            }

            return r;

        } else {
            console.error("should not be here.");
            return null;
        }
    }

    forEachNode(callback: TileNodeCallback) {
        this.#forEachNode(this.root, callback);
    }

    #forEachNode(curNode: TileNode, callback: TileNodeCallback) {
        if (curNode) {
            callback(curNode);
        }
        for (let node of curNode.children) {
            this.#forEachNode(node, callback);
        }
    }

    getTileNode(z: number, x: number, y: number): TileNode | null {

        return this.#getTileNodeRec(this.root, z, x, y);

    }

    #getTileNodeRec(curnode: TileNode | null, z: number, x: number, y: number): TileNode | null {
        if (curnode == null) {
            return null;
        } else if (curnode.key.z > z) {
            return null;
        } else if (curnode.key.z === z) {
            if (curnode.key.x === x && curnode.key.y === y) {
                return curnode;
            } else {
                return null;
            }
        } else {
            const px = x >> (z - curnode.key.z);
            const py = y >> (z - curnode.key.z);
            if (curnode.key.x !== px || curnode.key.y !== py) {
                return null;
            } else {
                const children = curnode.children;
                if (!children) {
                    return null;
                }
                let c0 = this.#getTileNodeRec(children[0]!, z, x, y);
                if (c0 !== null) {
                    return c0;
                }
                let c1 = this.#getTileNodeRec(children[1]!, z, x, y);
                if (c1 !== null) {
                    return c1;
                }
                let c2 = this.#getTileNodeRec(children[2]!, z, x, y);
                if (c2 !== null) {
                    return c2;
                }
                let c3 = this.#getTileNodeRec(children[3]!, z, x, y);
                if (c3 !== null) {
                    return c3;
                }
                return null;
            }
        }
    }

    fixedLevelProvide(level: number, frustum: Frustum, callback: TileNodeCallback) {
        this.#fixedLevelProvideRec(this.root, level, frustum, callback);
    }

    #fixedLevelProvideRec(node: TileNode, level: number, frustum: Frustum, callback: TileNodeCallback): TileNodeStatus {


        if (node.key.z > level) {
            return TileNodeOmitStatus.OMIT;
        }

        if (node.key.z > this.#startRecLevel && (!node.tile.intersectFrustum(frustum)) || (node.key.z > this.#startRecLevel && node.tile.tileIsBack(frustum))) {
            return TileNodeOmitStatus.OMIT;
        }

        let status: TileNodeStatus = TileNodeOmitStatus.OMIT;

        if (node.key.z === level) {

            status = node.tile.load();
            if (status === TileStatus.READY) {
                callback(node);
            }

        } else if (node.key.z < level) {

            if (node.children.length === 0) {
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1, node.key.y << 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1 | 1, node.key.y << 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1, node.key.y << 1 | 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1 | 1, node.key.y << 1 | 1));
            }

            const childrenStatus = node.children.map(child => this.#fixedLevelProvideRec(child, level, frustum, callback));

            if (this.#needInternalNodeRender(childrenStatus)) {
                status = node.tile.load();
                if (status === TileStatus.READY) {
                    callback(node);
                }
            } else {
                status = TileStatus.READY;
            }
        }

        return status;
    }


    #vec4_dist2d(v0: vec4, v1: vec4): number {

        return Math.sqrt(Math.pow(v1[0] - v0[0], 2) + Math.pow(v1[1] - v0[1], 2));

    }

    getTileResolution(scene: Scene, tile: Tile): number {

        const corners = tile.getTileCorner();
        const m = scene.worldToScreenMatrix;

        let p0 = vec3_t4(corners[0]);
        let p1 = vec3_t4(corners[1]);
        let p2 = vec3_t4(corners[2]);
        let p3 = vec3_t4(corners[3]);

        p0 = vec4_affine(p0, m);
        p1 = vec4_affine(p1, m);
        p2 = vec4_affine(p2, m);
        p3 = vec4_affine(p3, m);

        const r0 = this.#vec4_dist2d(p0, p1) / DefaultTileSize;
        const r1 = this.#vec4_dist2d(p0, p1) / DefaultTileSize;
        const r2 = this.#vec4_dist2d(p0, p1) / DefaultTileSize;
        const r3 = this.#vec4_dist2d(p0, p1) / DefaultTileSize;

        const mr = (r0 + r1 + r2 + r3) / 4.0;

        return mr;
    }

    #pointOnTile(p: vec3, tile: Tile): boolean {

        const [xmin, ymin, xmax, ymax] = tile.extent(); //xmin, ymin, xmax, ymax
        const p4326 = proj4(EPSG_4978, EPSG_4326, [p[0], p[1], p[2]]) as NumArr3;
        const p3857 = proj4(EPSG_4326, EPSG_3857, [p4326[0], p4326[1], p4326[2]]) as NumArr3;

        if (p3857[0] >= xmin && p3857[0] <= xmax && p3857[1] >= ymin && p3857[2] <= ymax) {
            return true;
        } else {
            return false;
        }

    }

    dynamicLevelProvide(level: number, scene: Scene, callback: TileNodeCallback) {
        this.#dynamicLevelProvideRec(this.root, level, scene, callback);
    }

    #dynamicLevelProvideRec(node: TileNode, level: number, scene: Scene, callback: TileNodeCallback): TileNodeStatus {

        if (node.key.z > level) {
            return TileNodeOmitStatus.OMIT;
        }

        if (node.key.z > this.#startRecLevel) {
            if (!node.tile.intersectFrustum(scene.frustum)) {
                return TileNodeOmitStatus.OMIT;
            }

            const cameraDeviate = scene.camera.getCameraDeviate();

            if (cameraDeviate > 0.5 && node.tile.tileIsBack(scene.frustum)) {
                return TileNodeOmitStatus.OMIT;
            }

        }

        let status: TileNodeStatus = TileNodeOmitStatus.OMIT;

        const tileRes = this.getTileResolution(scene, node.tile);

        if ((node.key.z > 3 && tileRes <= 0.8) || node.key.z === level) {

            status = node.tile.load();
            if (status === TileStatus.READY) {
                callback(node);
            }

        } else if (node.key.z < level) {

            if (node.children.length === 0) {
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1, node.key.y << 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1 | 1, node.key.y << 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1, node.key.y << 1 | 1));
                node.children.push(new TileNode(this.source.url, node.key.z + 1, node.key.x << 1 | 1, node.key.y << 1 | 1));
            }

            const childrenStatus = node.children.map(child => this.#dynamicLevelProvideRec(child, level, scene, callback));

            if (this.#needInternalNodeRender(childrenStatus)) {
                status = node.tile.load();
                if (status === TileStatus.READY) {
                    callback(node);
                }
            } else {
                status = TileStatus.READY;
            }
        }

        return status;
    }

    // NEW LAOADING FAILED DEAD [READY OMIT]
    #needInternalNodeRender(status: TileNodeStatus[]): boolean {
        return !status.every(s => s === TileStatus.READY || s === TileNodeOmitStatus.OMIT);
    }



    vaccum() {
        //TODO 定期清理不用的tile
    }

}

type TileProviderCameraCallback = (info: { camera: Camera; type?: string }) => void


export class TileProvider {

    tinyearth: TinyEarth;

    source: TileSourceInfo;

    #curlevel: number = 0;

    tiletree: TileTree;

    #stop: boolean = false;

    frustum: Frustum | null = null;

    #cameraCallback: TileProviderCameraCallback = (info) => {
        if (info.camera === null || info.camera !== this.tinyearth.scene.camera) {
            return;
        }
        const level = this.tileLevelWithCamera(info.camera);
        this.#curlevel = level;
    };

    opacity: number = 1.0;

    constructor(source: TileSourceInfo, tinyearth: TinyEarth) {
        this.tinyearth = tinyearth;
        this.source = source;
        this.tiletree = new TileTree(source);
        this.#cameraCallback({ camera: this.tinyearth.scene.camera });
        this.tinyearth.eventBus.addEventListener(TinyEarthEvent.CAMERA_CHANGE, {
            callback: this.#cameraCallback
        });
    }

    get night(): boolean {
        return this.source.night ?? false;
    }

    set night(b: boolean | undefined | null) {
        this.source.night = b ?? false;

    }

    changeTileSource(source: TileSourceInfo) {
        this.source = source;
        const that = this;
        if (this.tiletree) {
            this.tiletree.forEachNode(node => {
                node.tile = new Tile(source.url, node.key.x, node.key.y, node.key.z);
                if (node.texture) {
                    that.tinyearth.gl!.deleteTexture(node.texture);
                    node.texture = null;
                }
                if (node.vertexBuffer) {
                    that.tinyearth.gl!.deleteBuffer(node.vertexBuffer);
                    node.vertexBuffer = null;
                }
            });
        }
        this.curlevel = this.tileLevel();
        this.tiletree = new TileTree(source);
    }

    setFrustum(frustum: Frustum) {
        this.frustum = frustum;
    }

    setOpacity(opacity: number) {
        this.opacity = opacity;
    }

    getOpacity(): number {
        return this.opacity;
    }

    stop() {
        this.#stop = true;
    }

    start() {
        this.#stop = false;
    }

    isStop(): boolean {
        return this.#stop;
    }

    get curlevel() {
        return this.#curlevel;
    }

    set curlevel(level) {
        this.#curlevel = level;
    }

    tileLevel() {
        const camera = this.tinyearth.scene.camera;
        if (camera) {
            return this.tileLevelWithCamera(camera);
        } else {
            return this.source.minLevel;
        }
    }

    tileLevelWithCamera(camera: Camera) {
        const tileSize = 256;
        const from = camera.from
        let pos: NumArr3 = proj4(EPSG_4978, EPSG_4326, [from[0], from[1], from[2]]);
        let height = pos[2];
        const initialResolution = 2 * Math.PI * EARTH_RADIUS / tileSize;
        const groundResolution = height * 2 / tileSize;
        const zoom = Math.log2(initialResolution / groundResolution) + 1;
        return Math.min(Math.max(Math.ceil(zoom), this.source.minLevel), this.source.maxLevel);
    }

}

