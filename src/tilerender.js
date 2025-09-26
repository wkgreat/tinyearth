import { mat4, vec4 } from "gl-matrix";
import proj4 from "proj4";
import Camera from "./camera.js";
import { Tile } from "./maptiler.js";
import { EARTH_RADIUS, EPSG_4326, EPSG_4978 } from "./proj.js";
import tileFragSource from "./tile.frag";
import tileVertSource from "./tile.vert";
import Frustum, { buildFrustum } from "./frustum.js";
import TinyEarth from "./tinyearth.js";
import { createHelperDiv } from "./helper.js";

export class GlobeTileProgram {


    /**@type {WebGLRenderingContext|null}*/
    gl = null;

    /**@type {TinyEarth|null}*/
    tinyearth = null;

    /**@type {WebGLProgram|null}*/
    program = null;

    buffers = {};

    numElements = 0;

    /**@type {TileProvider[]}*/
    tileProviders = [];

    constructor(tinyearth) {
        this.tinyearth = tinyearth;
        this.gl = this.tinyearth.gl;
        this.program = this.createTileProgram();
        this.createBuffer();
    }

    /**
     * @param {TileProvider} tileProvider 
    */
    addTileProvider(tileProvider) {

        this.tileProviders.push(tileProvider);

    }

    createTileProgram() {
        /* 创建程序 */
        const program = this.gl.createProgram();

        let success;

        /* 程序加载着色器 */
        const vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertShader, tileVertSource);
        this.gl.compileShader(vertShader);
        this.gl.attachShader(program, vertShader);

        success = this.gl.getShaderParameter(vertShader, this.gl.COMPILE_STATUS);
        if (!success) {
            const error = this.gl.getShaderInfoLog(vertShader);
            console.error('vertShader编译失败: ', error);
        }

        const fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
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
        this.buffers["vertices"] = this.gl.createBuffer();
        this.buffers["texture"] = this.gl.createTexture();
    }

    setUniform3f(name, v0, v1, v2) {
        this.gl.useProgram(this.program);
        this.gl.uniform3f(this.gl.getUniformLocation(this.program, name), v0, v1, v2);
    }
    setUniform4f(name, v0, v1, v2, v3) {
        this.gl.useProgram(this.program);
        this.gl.uniform4f(this.gl.getUniformLocation(this.program, name), v0, v1, v2, v3);
    }
    setUniform1f(name, v) {
        this.gl.useProgram(this.program);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, name), v);
    }

    /**
     * @param {Camera} camera 
    */
    setMaterial(sunPos, camera) {
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

    setVerticeData(verticeData) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers["vertices"]);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, verticeData, this.gl.STATIC_DRAW);
        this.numElements = verticeData.length;
    }

    createVertexBufferAndSetData(verticeData) {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, verticeData, this.gl.STATIC_DRAW);
        this.numElements = verticeData.length;
        return buffer;
    }

    createTextureAndSetData(textureData) {
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
    }

    setData(verticeData, textureData) {

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

    /**
     * @param {TileNode} node
     * @param {mat4} modelMtx
     * @param {Camera} camera
     * @param {mat4} projMtx       
    */
    drawTileNode(node, modelMtx, camera, projMtx, opacity = 1.0, isNight = false) {

        if (node.tile.ready) {
            this.gl.useProgram(this.program);

            if (node.vertexBuffer) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, node.vertexBuffer);
                this.numElements = node.tile.mesh.length;
            } else {
                node.vertexBuffer = this.createVertexBufferAndSetData(node.tile.mesh);
            }

            if (node.texture) {
                this.gl.bindTexture(this.gl.TEXTURE_2D, node.texture);
            } else {
                node.texture = this.createTextureAndSetData(node.tile.image);
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
            this.gl.uniform1i(this.gl.getUniformLocation(this.program, "u_isNight"), isNight);

            this.gl.drawArrays(this.gl.TRIANGLES, 0, this.numElements / 8);
        }
    }

    render(modelMtx, viewMtx, projMtx) {
        this.gl.useProgram(this.program);
        const that = this;
        for (let provider of this.tileProviders) {
            provider.frustum = this.tinyearth.scene.getFrustum();
            provider.tiletree.fetchOrCreateTileNodesToLevel(provider.curlevel, provider.frustum, !provider.isStop(), async (node) => {
                if (node && node.tile && node.tile.ready) {
                    that.drawTileNode(node, modelMtx, viewMtx, projMtx, provider.getOpacity(), provider.getIsNight());
                }
            });
        }
    }

    setFrustum(frustum) {
        for (let provider of this.tileProviders) {
            provider.setFrustum(frustum);
        }
    }
}

export class TileNode {

    /** @type {{z:number,x:number,y:number}}*/
    key = { z: 0, x: 0, y: 0 };
    /* @type {Tile} */
    tile = null;

