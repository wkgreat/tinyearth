import Camera from "./camera";
import type { Sun } from "./sun";

export function setCameraUniform(gl: WebGL2RenderingContext, program: WebGLProgram, camera: Camera) {

    gl.uniform4fv(gl.getUniformLocation(program, "camera.from"), camera.from);
    gl.uniform4fv(gl.getUniformLocation(program, "camera.to"), camera.to);
    gl.uniform4fv(gl.getUniformLocation(program, "camera.up"), camera.up);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "camera.viewmtx"), false, camera.viewMatrix);

}

export function setSunUniform(gl: WebGL2RenderingContext, program: WebGLProgram, sun: Sun) {

    const position = sun.position;
    gl.uniform3f(gl.getUniformLocation(program, "sun.position"), position[0], position[1], position[2]);
    gl.uniform4f(gl.getUniformLocation(program, "sun.color"), 1.0, 1.0, 1.0, 1.0);

}