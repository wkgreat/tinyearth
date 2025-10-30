import type { ColorLike } from "./color";
import Color from "./color";
import type { Entity, GeometryEntity, PointEntity } from "./entity";
import { PointProgram, type Program } from "./program";
import { EPSG_4978 } from "./proj";
import type { GeometryStyle, PointStyle, Style, StyleBoolMapFunction, StyleColorMapFunction, StyleNumberMapFunction } from "./style";
import type TinyEarth from "./tinyearth";
import { GLAttribute } from "./webgl";

export interface LayerOptions {
    tinyearth: TinyEarth;
    id?: string
    entities: Entity[]
    style: Style
}

export abstract class Layer {

    tinyearth: TinyEarth;
    id: string;
    entities: Entity[];
    style: Style;
    program: Program | null = null;

    constructor(options: LayerOptions) {
        this.tinyearth = options.tinyearth;
        this.id = options.id ?? crypto.randomUUID();
        this.entities = options.entities;
        this.style = options.style;
    }

    abstract createProgram(): Program;

    abstract createAttributes(): void;

    abstract fillAttributes(): void;

    abstract refreshAttributes(): void;

    abstract activateAttributes(): void;

    abstract createTextures(): void;

    abstract fillTextures(): void;

    abstract refreshTextures(): void;

    abstract activateTextures(): void;

    abstract refreshUniforms(): void;

    draw() {
        if (this.program === null || this.program.program === null) {
            return;
        }
        this.program.use();
        this.activateAttributes();
        this.activateTextures();
        this.refreshUniforms();
        this.program.draw();
    }

    getColorArray(color: ColorLike | StyleColorMapFunction, count: number): number[] {
        if (typeof color === 'function') {
            return this.entities.flatMap(e => {
                const c = Color.build(color(e));
                return c !== null ? [c.r, c.g, c.b, c.a] : [0, 0, 0, 0];
            })
        } else {
            let c = Color.build(color);
            c = c === null ? new Color(0, 0, 0, 0) : c;
            const arr = [];
            for (let i = 0; i < count; ++i) {
                arr.push(c.r, c.g, c.b, c.a);
            }
            return arr;
        }
    }

    getNumberArray(num: number | StyleNumberMapFunction, count: number): number[] {
        if (typeof num === 'function') {
            return this.entities.map(e => num(e));
        } else {
            return Array(count).fill(num);
        }
    }

    getBoolArray(b: boolean | StyleBoolMapFunction, count: number): number[] {
        if (typeof b === 'function') {
            return this.entities.map(e => b(e) ? 1 : 0);
        } else {
            return Array(count).fill(b ? 1 : 0);
        }
    }

}

export interface GeometryLayerOptions extends LayerOptions {
    entities: GeometryEntity[]
    style: GeometryStyle;
}

export abstract class GeometryLayer extends Layer {

    override entities: GeometryEntity[];

    constructor(options: GeometryLayerOptions) {

        super(options);

        this.entities = options.entities;

    }
}

export interface PointLayerOptions extends GeometryLayerOptions {
    entities: PointEntity[];
    style: PointStyle;
}

export interface AttributeInfo {
    name: string,
    elemSize: number
    numType: number,
    normalized: boolean,
    stride: number,
    offset: number
}

export class PointLayer extends GeometryLayer {

    override entities: PointEntity[];
    override style: PointStyle;
    override program: PointProgram | null = null;

    attributes: { [k: string]: GLAttribute } = {};

    constructor(options: PointLayerOptions) {
        super(options);
        this.entities = options.entities;
        this.style = options.style;
        this.program = this.createProgram();
        this.createAttributes();
        this.fillAttributes();
        this.createTextures();
        this.fillTextures();
    }

    override createProgram(): PointProgram {
        this.program = new PointProgram({ tinyearth: this.tinyearth });
        this.program.setFirst(0);
        this.program.setCount(this.entities.length);
        return this.program;
    }

    override createAttributes() {
        if (this.program === null || this.program.program === null) {
            return;
        }

        //position
        this.attributes["position"] = new GLAttribute({
            gl: this.program.gl,
            name: "a_position",
            elemSize: 3
        });

        //size
        this.attributes["size"] = new GLAttribute({
            gl: this.program.gl,
            name: "a_size",
            elemSize: 1
        });

        //color
        this.attributes["color"] = new GLAttribute({
            gl: this.program.gl,
            name: "a_color",
            elemSize: 4
        });

        //stroke
        this.attributes["stroke"] = new GLAttribute({
            gl: this.program.gl,
            name: "a_stroke",
            elemSize: 1
        });

        //strokeColor
        this.attributes["strokeColor"] = new GLAttribute({
            gl: this.program.gl,
            name: "a_strokecolor",
            elemSize: 4
        });

        //strokeWidth
        this.attributes["strokeWidth"] = new GLAttribute({
            gl: this.program.gl,
            name: "a_strokewidth",
            elemSize: 1
        });

    }
    override fillAttributes(): void {

        const count = this.entities.length;

        const positionArray = this.entities.flatMap(e => {
            const p = e.point.srs !== EPSG_4978 ? e.point.transform(EPSG_4978, false) : e.point;
            return [p.x, p.y, p.z];
        });
        const sizeArray = this.getNumberArray(this.style.size, count);
        const colorArray = this.getColorArray(this.style.color, count);
        const strokeArray = this.getBoolArray(this.style.stoke, count);
        const strokeColorArray = this.getColorArray(this.style.strokeColor, count);
        const strokeWidthArray = this.getNumberArray(this.style.strokeWidth, count);

        this.attributes["position"]?.fillData(positionArray);
        this.attributes["color"]?.fillData(colorArray);
        this.attributes["size"]?.fillData(sizeArray);
        this.attributes["stroke"]?.fillData(strokeArray);
        this.attributes["strokeColor"]?.fillData(strokeColorArray);
        this.attributes["strokeWidth"]?.fillData(strokeWidthArray);

        this.program?.setFirst(0);
        this.program?.setCount(this.entities.length);

    }
    override refreshAttributes(): void {
        return;
    }
    override activateAttributes(): void {
        if (this.program && this.program.program) {
            for (const k in this.attributes) {
                this.attributes[k]?.activate(this.program.program);
            }
        }
    }
    override createTextures(): void {
        return;
    }
    override fillTextures(): void {
        return;
    }
    override refreshTextures(): void {
        return;
    }
    override activateTextures(): void {
        return;
    }
    override refreshUniforms(): void {
        if (this.program && this.program.program) {
            this.program.setCameraUniform();
            this.program.setProjectionUniform();;
        }

    }

    createTexture(): void {
        return;
    }

}