    /**@type {WebGLBuffer|null} 瓦片顶点WebGL缓冲*/
    vertexBuffer = null; //

    /** @type {WebGLTexture|null} 瓦片图片WebGL纹理*/
    texture = null;

    /**@type {TileNode[]} */
    children = [];

    /**@param {Tile} tile */
    static createTileNode(tile) {
        const node = new TileNode();
        node.key = [tile.z, tile.x, this.y];
        node.tile = tile;
        node.children = [];
        return node;
    }
    static createEmptyTileNode(z, x, y) {
        const node = new TileNode();
        node.key = { z, x, y };
        node.tile = null;
        node.children = [];
        return node;
    }

}


export class TileTree {

    /**@type {TileNode} */
    root = TileNode.createEmptyTileNode(0, 0, 0);
    url = "";
    #startRecLevel = 2;

    constructor(url) {
        this.url = url;
    }

    /**
     * @param {Tile} tile 
    */
    addTile(tile) {
        this.#addTileRec(this.root, tile);
    }

    /**
     * @param {TileNode} curNode
     * @param {Tile} tile  
    */
    #addTileRec(curNode, tile) {
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

    /**
     * @param {number} z
     * @param {(tile:Tile)=>void} callback  
     * @TODO 根据视锥体剪枝
    */
    forEachTileNodesOfLevel(z, callback) {
        this.#forEachTileNodesOfLevel(this.root, z, callback);
    }

    /**
     * @param {TileNode} curNode 
     * @param {number} z
     * @param {(tile:Tile)=>void} callback  
    */
    #forEachTileNodesOfLevel(curNode, z, callback) {
        if (z === curNode.key.z) {
            callback(curNode);
        } else if (curNode.key.z < z) {
            for (let node of curNode.children) {
                let tile = null;
                if (node.z >= 6) {
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


    /**
     * @param {(node:TileNode)=>void} callback  
    */
    forEachNode(callback) {
        this.#forEachNode(this.root, callback);
    }

    /**
     * @param {TileNode} curNode
     * @param {(node:TileNode)=>void} callback  
    */
    #forEachNode(curNode, callback) {
        if (curNode) {
            callback(curNode);
        }
        for (let node of curNode.children) {
            this.#forEachNode(node, callback);
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {TileNode|null}   
    */
    getTileNode(z, x, y) {

        return this.#getTileNodeRec(this.root, z, x, y);

    }

    /**
     * @param {TileNode|null} curnode
     * @param {number} x
     * @param {number} y
     * @param {number} z 
     * @returns {TileNode|null}    
    */
    #getTileNodeRec(curnode, z, x, y) {
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
                let c0 = this.#getTileNodeRec(children[0], z, x, y);
                if (c0 !== null) {
                    return c0;
                }
                let c1 = this.#getTileNodeRec(children[1], z, x, y);
                if (c1 !== null) {
                    return c1;
                }
                let c2 = this.#getTileNodeRec(children[2], z, x, y);
                if (c2 !== null) {
                    return c2;
                }
                let c3 = this.#getTileNodeRec(children[3], z, x, y);
                if (c3 !== null) {
                    return c3;
                }
                return null;
            }
        }
    }

    fetchOrCreateTileNodesToLevel(z, frustum, create, callback) {

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
                    callback(node);
                }
            }
        } else {

            this.#fetchOrCreateTileNodesToLevelRec(this.root, z, frustum, create, callback);

        }

    }

    /**
     * @param {Frustum} frustum 
    */
    #fetchOrCreateTileNodesToLevelRec(curNode, z, frustum, create, callback) {

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


export class TileProvider {

    /**@type {TinyEarth|null}*/
    tinyearth = null;

    url = "";

    camera = null;

    curlevel = 0;

    /** @type {TileTree} */
    tiletree = null;

    #stop = false;

    /**
     * @type {{left:vec4,right:vec4,bottom:vec4,top:vec4,near:vec4,far:vec4}|null}
    */
    frustum = null;

    callback = null;

    /**@type {number}*/
    opacity = 1.0;

    minLevel = 2;

    maxLevel = 20;

    #isNight = false;

    /**
     * @param {string} url
     * @param {TinyEarth} tinyearth 
    */
    constructor(url, tinyearth) {
        this.tinyearth = tinyearth;
        this.url = url;
        this.tiletree = new TileTree(this.url);
        this.camera = tinyearth.scene.getCamera();
        this.callback = this.provideCallbackGen();
        this.callback(this.camera);
        this.camera.addOnchangeEeventListener(this.callback);
    }

    setMinLevel(level) {
        this.minLevel = level;
    }

    setMaxLevel(level) {
        this.maxLevel = level;
    }

    setIsNight(b) {
        this.#isNight = b;
    }

