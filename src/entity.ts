import { mat4 } from "gl-matrix";
import type { ValueType } from "./defines";
import type { Point } from "./geometry";

export type EntityProperties = { [k: string]: ValueType };

export interface EntityOptions {
    id?: string;
    properties?: EntityProperties;
}

export class Entity {
    #id: string;

    #properties: EntityProperties = {};

    #modelMatrix: mat4 = mat4.create();

    constructor(options: EntityOptions) {
        this.#id = options.id ?? crypto.randomUUID();
        this.#properties = options.properties ?? {};
    }

    setProperty(k: string, v: string | number | boolean) {
        this.#properties[k] = v;
    }

    getProperty(k: string) {
        return this.#properties[k];
    }

    get modelMatrix() {
        return this.#modelMatrix;
    }

    set modelMatrix(m: mat4) {
        this.#modelMatrix = m;
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

export interface PointEntityOptions extends EntityOptions {

    point: Point

}

export class PointEntity extends GeometryEntity {

    point: Point;

    constructor(options: PointEntityOptions) {
        super(options);
        this.point = options.point;
    }

}