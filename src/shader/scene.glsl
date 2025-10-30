struct Camera {
    vec4 from;
    vec4 to;
    vec4 up;
    mat4 viewmtx;
};

struct Projection {
    float near;
    float far;
    mat4 projmtx;
    float logDepthConstant;
};
