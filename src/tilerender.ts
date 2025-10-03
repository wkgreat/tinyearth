import { mat4, vec4 } from "gl-matrix";
import proj4 from "proj4";
import Camera from "./camera.js";
import { Tile } from "./maptiler.js";
import { EARTH_RADIUS, EPSG_4326, EPSG_4978 } from "./proj.js";
import tileFragSource from "./tile.frag";
import tileVertSource from "./tile.vert";
import Frustum, { buildFrustum } from "./frustum.js";
import TinyEarth from "./tinyearth.js";
import { createHelperDiv } from "./helpers/helper.js";
import type { xyzObject } from "./sun.js";
import type { NumArr3 } from "./defines.js";

export interface TileSourceInfo {
    name: string
    url: string
    minLevel: number
    maxLevel: number
    night?: boolean
}

export class TileResources {

    static GOOGLE_IMAGERY: TileSourceInfo = {
        name: "Google Imagery",
        url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        minLevel: 1,
        maxLevel: 20
    }
    static ESRI_IMAGERY: TileSourceInfo = {
        name: "ESRI Imagery",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        minLevel: 1,
        maxLevel: 20
    }
    static ESRI_TOPO: TileSourceInfo = {
        name: "ESRI TOPO",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        minLevel: 1,
        maxLevel: 20
    }
    static OSM: TileSourceInfo = {
        name: "OSM",
        url: "http://tile.openstreetmap.org/{z}/{x}/{y}.png",
        minLevel: 1,
        maxLevel: 20
    }
    static CARDODB_LIGHT_ALL: TileSourceInfo = {
        name: "CARDODB LIGHT ALL",
        url: "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        minLevel: 1,
        maxLevel: 20
    }
    static CARDODB_DARK_ALL: TileSourceInfo = {
        name: "CARDODB DARK ALL",
        url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        minLevel: 1,
        maxLevel: 20
    }
}

interface GlobeTileProgramBufferInfo {
    vertices?: WebGLBuffer,
    texture?: WebGLTexture
}

export class GlobeTileProgram {

    gl: WebGLRenderingContext | null = null;

    tinyearth: TinyEarth;

    program: WebGLProgram | null = null;

    buffers: GlobeTileProgramBufferInfo = {};

    numElements: number = 0;

    tileProviders: TileProvider[] = [];

    constructor(tinyearth: TinyEarth) {
        this.tinyearth = tinyearth;
        this.gl = this.tinyearth.gl;
        this.program = this.createTileProgram();
        this.createBuffer();
    }

    addTileProvider(tileProvider: TileProvider) {
        this.tileProviders.push(tileProvider);
    }

    createTileProgram(): WebGLProgram | null {

        if (this.gl === null) {
            return null;
        }
        /* 创建程序 */
        const program = this.gl.createProgram();

        let success;

        /* 程序加载着色器 */
        const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        if (vertShader === null) {
            console.error("vertShader is null");
            return null;
        }
        this.gl.shaderSource(vertShader, tileVertSource);
        this.gl.compileShader(vertShader);
        this.gl.attachShader(program, vertShader);

        success = this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS);
        if (!success) {
            const error = this.gl.getShaderInfoLog(vertShader);
            console.error('vertShader编译失败: ', error);
        }

        const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        if (fragShader === null) {
            console.error("fragShader is null");
            return null;
        }
        this.gl.shaderSource(fragShader, tileFragSource);
        this.gl.compileShader(fragShader);
        this.gl.attachShader(program, fragShader);

        success = this.gl.getShaderParameter(fragShader, this.gl.COMPILE_STATUS);
        if (!success) {
            const error = this.gl.getShaderInfoLog(fragShader);
            console.error('fragShader编译失败: ', error);
        }

        this.gl.linkProgram(program);

        success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
        if (!success) {
            const error = this.gl.getProgramInfoLog(program);
            console.error('program 连接失败失败: ', error);
        }

        if (!program) {
            console.error("program is null");
        }

        this.program = program;
        return program;

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

