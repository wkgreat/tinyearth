import type TinyEarth from "./tinyearth";

export interface ProgramAdvanceOptions {
    depthTest?: boolean
    wireframe?: boolean
    logDepth?: boolean
}

export interface ProgramOptions {
    tinyearth: TinyEarth
    advance?: ProgramAdvanceOptions
}