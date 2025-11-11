float frag_depth(float depth) {
    return depth;
}

float frag_depth_log(float c, float far, float vz) {
    return log2(c * -vz + 1.0) / log2(c * far + 1.0);
}