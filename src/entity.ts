import type { ValueType } from "./defines";
import type { LineString, Point } from "./geometry";
import { MAT4, type mat4 } from "./matrix";

export type EntityProperties = { [k: string]: ValueType };

export interface EntityOptions {
    id?: string;
    matrix?: mat4;
    properties?: EntityProperties;
}

export class Entity {
    #id: string;

    #properties: EntityProperties = {};

    #matrix: mat4;

    constructor(options: EntityOptions) {
        this.#id = options.id ?? crypto.randomUUID();
        this.#matrix = options.matrix ?? MAT4.create();
        this.#properties = options.properties ?? {};
    }

    setProperty(k: string, v: string | number | boolean) {
        this.#properties[k] = v;
    }

    getProperty(k: string) {
        return this.#properties[k];
    }

    get matrix() {
        return this.#matrix;
    }

    set matrix(m: mat4) {
        this.#matrix = m;
    }

    get id() {
        return this.#id;
    }
}

export interface GeometryEntityOptions extends EntityOptions {}

export class GeometryEntity extends Entity {

    constructor(options: GeometryEntityOptions) {
        super(options);
    }

}

export interface PointEntityOptions extends GeometryEntityOptions {
    point: Point
}

export class PointEntity extends GeometryEntity {

    point: Point;

    constructor(options: PointEntityOptions) {
        super(options);
        this.point = options.point;
    }

}

export interface LineStringEntityOptions extends GeometryEntityOptions {
    lineString: LineString;
}

export class LineStringEntity extends GeometryEntity {

    lineString: LineString;

    constructor(options: LineStringEntityOptions) {
        super(options);
        this.lineString = options.lineString
    }

}