struct Spheriod {
    float a;
    float b;
    float c;
};

mat3 spheriod_matrix(Spheriod s) {
    return mat3(
        1.0/(s.a*s.a), 0.0,      0.0,
        0.0,      1.0/(s.b*s.b), 0.0,
        0.0,      0.0,      1.0/(s.c*s.c)
    );
}

float spheriod_radius(vec3 d, Spheriod s) {
    mat3 q = spheriod_matrix(s);
    vec3 n = normalize(d);
    float denom = dot(n, q * n);
    return 1.0 / sqrt(denom);
}

float pheriod_matrix_radius(vec3 d, mat3 q) {
    vec3 n = normalize(d);
    float denom = dot(n, q * n);
    return 1.0 / sqrt(denom);
}

float earth_radius(vec3 d) {
    Spheriod s;
    s.a = 6378137.0f;
    s.b = 6378137.0f;
    s.c = 6356752.314245f;
    return spheriod_radius(d, s);
}