    setIsNight(b) {
        this.#isNight = b;
    }

    getIsNight() {
        return this.#isNight;
    }

    changeTileSource(url, minLevel, maxLevel) {
        this.url = url;
        this.minLevel = minLevel;
        this.maxLevel = maxLevel;
        const that = this;
        if (this.tiletree) {
            this.tiletree.forEachNode(node => {
                node.tile = null;
                if (node.texture) {
                    that.tinyearth.gl.deleteTexture(node.texture);
                    node.texture = null;
                }
                if (node.vertexBuffer) {
                    that.tinyearth.gl.deleteBuffer(node.vertexBuffer);
                    node.vertexBuffer = null;
                }
            });
        }
        this.tiletree = new TileTree(this.url);
    }

    /**
     * @param {Frustum} frustum 
    */
    setFrustum(frustum) {
        this.frustum = frustum;
    }

    setOpacity(opacity) {
        this.opacity = opacity;
    }

    getOpacity() {
        return this.opacity;
    }

    stop() {
        this.#stop = true;
    }

    start() {
        this.#stop = false;
    }

    isStop() {
        return this.#stop;
    }


    /**
     * @param {Camera} camera 
    */
    tileLevel(camera) {
        const tileSize = 256;
        let pos = proj4(EPSG_4978, EPSG_4326, Array.from(camera.getFrom().slice(0, 3)));
        let height = pos[2];
        const initialResolution = 2 * Math.PI * EARTH_RADIUS / tileSize;
        const groundResolution = height * 2 / tileSize;
        const zoom = Math.log2(initialResolution / groundResolution) + 1;
        return Math.min(Math.max(Math.ceil(zoom), this.minLevel), this.maxLevel);
    }


    provideCallbackGen() {

        let that = this;

        /**
         * @param {Camera} camera 
        */
        function provideCallback(camera, info) {

            const level = that.tileLevel(camera);

            that.frustum = buildFrustum(that.tinyearth.scene.getProjection(), camera);

            if (!that.isStop()) {
                if (info === undefined || (info["type"] === 'zoom' && that.curlevel !== level) || info["type"] === 'move' || info["type"] === 'round') {

                    that.curlevel = level;

                    that.tiletree.fetchOrCreateTileNodesToLevel(level, that.frustum, true, async (node) => {/*do nothing*/ });

                }
            }
        }

        return provideCallback;
    }

}

/**
 * @param {HTMLDivElement} root  
 * @param {string} title 
 * @param {TileProvider} tileProvider 
*/
export function addTileProviderHelper(root, title, tileProvider) {
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

    const checkbox = document.getElementById(uuid);

    if (checkbox) {
        checkbox.checked = !tileProvider.isStop();
        checkbox.addEventListener("change", (event) => {
            if (event.target.checked) {
                tileProvider.start();
            } else {
                tileProvider.stop();
            }
        });
    } else {
        console.error("addTileProviderHelper checkbox is null.");
    }

}

/**
 * @typedef TileInfo
 * @property {string} name
 * @property {string} url
 * @property {number} minLevel
 * @property {number} maxLevel
*/

/** @type {{string:TileInfo}}*/
const tileResources = {
    "GOOGLE_IMAGERY": {
        name: "谷歌影像",
        url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        minLevel: 1,
        maxLevel: 20
    },
    "ESRI_IMAGERY": {
        name: "ESRI影像",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        minLevel: 1,
        maxLevel: 20
    },
    "ESRI_TOPO": {
        name: "ESRI TOPO",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        minLevel: 1,
        maxLevel: 20
    },
    "OSM": {
        name: "OSM",
        url: "http://tile.openstreetmap.org/{z}/{x}/{y}.png",
        minLevel: 1,
        maxLevel: 20
    },
    "CARDODB_LIGHT_ALL": {
        name: "CARDODB_LIGHT_ALL",
        url: "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        minLevel: 1,
        maxLevel: 20
    },
    "CARDODB_DARK_ALL": {
        name: "CARDODB_DARK_ALL",
        url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        minLevel: 1,
        maxLevel: 20
    }
};

function createTileOptions() {
    let options = "";
    for (const [k, v] of Object.entries(tileResources)) {
        options = `${options}<option value="${k}">${v.name}</option>`
    }
    return options;
}

/**
 * @param {HTMLDivElement} root  
 * @param {string} title 
 * @param {TileProvider} tileProvider 
*/
export function addTileSelectHelper(root, title, tileProvider) {

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

    const tileSelect = document.getElementById("tile-select");

    tileSelect.addEventListener('change', event => {
        const tileName = event.target.value;
        const tileinfo = tileResources[tileName];
        tileProvider.changeTileSource(tileinfo.url, tileinfo.minLevel, tileinfo.maxLevel);
    });
}

