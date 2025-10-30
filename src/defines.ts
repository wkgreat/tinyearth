export type Interval = [number, number];
export type Extent = [number, number, number, number];
export type NumArr2 = [number, number];
export type NumArr3 = [number, number, number];
export type NumArr4 = [number, number, number, number];

export type MouseEventHandler = (event: MouseEvent) => void;
export type WheelEventHandler = (event: WheelEvent) => void;

export const LEFTBUTTON = 0;
export const WHEELBUTTON = 1;
export const RIGHTBUTTON = 2;

export type ValueType = string | number | boolean;

export type Nullable<T> = T | null;

export type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array;