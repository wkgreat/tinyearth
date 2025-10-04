import '../src/tinyearth.css';
import './styles.css';

import { addDebugHelper } from "../src/helpers/helper.js";
import TinyEarthHelper from "../src/helpers/tinyearth_helper.js";
import { addTileProviderHelper, addTileSelectHelper } from "../src/tilerender.js";
import { TileResources } from '../src/tilesource.js';
import { addTimeHelper } from "../src/timer.js";
import TinyEarth from '../src/tinyearth.js';
import ContextMenuTool from "../src/tools/context_menu.js";
import { MousePositionTool } from "../src/tools/mouse_position.js";

function main() {

    let tinyearth = null;

    const canvas = document.getElementById("tinyearth-canvas") as HTMLCanvasElement;
    if (canvas !== null) {

        tinyearth = new TinyEarth({
            canvas: canvas,
            night: false
        });

        // tinyearth helper
        const tinyearthHelper = new TinyEarthHelper(tinyearth);
        tinyearthHelper.addTo(document.getElementById("helper") as HTMLDivElement);

        // tinyearth default tile provider
        const defaultTilePorvider = tinyearth.defaultTilePorvider;
        addTileProviderHelper(document.getElementById("helper") as HTMLDivElement, "Tile Provider", defaultTilePorvider);
        addTileSelectHelper(document.getElementById("helper") as HTMLDivElement, "Tile Provider", defaultTilePorvider);

        // add night tile source
        const nightTileProvider = tinyearth.addTileSource({
            name: "earthatnight",
            url: "https://demo.ldproxy.net/earthatnight/map/tiles/WebMercatorQuad/{z}/{y}/{x}?f=jpeg",
            minLevel: 2,
            maxLevel: 6,
            night: true
        });
        addTileProviderHelper(document.getElementById("helper") as HTMLDivElement, "Night Tile Provider", nightTileProvider);

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