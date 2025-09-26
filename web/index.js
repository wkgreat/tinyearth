import './tinyearth.css';

import proj4 from "proj4";
import { addDebugHelper } from "../src/helper.js";
import { addMenu } from "../src/menu.js";
import { EPSG_4326, EPSG_4978 } from "../src/proj.js";
import Scene from "../src/scene.js";
import { addTileProviderHelper, addTileSelectHelper, TileProvider } from "../src/tilerender.js";
import Timer, { addTimeHelper } from "../src/timer.js";
import { MousePositionTool } from "../src/tools.js";

import TinyEarth from '../src/tinyearth.js';

function main() {

    let tinyearth = null;

    const canvas = document.getElementById("tinyearth-canvas");
    if (canvas !== null) {

        tinyearth = new TinyEarth(canvas);

        const cameraFrom = proj4(EPSG_4326, EPSG_4978, [118.778869, 32.043823, 1E7]);
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
                width: tinyearth.viewWidth,
                height: tinyearth.viewHeight
            }
        });

        scene.addCameraControl(tinyearth.canvas);

        tinyearth.addScene(scene);

        // const url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        // const url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        // const url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
        // const url = "https://demo.ldproxy.net/earthatnight/map/tiles/WebMercatorQuad/{z}/{y}/{x}?f=jpeg";

        //常规底图
        let url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
        // let url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
        const tileProvider0 = new TileProvider(url, tinyearth);
        tileProvider0.setMinLevel(2);
        tileProvider0.setMaxLevel(20);
        tileProvider0.setIsNight(false);
        addTileProviderHelper(document.getElementById("helper"), "影像瓦片底图", tileProvider0);
        addTileSelectHelper(document.getElementById("helper"), "影像瓦片底图", tileProvider0);
        tinyearth.addTileProvider(tileProvider0);

        //夜间底图
        url = "https://demo.ldproxy.net/earthatnight/map/tiles/WebMercatorQuad/{z}/{y}/{x}?f=jpeg"
        const tileProvider1 = new TileProvider(url, tinyearth);
        tileProvider1.setMinLevel(2);
        tileProvider1.setMaxLevel(6);
        tileProvider1.setIsNight(true);
        addTileProviderHelper(document.getElementById("helper"), "夜晚灯光瓦片底图", tileProvider1);

        tinyearth.addTileProvider(tileProvider1);

        //skybox
        tinyearth.skyboxProgram.setCubeMap([
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: "assets/data/starsky/px.png" },
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: "assets/data/starsky/py.png" },
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: "assets/data/starsky/pz.png" },
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: "assets/data/starsky/nx.png" },
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: "assets/data/starsky/ny.png" },
            { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: "assets/data/starsky/nz.png" }
        ]);

        // tinyearth.skyboxProgram.setCubeMap([
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_X, src: "assets/data/box_zoom/pos-x.jpg" },
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, src: "assets/data/box_zoom/neg-x.jpg" },
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, src: "assets/data/box_zoom/pos-y.jpg" },
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: "assets/data/box_zoom/neg-y.jpg" },
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, src: "assets/data/box_zoom/pos-z.jpg" },
        //     { face: tinyearth.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: "assets/data/box_zoom/neg-z.jpg" },
        // ]);


        //timer
        const timer = new Timer(Date.now());
        timer.setEventBus(tinyearth.eventBus);
        timer.setMultipler(10000);
        timer.start();
        addTimeHelper(timer, document.getElementById("helper"));
        tinyearth.addTimer(timer);

        addDebugHelper(document.getElementById("helper"), tinyearth);

        const mousePosTool = new MousePositionTool(tinyearth);
        mousePosTool.enable();

        addMenu(tinyearth);

        tinyearth.draw();
    } else {
        console.log("tinyearth canvas is null");
    }
}

main();