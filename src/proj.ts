export type projcode_t = string;

export const EPSG_3857: projcode_t = "EPSG:3857";

export const EPSG_4326: projcode_t = "EPSG:4326";

export const EPSG_4978: projcode_t = "+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs";

export const PROJ_WGS84: projcode_t = EPSG_4326;

export const PROJ_WEB: projcode_t = EPSG_3857;

export const PROJ_ECEF: projcode_t = EPSG_4978;

export const EARTH_RADIUS: number = 6378137;
export const WGS84_SPHERIOD_A: number = 6378137;
export const WGS84_SPHERIOD_B: number = 6356752.314245;
export const WGS84_SPHERIOD_F: number = 1.0 / 298.257223563;