    setMaterial(sunPos: xyzObject, camera: Camera) {
        if (this.gl && this.program) {
            const from = camera.getFrom();
            this.gl.useProgram(this.program);
            this.setUniform3f("light.position", sunPos.x, sunPos.y, sunPos.z);
            this.setUniform4f("light.color", 1.0, 1.0, 1.0, 1.0);
            this.setUniform3f("camera.position", from[0], from[1], from[2]);
            this.setUniform4f("material.ambient", 0.1, 0.1, 0.1, 1.0);
            this.setUniform4f("material.diffuse", 1.0, 1.0, 1.0, 1.0);
            this.setUniform4f("material.specular", 1.0, 1.0, 1.0, 1.0);
            this.setUniform4f("material.emission", 0.0, 0.0, 0.0, 1.0);
            this.setUniform1f("material.shininess", 1000);
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
            this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "u_viewMtx"), false, camera.getMatrix().viewMtx);
            this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, "u_projMtx"), false, projMtx);

            this.gl.uniform1f(this.gl.getUniformLocation(this.program, "u_opacity"), opacity);
            this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_isNight"), isNight ? 1 : 0);

            this.gl.drawArrays(this.gl.TRIANGLES, 0, this.numElements / 8);
        }
    }

    render(modelMtx: mat4, camera: Camera, projMtx: mat4) {
        if (this.gl && this.program) {
            this.gl.useProgram(this.program);
            this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_enableNight"), this.tinyearth.night ? 1 : 0);
            const that = this;
            for (let provider of this.tileProviders) {
                if (provider.getIsNight() && !this.tinyearth.night) {
                    continue;
                }
                provider.frustum = this.tinyearth.scene!.getFrustum();
                provider.tiletree.fetchOrCreateTileNodesToLevel(provider.curlevel, provider.frustum, !provider.isStop(), async (node) => {
                    if (node && node.tile && node.tile.ready) {
                        that.drawTileNode(node, modelMtx, camera, projMtx, provider.getOpacity(), provider.getIsNight());
                    }
                });
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

    key: TileNodeKey = { z: 0, x: 0, y: 0 };

    tile: Tile | null = null;

    vertexBuffer: WebGLBuffer | null = null; //

    texture: WebGLTexture | null = null;

    children: TileNode[] = [];

    /**@param {Tile} tile */
    static createTileNode(tile: Tile): TileNode {
        const node = new TileNode();
        node.key = { x: tile.x, y: tile.y, z: tile.z };
        node.tile = tile;
        node.children = [];
        return node;
    }
    static createEmptyTileNode(z: number, x: number, y: number): TileNode {
        const node = new TileNode();
        node.key = { z, x, y };
        node.tile = null;
        node.children = [];
        return node;
    }

}

type TileNodeCallback = (node: TileNode) => void;

export class TileTree {

    root: TileNode = TileNode.createEmptyTileNode(0, 0, 0);
    url: string = "";
    #startRecLevel: number = 2;
    frustum: Frustum | null = null;

    constructor(url: string) {
        this.url = url;
    }

    addTile(tile: Tile) {
        this.#addTileRec(this.root, tile);
    }

    #addTileRec(curNode: TileNode, tile: Tile) {
        if (tile.z === curNode.key.z) {
            if (tile.x === curNode.key.x && tile.y === curNode.key.y) {
                curNode.tile = tile;
            } else {
                return;
            }
        } else if (curNode.key.z < tile.z) {

            const dz = tile.z - curNode.key.z;
            const px = tile.x >> dz;
            const py = tile.y >> dz;

            if (px !== curNode.key.x || py !== curNode.key.y) {
                return;
            }

            if (curNode.children === null) {
                curNode.children = [];
            }

            if (curNode.children.length === 0) {

                const cz = curNode.key.z;
                const cx = curNode.key.x;
                const cy = curNode.key.y;

                curNode.children.push(TileNode.createEmptyTileNode(cz + 1, cx << 1, cy << 1));
                curNode.children.push(TileNode.createEmptyTileNode(cz + 1, cx << 1 | 1, cy << 1));
                curNode.children.push(TileNode.createEmptyTileNode(cz + 1, cx << 1, cy << 1 | 1));
                curNode.children.push(TileNode.createEmptyTileNode(cz + 1, cx << 1 | 1, cy << 1 | 1));

            }

            for (let node of curNode.children) {
                this.#addTileRec(node, tile);
            }

        } else {
            console.error("should not be here.");
            return;
        }
    }

    //TODO 根据视锥体剪枝
    forEachTileNodesOfLevel(z: number, callback: TileNodeCallback) {
        this.#forEachTileNodesOfLevel(this.root, z, callback);
    }

    #forEachTileNodesOfLevel(curNode: TileNode, z: number, callback: TileNodeCallback) {
        if (z === curNode.key.z) {
            callback(curNode);
        } else if (curNode.key.z < z) {
            for (let node of curNode.children) {
                let tile = null;
                if (node.key.z >= 6) {
                    tile = node.tile;
                    if (!tile) {
                        tile = new Tile(node.key.x, node.key.y, node.key.z, "");
                    }
                    if (!tile.intersectFrustum(this.frustum) || tile.tileIsBack(this.frustum)) {
                        continue;
                    }
                }
                this.#forEachTileNodesOfLevel(node, z, callback);
            }
        } else {
            console.error("should not be here.");
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

    fetchOrCreateTileNodesToLevel(z: number, frustum: Frustum, create: boolean, callback: TileNodeCallback) {

        if (z <= this.#startRecLevel) {
            const nrows = Math.pow(2, z);
            const ncols = Math.pow(2, z);
            for (let i = 0; i < ncols; ++i) {
                for (let j = 0; j < nrows; ++j) {
                    let node = this.getTileNode(z, i, j);
                    if (!create && (node === null || node.tile === null)) { continue; }
                    if (node === null) {
                        const tile = new Tile(i, j, z, this.url);
                        tile.toMesh();
                        this.addTile(tile);
                        node = this.getTileNode(z, i, j);
                    } else if (node.tile === null) {
                        const tile = new Tile(i, j, z, this.url);
                        tile.toMesh();
                        node.tile = tile;
                    }
                    if (node) {
                        callback(node);
                    }
                }
            }
        } else {

            this.#fetchOrCreateTileNodesToLevelRec(this.root, z, frustum, create, callback);

        }

    }

    #fetchOrCreateTileNodesToLevelRec(curNode: TileNode | null, z: number, frustum: Frustum, create: boolean, callback: TileNodeCallback) {

        if (curNode === null) {
            return;
        }

        if (curNode.tile === null) {
            if (create) {
                curNode.tile = new Tile(curNode.key.x, curNode.key.y, curNode.key.z, this.url);
                curNode.tile.toMesh();
            }
        }

        if (curNode.tile != null) {
            if ((!curNode.tile.intersectFrustum(frustum)) || (curNode.key.z > this.#startRecLevel && curNode.tile.tileIsBack(frustum))) {
                return;
            }
        }

        if (curNode.key.z === z) {
            callback(curNode);
        } else if (curNode.key.z <= z) {
            if (curNode.children.length === 0) {
                curNode.children.push(TileNode.createEmptyTileNode(curNode.key.z + 1, curNode.key.x << 1, curNode.key.y << 1));
                curNode.children.push(TileNode.createEmptyTileNode(curNode.key.z + 1, curNode.key.x << 1 | 1, curNode.key.y << 1));
                curNode.children.push(TileNode.createEmptyTileNode(curNode.key.z + 1, curNode.key.x << 1, curNode.key.y << 1 | 1));
                curNode.children.push(TileNode.createEmptyTileNode(curNode.key.z + 1, curNode.key.x << 1 | 1, curNode.key.y << 1 | 1));
            }
            for (let node of curNode.children) {
                this.#fetchOrCreateTileNodesToLevelRec(node, z, frustum, create, callback);
            }
        } else {
            console.warn("should not be here!");
        }
    }

    vaccum() {
        //TODO 定期清理不用的tile
    }

}

type TileProviderCallback = (camera: Camera | null, info?: any) => void;


export class TileProvider {

    tinyearth: TinyEarth;

    url: string = "";

    camera: Camera | null = null;

    curlevel: number = 0;

    tiletree: TileTree;

    #stop: boolean = false;

    frustum: Frustum | null = null;

    callback: TileProviderCallback | null = null;

    opacity: number = 1.0;

    minLevel: number = 2;

    maxLevel: number = 20;

    #isNight: boolean = false;

    constructor(url: string, tinyearth: TinyEarth) {
        this.tinyearth = tinyearth;
        this.url = url;
        this.tiletree = new TileTree(this.url);
        this.camera = tinyearth.scene!.getCamera()
        this.callback = this.provideCallbackGen();
        this.callback(this.camera);
        this.camera.addOnchangeEeventListener(this.callback);
    }

    setMinLevel(level: number) {
        this.minLevel = level;
    }

    setMaxLevel(level: number) {
        this.maxLevel = level;
    }

    setIsNight(b: boolean) {
        this.#isNight = b;
    }

    getIsNight(): boolean {
        return this.#isNight;
    }

    changeTileSource(url: string, minLevel: number, maxLevel: number) {
        this.url = url;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        const that = this;
        if (this.tiletree) {
            this.tiletree.forEachNode(node => {
                node.tile = null;
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
        this.tiletree = new TileTree(this.url);
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

    tileLevel(camera: Camera) {
        const tileSize = 256;
        const from = camera.getFrom()
        let pos: NumArr3 = proj4(EPSG_4978, EPSG_4326, [from[0], from[1], from[2]]);
        let height = pos[2];
        const initialResolution = 2 * Math.PI * EARTH_RADIUS / tileSize;
        const groundResolution = height * 2 / tileSize;
        const zoom = Math.log2(initialResolution / groundResolution) + 1;
        return Math.min(Math.max(Math.ceil(zoom), this.minLevel), this.maxLevel);
    }


    provideCallbackGen() {

        let that = this;

        const cb: TileProviderCallback = (camera, info) => {

            if (camera === null) {
                return;
            }

            const level = that.tileLevel(camera);

            const projection = that.tinyearth.scene?.getProjection();

            if (projection && camera) {
                that.frustum = buildFrustum(projection, camera);
            }

            if (that.frustum === null) {
                console.log("frustum is null");
                return;
            }

            if (!that.isStop()) {
                if (info === undefined || (info["type"] === 'zoom' && that.curlevel !== level) || info["type"] === 'move' || info["type"] === 'round') {

                    that.curlevel = level;

                    that.tiletree.fetchOrCreateTileNodesToLevel(level, that.frustum, true, async (node) => {/*do nothing*/ });

                }
            }
        }

        return cb;
    }

}

export function addTileProviderHelper(root: HTMLDivElement, title: string, tileProvider: TileProvider) {
    const uuid = crypto.randomUUID();
    const innerHTML = `
    <div>
        ${title}</br>
        获取/暂停获取瓦片
        <input type="checkbox" id="${uuid}"></br>     
    </div>
    `;

    const container = createHelperDiv(`tile-provider-helper-${crypto.randomUUID()}`, innerHTML);
    root.appendChild(container);

    const checkbox = document.getElementById(uuid) as HTMLInputElement;

    if (checkbox) {
        checkbox.checked = !tileProvider.isStop();
        checkbox.addEventListener("change", (event) => {
            if ((event as any).target.checked) { // TODO resolve any type
                tileProvider.start();
            } else {
                tileProvider.stop();
            }
        });
    } else {
        console.error("addTileProviderHelper checkbox is null.");
    }

}

function createTileOptions() {
    let options = "";

    for (const key of Object.keys(TileResources)) {
        const info = TileResources[key as keyof typeof TileResources] as TileSourceInfo;
        options = `${options}<option value="${info.name}">${info.name}</option>`
    }
    return options;
}

export function addTileSelectHelper(root: HTMLDivElement, title: string, tileProvider: TileProvider) {

    const divId = `tile-select-helper-${crypto.randomUUID()}`;

    const innerHTML = `
    
    <div>
        <label>${title} 瓦片选择器</label></br>
        <select id="tile-select" name="tile-select">
            ${createTileOptions()}
        </select>
    </div>
    
    `;

    const div = createHelperDiv(divId, innerHTML);

    root.appendChild(div);

    const tileSelect = document.getElementById("tile-select") as HTMLInputElement;

    tileSelect.addEventListener('change', event => {
        const tileName = (event as any).target.value; // TODO resovle any type
        const tileinfo = TileResources[tileName as keyof typeof TileResources] as TileSourceInfo;
        if (tileinfo) {
            tileProvider.changeTileSource(tileinfo.url, tileinfo.minLevel, tileinfo.maxLevel);
        }
    });
}

