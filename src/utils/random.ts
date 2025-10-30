export function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function randomLongitude(): number {
    return randomFloat(-180, 180);
}

export function randomLatitude(): number {
    return randomFloat(-90, 90);
}