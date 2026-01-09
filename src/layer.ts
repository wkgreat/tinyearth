import type { ColorLike } from "./color";
import Color from "./color";
import type { Entity, GeometryEntity, LineStringEntity, PointEntity } from "./entity";
// import { LineStringProgram, PointProgram, type Program } from "./program";
import SRS from "./proj";
import type { GeometryStyle, LineStringStyle, PointStyle, Style, StyleBoolMapFunction, StyleColorMapFunction, StyleNumberMapFunction } from "./style";
import type TinyEarth from "./tinyearth";

export interface LayerOptions {
    tinyearth: TinyEarth;
    id?: string
    entities: Entity[]
    style: Style,
    clampToGround?: boolean
    clampToGroundOffset?: number
}

export abstract class Layer {

    tinyearth: TinyEarth;
    id: string;
    entities: Entity[];
    style: Style;
    // program: Program | null = null;
    clampToGround: boolean;
    clampToGroundOffset: number;

    // protected attributes: { [k: string]: GLAttribute } = {};

    constructor(options: LayerOptions) {
        this.tinyearth = options.tinyearth;
        this.id = options.id ?? crypto.randomUUID();
        this.entities = options.entities;
        this.style = options.style;
        this.clampToGround = options.clampToGround ?? false;
        this.clampToGroundOffset = options.clampToGroundOffset ?? 0;

        // this.program = this.createProgram();
        this.createAttributes();
        this.fillAttributes();
        this.createTextures();
        this.fillTextures();
    }

    // abstract createProgram(): Program;

    abstract createAttributes(): void;

    abstract fillAttributes(): void;

    abstract refreshAttributes(): void;

    abstract activateAttributes(): void;

    abstract createTextures(): void;

    abstract fillTextures(): void;

    abstract refreshTextures(): void;

    abstract activateTextures(): void;

    abstract refreshUniforms(): void;

    abstract beforeDraw(): void;

    abstract afterDraw(): void;

    draw() {
        // if (this.program === null || this.program.program === null) {
        //     return;
        // }
        // this.program.use();
        // this.activateAttributes();
        // this.activateTextures();
        // this.refreshUniforms();
        // this.beforeDraw();
        // this.program.draw();
        // this.afterDraw();
    }

