attribute vec4 a_position;
attribute vec3 a_direction;

varying vec3 v_direction;

void main() {
    v_direction = a_direction;
    gl_Position = a_position;
}