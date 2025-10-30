import { vec3 } from "gl-matrix";
import proj4 from "proj4";
import type { NumArr3 } from "./defines";
import { EPSG_4978, type projcode_t } from "./proj";

export class Coordinate {

    #values: vec3;
    #m: number | null;
    #t: number | null;

    constructor(x: number, y: number, z: number, m?: number | null, t?: number | null) {
        this.#values = vec3.fromValues(x, y, z);
        this.#m = m ?? null;
        this.#t = t ?? null;
    }

    set x(x: number) {
        this.#values[0] = x;
    }

    set y(y: number) {
        this.#values[1] = y;
    }

    set z(z: number) {
        this.#values[2] = z;
    }

    get x(): number {
        return this.#values[0];
    }

    get y(): number {
        return this.#values[1];
    }

    get z(): number {
        return this.#values[2];
    }

    get hasM(): boolean {
        return !!this.#m;
    }

    get hasT(): boolean {
        return !!this.#t;
    }

    get m(): number | null {
        return this.#m;
    }

    get t(): number | null {
        return this.#t;
    }

    clone(): Coordinate {
        return new Coordinate(this.x, this.y, this.z, this.m, this.t);
    }

    transform(src: projcode_t, dst: projcode_t, inplace: boolean = true): Coordinate {

        const vs = proj4(src, dst, [this.x, this.y, this.z]) as NumArr3;

        if (inplace) {
            this.x = vs[0];
            this.y = vs[1];
            this.z = vs[2];
            return this;
        } else {
            const nc = this.clone();
            nc.x = vs[0];
            nc.y = vs[1];
            nc.z = vs[2];
            return nc;
        }

    }

}

export class Geometry {

    #srs: projcode_t = EPSG_4978;

    constructor(srs: projcode_t = EPSG_4978) {
        this.#srs = srs;
    }

    get srs(): projcode_t {
        return this.#srs;
    }

    set srs(p: projcode_t) {
        this.#srs = p;
    }
}

export class Point extends Geometry {

    #coordinate: [Coordinate];

    constructor(coordinate: Coordinate, srs: projcode_t = EPSG_4978, copy: boolean = true) {
        super(srs);
        if (copy) {
            this.#coordinate = [coordinate.clone()];
        } else {
            this.#coordinate = [coordinate];
        }
    }

    get x(): number {
        return this.#coordinate[0].x;
    }

    get y(): number {
        return this.#coordinate[0].y;
    }

    get z(): number {
        return this.#coordinate[0].z;
    }

    transform(dst: projcode_t, inplace: boolean = true): Point {

        if (inplace) {
            this.#coordinate[0].transform(this.srs, dst, inplace);
            this.srs = dst;
            return this;
        } else {
            const nc = this.#coordinate[0].transform(this.srs, dst, inplace);
            const np = new Point(nc, dst, false);
            return np;
        }

    }
}

// export class PointMesh extends Mesh {

//     points: Point[] = [];

//     constructor(points: Point[]) {
//         super();
//         this.points = points;
//     }

//     draw(program: PointProgram) {
//         program.draw(this.points);
//     }
// }

// export function pointsToLayer(tinyearth: TinyEarth, points: Point[]): Layer | null {

//     const program = new PointProgram({
//         tinyearth
//     });

//     const mesh = new PointMesh(points);

//     const layer = new Layer(program, mesh);

//     return layer;
// }