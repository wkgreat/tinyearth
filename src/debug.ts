export function checkGLError(gl: WebGLRenderingContext, step: string = '') {
    const err = gl.getError();
    if (err !== gl.NO_ERROR) {
        console.error(`[WebGL] Error ${err} at ${step}`);
    }
}