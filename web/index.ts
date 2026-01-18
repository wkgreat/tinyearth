import '../src/tinyearth.css';
import './styles.css';

import Color from '../src/color.js';
import { Entity, LineStringEntity, PointEntity } from '../src/entity.js';
import { Coordinate, LineString, Point } from '../src/geometry.js';
import CameraHelper from "../src/helpers/camera_helper.js";
import { TinyEarthHelperContainer } from "../src/helpers/helper.js";
import TileProviderHelper from '../src/helpers/tileprovider_helper.js';
import TimerHelper from '../src/helpers/timer_helper.js';
import TinyEarthHelper from "../src/helpers/tinyearth_helper.js";
import { LineStringLayer, PointLayer } from '../src/layer.js';
import SRS from '../src/proj.js';
import { LineStringStyle, PointStyle } from '../src/style.js';
import { TileResources } from '../src/tilesource.js';
import TinyEarth from '../src/tinyearth.js';
import ContextMenuTool from "../src/tools/context_menu.js";
import EarthRotationTool, { EarthRotationToolHelper } from "../src/tools/earth_rotation.js";
import { MousePositionTool } from "../src/tools/mouse_position.js";
import PerformanceTool from "../src/tools/performace_tool.js";
import { randomFloat, randomLatitude, randomLongitude } from '../src/utils/random.js';

function main() {

    let tinyearth: TinyEarth | null = null;

    const canvas = document.getElementById("tinyearth-canvas") as HTMLCanvasElement;
    if (canvas !== null) {

        // tinyearth
        tinyearth = new TinyEarth({
            canvas: canvas,
            night: false,
            advance: {
                logdepth: false,
                reverseZ: 'auto',
                wireframe: false
            }
        });

        tinyearth.onReady(() => {

            console.log("tinyearth is on ready");

            if (tinyearth === null) {
                return;
            }

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
            const pointEntities: PointEntity[] = []
            for (let i = 0; i < 100; i++) {

                const point = new Point(new Coordinate(randomLongitude(), randomLatitude(), 0.0), SRS.WGS84);
                const entity = new PointEntity({
                    point: point,
                    properties: {
                        "weight": randomFloat(0, 100)
                    }
                })
                pointEntities.push(entity);
            }

            const leftColor = new Color(0.0, 1.0, 0.0, 1.0);
            const rightColor = new Color(1.0, 0.0, 0.0, 1.0);

            const pointLayer = new PointLayer({
                tinyearth,
                entities: pointEntities,
                style: new PointStyle({
                    color: (e: Entity) => {
                        const entity = e as PointEntity;
                        let w = entity.getProperty("weight") as number;
                        w = 1 - w / 100;
                        return leftColor.mix(rightColor, w);
                    },
                    size: 20,
                    stoke: true,
                    strokeColor: new Color(1.0, 0.0, 0.0, 1.0),
                    strokeWidth: 2
                }),
                clampToGround: true,
                clampToGroundOffset: 10
            });

            tinyearth.scene!.addLayer(pointLayer);

            const lineLayer = new LineStringLayer({
                tinyearth,
                entities: [
                    new LineStringEntity({
                        lineString: new LineString([
                            new Coordinate(100, 30, 0),
                            new Coordinate(120, 40, 0),
                            new Coordinate(140, 80, 0),
                            new Coordinate(140, 40, 0),
                        ], SRS.WGS84, false)
                    })
                ],
                style: new LineStringStyle({
                    color: new Color(0.0, 1.0, 0.0, 1.0),
                    lineWidth: 2,
                    lineNumSegs: 100
                }),
                clampToGround: true,
                clampToGroundOffset: 10
            });

            tinyearth.scene!.addLayer(lineLayer);

            tinyearth.draw();

        });

    } else {
        console.log("tinyearth canvas is null");
    }
}

main();