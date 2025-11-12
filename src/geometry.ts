import type { NumArr3 } from "./defines";
import { VEC3, type vec3 } from "./matrix";
import SRS, { type projcode_t } from "./proj";

export class Coordinate {

    #values: vec3;
    #m: number;
    #t: number;

    constructor(x: number, y: number, z: number, m?: number | null, t?: number | null) {
        this.#values = VEC3.fromValues(x, y, z);
        this.#m = m ?? 0;
        this.#t = t ?? 0;
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

    get m(): number {
        return this.#m;
    }

    get t(): number {
        return this.#t;
    }

    get v(): vec3 {
        return this.#values;
    }

    clone(): Coordinate {
        return new Coordinate(this.x, this.y, this.z, this.m, this.t);
    }

    transform(src: projcode_t, dst: projcode_t, inplace: boolean = false): Coordinate {

        const vs = SRS.transform(src, dst, [this.x, this.y, this.z]) as NumArr3;

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

    toArrray(n: number = 3): number[] {
        const arr: number[] = [this.x, this.y, this.z, this.m, this.t];
        return arr.slice(0, n);
    }

    distance(c: Coordinate): number {
        return VEC3.length(VEC3.sub(c.v, this.v));
    }

    mix(c: Coordinate, w: number): Coordinate {
        const v0 = this.v;
        const v1 = c.v;
        const m0 = this.m;
        const m1 = c.m;
        const t0 = this.t;
        const t1 = c.t;

        const v = VEC3.add(VEC3.scale(v0, 1 - w), VEC3.scale(v1, w));
        const m = (1 - w) * m0 + w * m1;
        const t = (1 - w) * t0 + w * t1;

        return new Coordinate(v[0], v[1], v[2], m, t);
    }

}

export class Geometry {

    #srs: projcode_t = SRS.ECEF;

    constructor(srs: projcode_t = SRS.ECEF) {
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

    constructor(coordinate: Coordinate, srs: projcode_t = SRS.ECEF, copy: boolean = true) {
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


export class LineString extends Geometry {

    #coordinates: Coordinate[] = []

    constructor(coordinates: Coordinate[], srs: projcode_t = SRS.ECEF, copy: boolean = true) {
        super(srs);

        if (copy) {
            this.#coordinates = coordinates.map(c => c.clone());
        } else {
            this.#coordinates = coordinates;
        }
    }

    transform(dst: projcode_t, inplace: boolean = true): LineString {

        if (inplace) {
            this.#coordinates.forEach(c => c.transform(this.srs, dst, true));
            this.srs = dst;
            return this;
        } else {
            const cs = this.#coordinates.map(c => c.transform(this.srs, dst, false));
            return new LineString(cs, dst, false);
        }

    }

    get size() {
        return this.#coordinates.length;
    }

    getCoordinateN(n: number): Coordinate | undefined {
        return this.#coordinates[n];
    }

    setCoordinateN(n: number, c: Coordinate) {
        if (n >= this.size) {
            return;
        }
        this.#coordinates[n] = c;
    }

    map(fn: (c: Coordinate) => any) {
        return this.#coordinates.map(fn);
    }

    forEach(fn: (c: Coordinate) => void): void {
        this.#coordinates.forEach(fn);
    }

    toArray(n: number = 3): number[][] {
        return this.#coordinates.map(c => c.toArrray(n));
    }

    dense(step: number, inplace: boolean = false): LineString {

        let a = 0;
        const cs: Coordinate[] = [];
        for (let i = 0; i < this.size - 1; ++i) {
            const c0 = this.getCoordinateN(i) as Coordinate;
            const c1 = this.getCoordinateN(i + 1) as Coordinate;
            const d = c0.distance(c1);
            const r = step / d;
            let w = r;
            cs.push(c0);
            while (w < 1) {
                cs.push(c0.mix(c1, w));
                w += r;
            }
        }
        cs.push(this.getCoordinateN(this.size - 1) as Coordinate);
        if (inplace) {
            this.#coordinates = cs;
            return this;
        } else {
            return new LineString(cs, this.srs, true);
        }

    }

    mileage(): number[] {
        const ms: number[] = [];
        let acc: number = 0;
        ms.push(acc);
        for (let i = 1; i < this.size; ++i) {
            acc += this.#coordinates[i]!.distance(this.#coordinates[i - 1]!);
            ms.push(acc);
        }
        return ms;
    }

    get length() {
        let sum = 0;
        for (let i = 0; i < this.size - 1; ++i) {
            const c0 = this.#coordinates[i] as Coordinate;
            const c1 = this.#coordinates[i + 1] as Coordinate;
            sum += c0.distance(c1);
        }
        return sum;
    }

}