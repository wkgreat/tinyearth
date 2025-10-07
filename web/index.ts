import '../src/tinyearth.css';
import './styles.css';

import { TinyEarthHelperContainer } from "../src/helpers/helper.js";
import TileProviderHelper from '../src/helpers/tileprovider_helper.js';
import TinyEarthHelper from "../src/helpers/tinyearth_helper.js";
import TimerHelper from '../src/helpers/timer_helper.js';
import { TileResources } from '../src/tilesource.js';
import TinyEarth from '../src/tinyearth.js';
import ContextMenuTool from "../src/tools/context_menu.js";
import { MousePositionTool } from "../src/tools/mouse_position.js";

function main() {

    let tinyearth = null;

    const canvas = document.getElementById("tinyearth-canvas") as HTMLCanvasElement;
    if (canvas !== null) {

        // tinyearth
        tinyearth = new TinyEarth({
            canvas: canvas,
            night: false
        });

        // helper container
        const helperContainer = new TinyEarthHelperContainer({
            id: "helper",
            tinyearth: tinyearth
        });

        // tinyearth helper
        const tinyearthHelper = new TinyEarthHelper({ tinyearth });
        helperContainer.addHelper(tinyearthHelper);

        // tile provider
        const provider = tinyearth.addTileSource(TileResources.GOOGLE_IMAGERY);
        const providerHelper = new TileProviderHelper({
            tinyearth,
            provider,
            title: "Tile Provider",
            enableTileSelector: true
        });
        helperContainer.addHelper(providerHelper);

        // night tile provider
        const nightTileProvider = tinyearth.addTileSource({
            name: "earthatnight",
            url: "https://demo.ldproxy.net/earthatnight/map/tiles/WebMercatorQuad/{z}/{y}/{x}?f=jpeg",
            minLevel: 2,
            maxLevel: 6,
            night: true
        });
        const nightProviderHelper = new TileProviderHelper({
            tinyearth,
            provider: nightTileProvider,
            title: "Night Tile Provider",
            enableTileSelector: false
        });
        helperContainer.addHelper(nightProviderHelper);

        //timer set
        tinyearth.startTimer();
        tinyearth.setTimerMultipler(10000);
        const timerHelper = new TimerHelper({ tinyearth });
        helperContainer.addHelper(timerHelper);

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