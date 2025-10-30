import '../src/tinyearth.css';
import './styles.css';

import CameraHelper from "../src/helpers/camera_helper.js";
import { TinyEarthHelperContainer } from "../src/helpers/helper.js";
import TileProviderHelper from '../src/helpers/tileprovider_helper.js';
import TimerHelper from '../src/helpers/timer_helper.js';
import TinyEarthHelper from "../src/helpers/tinyearth_helper.js";
import { Coordinate, Point } from '../src/geometry.js';
import { EPSG_4326 } from '../src/proj.js';
import { TileResources } from '../src/tilesource.js';
import TinyEarth from '../src/tinyearth.js';
import ContextMenuTool from "../src/tools/context_menu.js";
import EarthRotationTool, { EarthRotationToolHelper } from "../src/tools/earth_rotation.js";
import { MousePositionTool } from "../src/tools/mouse_position.js";
import PerformanceTool from "../src/tools/performace_tool.js";
import { randomFloat, randomLatitude, randomLongitude } from '../src/utils/random.js';
import { PointLayer } from '../src/layer.js';
import { PointStyle } from '../src/style.js';
import Color from '../src/color.js';
import { Entity, PointEntity } from '../src/entity.js';

function main() {

    let tinyearth: TinyEarth | null = null;

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

        // camera helper
        const cameraHelper = new CameraHelper({ tinyearth });
        helperContainer.addHelper(cameraHelper);

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
        nightTileProvider.stop();
        const nightProviderHelper = new TileProviderHelper({
            tinyearth,
            provider: nightTileProvider,
            title: "Night Tile Provider",
            enableTileSelector: false
        });
        helperContainer.addHelper(nightProviderHelper);

        //timer set
        tinyearth.startTimer();
        tinyearth.setTimerMultipler(3600);
        const timerHelper = new TimerHelper({ tinyearth });
        helperContainer.addHelper(timerHelper);

        //context menu
        const contextMenu = new ContextMenuTool({ tinyearth });
        contextMenu.enable();

        //mouse position tool
        const mousePosTool = new MousePositionTool({
            tinyearth,
            contextMenu,
            container: "status-bar"
        });
        mousePosTool.enable();

        //earth self rotation
        const earthRotationTool = new EarthRotationTool({ tinyearth });
        earthRotationTool.disable();
        const earthRotationToolHelper = new EarthRotationToolHelper({
            tinyearth,
            tool: earthRotationTool
        });

        helperContainer.addHelper(earthRotationToolHelper);

        const performTool = new PerformanceTool({ tinyearth: tinyearth, container: "status-bar" });
        performTool.enable();

        // add entities
        const entities: PointEntity[] = []
        for (let i = 0; i < 100; i++) {

            const point = new Point(new Coordinate(randomLongitude(), randomLatitude(), 1000), EPSG_4326);
            const entity = new PointEntity({
                point: point,
                properties: {
                    "weight": randomFloat(0, 100)
                }
            })
            entities.push(entity);
        }

        const leftColor = new Color(0.0, 1.0, 0.0, 1.0);
        const rightColor = new Color(1.0, 0.0, 0.0, 1.0);

        const layer = new PointLayer({
            tinyearth,
            entities: entities,
            style: new PointStyle({
                color: (e: Entity) => {
                    const entity = e as PointEntity;
                    let w = entity.getProperty("weight") as number;
                    w = 1 - w / 100;
                    return leftColor.mix(rightColor, w);
                },
                size: 10,
                stoke: true,
                strokeColor: new Color(1.0, 0.0, 0.0, 1.0),
                strokeWidth: 2
            })
        });

        tinyearth.scene.addLayer(layer);

        tinyearth.draw();

    } else {
        console.log("tinyearth canvas is null");
    }
}

main();