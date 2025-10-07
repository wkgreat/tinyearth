import x0y0z0 from './assets/tiles/imagery/x0y0z0.jpg';

import x0y0z1 from './assets/tiles/imagery/x0y0z1.jpg';
import x0y1z1 from './assets/tiles/imagery/x0y1z1.jpg';
import x1y0z1 from './assets/tiles/imagery/x1y0z1.jpg';
import x1y1z1 from './assets/tiles/imagery/x1y1z1.jpg';

import x0y0z2 from './assets/tiles/imagery/x0y0z2.jpg';
import x0y1z2 from './assets/tiles/imagery/x0y1z2.jpg';
import x0y2z2 from './assets/tiles/imagery/x0y2z2.jpg';
import x0y3z2 from './assets/tiles/imagery/x0y3z2.jpg';

import x1y0z2 from './assets/tiles/imagery/x1y0z2.jpg';
import x1y1z2 from './assets/tiles/imagery/x1y1z2.jpg';
import x1y2z2 from './assets/tiles/imagery/x1y2z2.jpg';
import x1y3z2 from './assets/tiles/imagery/x1y3z2.jpg';

import x2y0z2 from './assets/tiles/imagery/x2y0z2.jpg';
import x2y1z2 from './assets/tiles/imagery/x2y1z2.jpg';
import x2y2z2 from './assets/tiles/imagery/x2y2z2.jpg';
import x2y3z2 from './assets/tiles/imagery/x2y3z2.jpg';

import x3y0z2 from './assets/tiles/imagery/x3y0z2.jpg';
import x3y1z2 from './assets/tiles/imagery/x3y1z2.jpg';
import x3y2z2 from './assets/tiles/imagery/x3y2z2.jpg';
import x3y3z2 from './assets/tiles/imagery/x3y3z2.jpg';
import { MOCK_TILE_URL } from './tileutils';

const offlineImageryTileInfo: { [key: string]: string } = {
    "x0y0z0": x0y0z0,
    "x0y0z1": x0y0z1,
    "x0y1z1": x0y1z1,
    "x1y0z1": x1y0z1,
    "x1y1z1": x1y1z1,
    "x0y0z2": x0y0z2,
    "x0y1z2": x0y1z2,
    "x0y2z2": x0y2z2,
    "x0y3z2": x0y3z2,
    "x1y0z2": x1y0z2,
    "x1y1z2": x1y1z2,
    "x1y2z2": x1y2z2,
    "x1y3z2": x1y3z2,
    "x2y0z2": x2y0z2,
    "x2y1z2": x2y1z2,
    "x2y2z2": x2y2z2,
    "x2y3z2": x2y3z2,
    "x3y0z2": x3y0z2,
    "x3y1z2": x3y1z2,
    "x3y2z2": x3y2z2,
    "x3y3z2": x3y3z2
}

export type TileURLFunction = (x: number, y: number, z: number) => string;

export type TileURL = string | TileURLFunction;

export interface TileSourceInfo {
    name: string
    url: TileURL
    minLevel: number
    maxLevel: number
    night?: boolean
}

export class TileResources {

    static DEBUG_TILE: TileSourceInfo = {
        name: "Debug Tile",
        url: MOCK_TILE_URL,
        minLevel: 0,
        maxLevel: 20
    }

    static OFFLINE_IMAGERY: TileSourceInfo = {
        name: "Offline Imagery",
        url: (x, y, z) => {
            const url = offlineImageryTileInfo[`x${x}y${y}z${z}`];
            if (url) {
                return url;
            } else {
                console.warn("offline imagery return null");
                return "";
            }
        },
        minLevel: 2,
        maxLevel: 2,
    }

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