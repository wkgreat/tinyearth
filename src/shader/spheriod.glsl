//origin-center axis-aligned spheriod
struct Spheriod {
    float a;
    float b;
    float c;
    mat3 m;
};

const float WGS84_A = 6378137.0f;
const float WGS84_B = 6378137.0f;
const float WGS84_C = 6356752.314245f;
const mat3 WGS84_M = mat3(
        1.0/(WGS84_A*WGS84_A), 0.0,      0.0,
        0.0,      1.0/(WGS84_B*WGS84_B), 0.0,
        0.0,      0.0,      1.0/(WGS84_C*WGS84_C)
    );
const Spheriod SPHERIOD_WGS84 = Spheriod(WGS84_A,WGS84_B,WGS84_C,WGS84_M);

Spheriod buildSpheriod(float a, float b, float c) {
    Spheriod s;
    s.a = a;
    s.b = b;
    s.c = c;
    s.m = mat3(
        1.0/(a*a), 0.0,      0.0,
        0.0,      1.0/(b*b), 0.0,
        0.0,      0.0,      1.0/(c*c)
    );
    return s;
}

mat3 spheriod_matrix(Spheriod s) {
    return mat3(
        1.0/(s.a*s.a), 0.0,      0.0,
        0.0,      1.0/(s.b*s.b), 0.0,
        0.0,      0.0,      1.0/(s.c*s.c)
    );
}

float spheriod_radius(vec3 d, Spheriod s) {
    mat3 q = s.m;
    vec3 n = normalize(d);
    float denom = dot(n, q * n);
    return 1.0 / sqrt(denom);
}

float spheriod_matrix_radius(vec3 d, mat3 m) {
    vec3 n = normalize(d);
    float denom = dot(n, m * n);
    return 1.0 / sqrt(denom);
}

float earth_radius(vec3 d) {
    return spheriod_radius(d, SPHERIOD_WGS84);
}

vec3 clamp_to_ground(vec3 p, Spheriod s, float h) {
    vec3 d = normalize(p);
    float t = spheriod_radius(d, s);
    return d * (h + t);
}