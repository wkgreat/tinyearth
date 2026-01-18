require('jest-canvas-mock');

const createGLContext = require('gl');

HTMLCanvasElement.prototype.getContext = (type) => {
    if (type === 'webgl2') {
        // 创建一个 headless WebGL2 context
        const gl = createGLContext(1, 1, { preserveDrawingBuffer: true });
        gl.drawBuffers = jest.fn();
        return gl;
    }
    return null;
};