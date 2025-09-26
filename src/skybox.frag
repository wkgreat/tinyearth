precision highp float;

uniform samplerCube u_skybox;

varying vec3 v_direction;

void main() {

    gl_FragColor = textureCube(u_skybox, v_direction);

}