    getColorArray(color: ColorLike | StyleColorMapFunction, count: number): number[][] {
        let colors: number[][] = [];
        if (typeof color === 'function') {
            colors = this.entities.map(e => {
                const c = Color.build(color(e));
                return c !== null ? [c.r, c.g, c.b, c.a] : [0, 0, 0, 0];
            })
        } else {
            let c = Color.build(color);
            c = c === null ? new Color(0, 0, 0, 0) : c;
            colors = Array(count).fill(c.toArray());
        }
        return colors;
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

export class PointLayer extends GeometryLayer {

    override entities: PointEntity[];
    override style: PointStyle;

    constructor(options: PointLayerOptions) {
        super(options);
        this.entities = options.entities;
        this.style = options.style;
    }

    // override createProgram(): PointProgram {
    //     const program = new PointProgram({
    //         tinyearth: this.tinyearth, advance: {
    //             logDepth: this.tinyearth.advance.glLogDepth ?? false
    //         }
    //     });
    //     program.setFirst(0);
    //     program.setCount(this.entities.length);
    //     return program;
    // }

    override createAttributes() {
        // if (this.program === null || this.program.program === null) {
        //     return;
        // }

        // //position
        // // this.attributes["position"] = new GLAttribute({
        // //     gl: this.program.gl,
        // //     name: "a_position",
        // //     elemSize: 3
        // // });
        // this.attributes["position"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_position",
        //     elemSize: 3,
        //     isDFloat: true
        // });

        // //size
        // this.attributes["size"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_size",
        //     elemSize: 1
        // });

        // //color
        // this.attributes["color"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_color",
        //     elemSize: 4
        // });

        // //stroke
        // this.attributes["stroke"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_stroke",
        //     elemSize: 1
        // });

        // //strokeColor
        // this.attributes["strokeColor"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_strokecolor",
        //     elemSize: 4
        // });

        // //strokeWidth
        // this.attributes["strokeWidth"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_strokewidth",
        //     elemSize: 1
        // });

    }
    override fillAttributes(): void {

        // if (this.program === null) {
        //     return;
        // }

        const count = this.entities.length;

        const positionArray = this.entities.flatMap(e => {
            const p = e.point.srs !== SRS.ECEF ? e.point.transform(SRS.ECEF, false) : e.point;
            return [p.x, p.y, p.z];
        });
        const sizeArray = this.getNumberArray(this.style.size, count);
        const colorArray = this.getColorArray(this.style.color, count).flatMap(c => c);
        const strokeArray = this.getBoolArray(this.style.stoke, count);
        const strokeColorArray = this.getColorArray(this.style.strokeColor, count).flatMap(c => c);
        const strokeWidthArray = this.getNumberArray(this.style.strokeWidth, count);

        // this.attributes["position"]?.fillData(positionArray);
        // this.attributes["color"]?.fillData(colorArray);
        // this.attributes["size"]?.fillData(sizeArray);
        // this.attributes["stroke"]?.fillData(strokeArray);
        // this.attributes["strokeColor"]?.fillData(strokeColorArray);
        // this.attributes["strokeWidth"]?.fillData(strokeWidthArray);

        // (this.program as PointProgram).setFirst(0);
        // (this.program as PointProgram).setCount(this.entities.length);

    }
    override refreshAttributes(): void {
        return;
    }
    override activateAttributes(): void {
        // if (this.program && this.program.program) {
        //     for (const k in this.attributes) {
        //         this.attributes[k]?.activate(this.program);
        //     }
        // }
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
        // if (this.program && this.program.program) {
        //     this.program.refreshAllUniforms();
        //     this.program.setClampToGround(this.clampToGround, this.clampToGroundOffset);
        // }
    }

    override beforeDraw(): void {}

    override afterDraw(): void {}

}

export interface LineStringLayerOptions extends GeometryLayerOptions {
    entities: LineStringEntity[];
    style: LineStringStyle;
}

export class LineStringLayer extends GeometryLayer {

    override entities: LineStringEntity[];
    override style: LineStringStyle;

    constructor(options: LineStringLayerOptions) {
        super(options);
        this.entities = options.entities;
        this.style = options.style;
    }

    // override createProgram(): LineStringProgram {
    //     const program = new LineStringProgram({
    //         tinyearth: this.tinyearth,
    //         advance: {
    //             logDepth: this.tinyearth.advance.glLogDepth ?? false
    //         }
    //     });
    //     program.setFirst(0);
    //     program.setCount(0);
    //     return program;
    // }

    override createAttributes(): void {
        // if (this.program === null) {
        //     return;
        // }
        // this.attributes["position"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_position",
        //     elemSize: 3,
        //     isDFloat: true,
        // });

        // this.attributes["entityid"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_entityid",
        //     elemSize: 1
        // });

        // this.attributes["color"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_color",
        //     elemSize: 4
        // });

        // this.attributes["lastpos"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_lastpos",
        //     elemSize: 3,
        //     isDFloat: true,
        // })

        // this.attributes["nextpos"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_nextpos",
        //     elemSize: 3,
        //     isDFloat: true,
        // })

        // this.attributes["side"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_side",
        //     elemSize: 1
        // })

        // this.attributes["linewidth"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_linewidth",
        //     elemSize: 1
        // })

        // this.attributes["normlen"] = new GLAttribute({
        //     gl: this.program.gl,
        //     name: "a_normlen",
        //     elemSize: 1
        // })
    }

    override fillAttributes(): void {

        // if (this.program === null) {
        //     return;
        // }

        //TODO: split to n segments
        const entityColors = this.getColorArray(this.style.color, this.entities.length);

        const entityLinewidths = this.getNumberArray(this.style.lineWidth, this.entities.length);

        //TODO as param
        const entitySegs = this.getNumberArray(this.style.lineNumSegs, this.entities.length);

        const lineData = this.entities.map((e: LineStringEntity, i: number) => {

            const line = e.lineString.transform(SRS.ECEF, false);
            const lineLength = line.length;
            const step = lineLength / entitySegs[i]!;
            const denseLine = line.dense(step, true);
            const size = denseLine.size;
            const mileage = denseLine.mileage();
            const normlen = mileage.map(m => m / lineLength);

            const entityids = Array(size).fill(i);
            const poslist = denseLine.toArray(3);
            const colors = Array(size).fill(entityColors[i]);
            const linewidths = Array(size).fill(entityLinewidths[i]);
            const lastposlist = [poslist[0] as number[], ...poslist.slice(0, poslist.length - 1)];
            const nextposlist = [...poslist.slice(1, poslist.length), poslist[poslist.length - 1] as number[]];

            const doubleEntityids = entityids.flatMap(e => [e, e]);
            const doublePosList = poslist.flatMap(p => [p, p]);
            const doubleColors = colors.flatMap(c => [c, c]);
            const doubleLinewidths = linewidths.flatMap(w => [w, w]);
            const doubleLastposlist = lastposlist.flatMap(p => [p, p]);
            const doubleNextposlist = nextposlist.flatMap(p => [p, p]);
            const doubleSides = poslist.flatMap(p => [1, -1]);
            const doublenormlens = normlen.flatMap(m => [m, m]);


            return {
                entityids: doubleEntityids,
                poslist: doublePosList,
                colors: doubleColors,
                linewidths: doubleLinewidths,
                lastposlist: doubleLastposlist,
                nextposlist: doubleNextposlist,
                sides: doubleSides,
                normlen: doublenormlens
            };
        });

        const positions = lineData.flatMap(line => line.poslist.flatMap(p => p));
        const entityids = lineData.flatMap(line => line.entityids);
        const colors = lineData.flatMap(line => line.colors.flatMap(c => c));
        const linewidths = lineData.flatMap(line => line.linewidths.flatMap(w => w));
        const lastpos = lineData.flatMap(line => line.lastposlist.flatMap(p => p));
        const nextpos = lineData.flatMap(line => line.nextposlist.flatMap(p => p));
        const sides = lineData.flatMap(line => line.sides);
        const normlen = lineData.flatMap(line => line.normlen);

        // this.attributes["position"]?.fillData(positions);
        // this.attributes["entityid"]?.fillData(entityids);
        // this.attributes["color"]?.fillData(colors);
        // this.attributes["linewidth"]?.fillData(linewidths);
        // this.attributes["lastpos"]?.fillData(lastpos);
        // this.attributes["nextpos"]?.fillData(nextpos);
        // this.attributes["side"]?.fillData(sides);
        // this.attributes["normlen"]?.fillData(normlen);

        // (this.program as LineStringProgram).setFirst(0);
        // (this.program as LineStringProgram).setCount(positions.length / 3);

    }
    override refreshAttributes(): void {
        return;
    }
    override activateAttributes(): void {
        // if (this.program && this.program.program) {
        //     for (const k in this.attributes) {
        //         this.attributes[k]?.activate(this.program);
        //     }
        // }
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
        // if (this.program && this.program.program) {
        //     this.program.refreshAllUniforms();
        //     this.program.setClampToGround(this.clampToGround, this.clampToGroundOffset);
        //     this.program.setModelMatrixUniform(this.entities[0]?.matrix);
        // }
    }

    override beforeDraw(): void {}

    override afterDraw(): void {}
}