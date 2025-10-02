import '../src/tinyearth.css';
import './styles.css';

import { addDebugHelper } from "../src/helper.js";
import ContextMenuTool from "../src/tools/context_menu.js";
import { addTileProviderHelper, addTileSelectHelper, TileResources } from "../src/tilerender.js";
import Timer, { addTimeHelper } from "../src/timer.js";
import TinyEarth from '../src/tinyearth.js';
import { MousePositionTool } from "../src/tools/mouse_position.js";

function main() {

    let tinyearth = null;

    const canvas = document.getElementById("tinyearth-canvas") as HTMLCanvasElement;
    if (canvas !== null) {

        tinyearth = new TinyEarth({
            canvas: canvas
        });

        // add tile source
        const provider0 = tinyearth.addTileSource(TileResources.GOOGLE_IMAGERY);
        addTileProviderHelper(document.getElementById("helper") as HTMLDivElement, "影像瓦片底图", provider0);
        addTileSelectHelper(document.getElementById("helper") as HTMLDivElement, "影像瓦片底图", provider0);

        // add night tile source
        const provider1 = tinyearth.addTileSource({
            name: "earthatnight",
            url: "https://demo.ldproxy.net/earthatnight/map/tiles/WebMercatorQuad/{z}/{y}/{x}?f=jpeg",
            minLevel: 2,
            maxLevel: 6,
            night: true
        });
        addTileProviderHelper(document.getElementById("helper") as HTMLDivElement, "夜晚灯光瓦片底图", provider1);

        //skybox
        tinyearth.skyboxProgram!.setCubeMap([
            { face: tinyearth.gl!.TEXTURE_CUBE_MAP_POSITIVE_X, src: "assets/starsky/px.png" },
            { face: tinyearth.gl!.TEXTURE_CUBE_MAP_POSITIVE_Y, src: "assets/starsky/py.png" },
            { face: tinyearth.gl!.TEXTURE_CUBE_MAP_POSITIVE_Z, src: "assets/starsky/pz.png" },
            { face: tinyearth.gl!.TEXTURE_CUBE_MAP_NEGATIVE_X, src: "assets/starsky/nx.png" },
            { face: tinyearth.gl!.TEXTURE_CUBE_MAP_NEGATIVE_Y, src: "assets/starsky/ny.png" },
            { face: tinyearth.gl!.TEXTURE_CUBE_MAP_NEGATIVE_Z, src: "assets/starsky/nz.png" }
        ]);

        //timer set
        tinyearth.startTimer();
        tinyearth.setTimerMultipler(10000);
        addTimeHelper(tinyearth.timer, document.getElementById("helper") as HTMLDivElement);
        addDebugHelper(document.getElementById("helper") as HTMLDivElement, tinyearth);

        //context menu
        const contextMenu = new ContextMenuTool(tinyearth);
        contextMenu.enable();

        //mouse position tool
        const mousePosTool = new MousePositionTool({
            tinyearth,
            contextMenu,
            textElementId: "status-mouse-location-input"
        });
        mousePosTool.enable();

        tinyearth.draw();
    } else {
        console.log("tinyearth canvas is null");
    }
}

main();