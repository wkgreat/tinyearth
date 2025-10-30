import type { ColorLike } from "./color";
import Color from "./color";
import type { Entity } from "./entity";

export type StyleNumberMapFunction = (entity: Entity) => number;
export type StyleBoolMapFunction = (entity: Entity) => boolean;
export type StyleColorMapFunction = (entity: Entity) => ColorLike;

interface StyleOptions {}

export class Style {
    constructor(options: StyleOptions) {}
}

interface GeometryStyleOptions extends StyleOptions {
    color: ColorLike | StyleColorMapFunction;
    stoke?: boolean;
    strokeWidth?: number | StyleNumberMapFunction;
    strokeColor?: ColorLike | StyleColorMapFunction;
}

export class GeometryStyle extends Style {
    color: ColorLike | StyleColorMapFunction;
    stoke: boolean | StyleBoolMapFunction;
    strokeWidth: number | StyleNumberMapFunction;
    strokeColor: ColorLike | StyleColorMapFunction;

    constructor(options: GeometryStyleOptions) {
        super(options);
        this.color = options.color;
        this.stoke = options.stoke ?? false;
        this.strokeWidth = options.strokeWidth ?? 0;
        this.strokeColor = options.strokeColor ?? new Color(0, 0, 0, 0);
    }

}

interface PointStyleOptions extends GeometryStyleOptions {
    size: number | StyleNumberMapFunction;
}

export class PointStyle extends GeometryStyle {

    size: number | StyleNumberMapFunction = 0;

    constructor(options: PointStyleOptions) {
        super(options);
        this.size = options.size;
    }
}