import { describe, expect, test } from '@jest/globals';
import { vec3, vec4 } from 'gl-matrix';
import proj4 from 'proj4';
import Camera from './camera.js';
import { buildFrustum } from './frustum.js';
import { Plane, planeCrossPlane, Ray, rayCrossTriangle, Triangle } from './geometry.js';
import { mat4_inv, mat4_mul, vec3_add, vec3_normalize, vec3_scale, vec3_sub, vec3_t4, vec3_t4_affine, vec4_t3 } from './glmatrix_utils.js';
import { EPSG_4326, EPSG_4978 } from './proj.js';
import Projection from './projection.js';

describe("geometry", () => {

    test("ray_cross_triangle", () => {

        const triangle = new Triangle(
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 1, 0),
            vec3.fromValues(1, 0, 0)
        );
        let origin = vec3.fromValues(0, 0, 10);
        let direct = vec3.subtract(vec3.create(), vec3.fromValues(0, 0, 0), origin);
        let ray = new Ray(origin, direct);
        let r = rayCrossTriangle(ray, triangle);
        expect(r.cross).toBeTruthy();
        expect(r.uvt[2]).toBeCloseTo(10, 1E-10);


        origin = vec3.fromValues(0, 0, 10);
        direct = vec3.subtract(vec3.create(), vec3.fromValues(0, 1, 0), origin);
        ray = new Ray(origin, direct);
        r = rayCrossTriangle(ray, triangle);
        expect(r.cross).toBeTruthy();

        origin = vec3.fromValues(0, 0, 10);
        direct = vec3.subtract(vec3.create(), vec3.fromValues(1, 0, 0), origin);
        ray = new Ray(origin, direct);
        r = rayCrossTriangle(ray, triangle);
        expect(r.cross).toBeTruthy();

        const p = vec3_add(vec3_add(vec3_scale(triangle.p0, 0.6), vec3_scale(triangle.p1, 0.3)), vec3_scale(triangle.p2, 0.1));
        origin = vec3.fromValues(0, 0, 10);
        direct = vec3_sub(p, origin);
        ray = new Ray(origin, direct);
        r = rayCrossTriangle(ray, triangle);
        expect(r.cross).toBeTruthy();
        expect(r.uvt[0]).toBeCloseTo(0.3, 1E-10);
        expect(r.uvt[1]).toBeCloseTo(0.1, 1E-10);

        origin = vec3.fromValues(0, 0, 10);
        direct = vec3_sub(vec3.fromValues(1, 1, 0), origin);
        ray = new Ray(origin, direct);
        r = rayCrossTriangle(ray, triangle);
        expect(r.cross).toBeFalsy();

    });

});

describe("ray", () => {
    test("ray_collineation", () => {

        const ray0 = new Ray(vec3.fromValues(0, 0, 0), vec3_sub(vec3.fromValues(1, 1, 1), vec3.fromValues(0, 0, 0)));
        const ray1 = new Ray(vec3.fromValues(-10, -10, -10), vec3_sub(vec3.fromValues(-20, -20, -20), vec3.fromValues(-10, -10, -10)));

        expect(ray0.collineation(ray1)).toBeTruthy();
    });
});

describe("plane", () => {

    test("plane_from_points", () => {
        let p0 = vec3.fromValues(1, 2, 3);
        let p1 = vec3.fromValues(4, 5, 6);
        let p2 = vec3.fromValues(7, 8, 2);

        let plane = Plane.fromThreePoints(p0, p1, p2);



        expect(vec4.dot(vec3_t4(p0), plane.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(p1), plane.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(p2), plane.params)).toBeCloseTo(0, 1E-6);


        p0 = vec3.fromValues(-1, -1, 1);
        p1 = vec3.fromValues(-1, -1, -1);
        p2 = vec3.fromValues(-1, 1, -1);

        plane = Plane.fromThreePoints(p0, p1, p2);

        expect(vec4.dot(vec3_t4(p0), plane.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(p1), plane.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(p2), plane.params)).toBeCloseTo(0, 1E-6);

        p0 = vec3.fromValues(-1, 1, 1);
        p1 = vec3.fromValues(-1, 1, -1);
        p2 = vec3.fromValues(1, 1, -1);

        plane = Plane.fromThreePoints(p0, p1, p2);

        expect(vec4.dot(vec3_t4(p0), plane.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(p1), plane.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(p2), plane.params)).toBeCloseTo(0, 1E-6);


    })

});

describe("plane_cross_plane", () => {


    test("plane_cross_plane_correct", () => {

        const p0 = vec3.fromValues(-1, -1, 1);
        const p1 = vec3.fromValues(-1, -1, -1);
        const p2 = vec3.fromValues(-1, 1, -1);

        const plane0 = Plane.fromThreePoints(p0, p1, p2);

        expect(vec4.dot(vec3_t4(p0), plane0.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(p1), plane0.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(p2), plane0.params)).toBeCloseTo(0, 1E-6);

        const p3 = vec3.fromValues(-1, 1, 1);
        const p4 = vec3.fromValues(-1, 1, -1);
        const p5 = vec3.fromValues(1, 1, -1);

        const plane1 = Plane.fromThreePoints(p3, p4, p5);


        expect(vec4.dot(vec3_t4(p3), plane1.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(p4), plane1.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(p5), plane1.params)).toBeCloseTo(0, 1E-6);

        const ray = planeCrossPlane(plane0, plane1);

        expect(vec4.dot(vec3_t4(ray.ray.origin), plane0.params)).toBeCloseTo(0, 1E-6);
        expect(vec4.dot(vec3_t4(ray.ray.origin), plane1.params)).toBeCloseTo(0, 1E-6);

        const other_ray = new Ray(vec3.fromValues(-1, 1, -1), vec3_sub(vec3.fromValues(-1, 1, 1), vec3.fromValues(-1, 1, -1)));
        expect(ray.ray.collineation(other_ray)).toBeTruthy();

    });

})

describe("frustum_ray", () => {

    function transform(p, m) {
        let q = math_v3tv4(p);
        q = math.multiply(m, q);
        q = math.divide(q, q.get([3]));
        return math_v4tv3(q);
    }

    test("frutum_ray_corrent_1", () => {
        const width = 500;
        const height = 500;

        const projection = new Projection(Math.PI / 3, width / height, 1, 10000);
        const cameraFrom = proj4(EPSG_4326, EPSG_4978, [117, 32, 1E7]);
        const cameraTo = [0, 0, 0];
        const cameraUp = [0, 0, 1];
        const camera = new Camera(null, cameraFrom, cameraTo, cameraUp);
        const projMtx = projection.perspective();
        const viewMtx = camera.getMatrix().viewMtx;
        const M = mat4_mul(projMtx, viewMtx)
        const IM = mat4_inv(M);
        const frustum = buildFrustum(projection, camera);
        const view = vec3.fromValues(...cameraFrom);

        const ray0 = planeCrossPlane(new Plane(frustum.left), new Plane(frustum.bottom));
        const ray1 = planeCrossPlane(new Plane(frustum.right), new Plane(frustum.bottom));
        const ray2 = planeCrossPlane(new Plane(frustum.right), new Plane(frustum.top));
        const ray3 = planeCrossPlane(new Plane(frustum.left), new Plane(frustum.top));

        const x0 = vec4_t3(vec3_t4_affine(vec3.fromValues(-1, -1, -1), IM));
        const x1 = vec4_t3(vec3_t4_affine(vec3.fromValues(1, -1, -1), IM));
        const x2 = vec4_t3(vec3_t4_affine(vec3.fromValues(1, 1, -1), IM));
        const x3 = vec4_t3(vec3_t4_affine(vec3.fromValues(-1, 1, -1), IM));
        const x5 = vec4_t3(vec3_t4_affine(vec3.fromValues(-1, -1, 1), IM));


        expect(ray0.ray.pointOnRay(x0)).toBeTruthy();
        expect(ray0.ray.pointOnRay(x5)).toBeTruthy();

        expect(ray0.ray.pointOnRay(view)).toBeTruthy();
        expect(ray1.ray.pointOnRay(view)).toBeTruthy();
        expect(ray2.ray.pointOnRay(view)).toBeTruthy();
        expect(ray3.ray.pointOnRay(view)).toBeTruthy();

        const other_ray0 = new Ray(view, vec3_normalize(vec3_sub(view, x0)));
        const other_ray1 = new Ray(view, vec3_normalize(vec3_sub(view, x1)));
        const other_ray2 = new Ray(view, vec3_normalize(vec3_sub(view, x2)));
        const other_ray3 = new Ray(view, vec3_normalize(vec3_sub(view, x3)));

        expect(ray0.ray.collineation(other_ray0)).toBeTruthy();
        expect(ray1.ray.collineation(other_ray1)).toBeTruthy();
        expect(ray2.ray.collineation(other_ray2)).toBeTruthy();
        expect(ray3.ray.collineation(other_ray3)).toBeTruthy();
    })

    test("frustum_ray_correct_2", () => {
        const width = 1000;
        const height = 500;

        const projection = new Projection(Math.PI / 3, width / height, 1, 10000);
        const cameraFrom = proj4(EPSG_4326, EPSG_4978, [117, 32, 1E7]);
        const cameraTo = [0, 0, 0];
        const cameraUp = [0, 0, 1];
        const camera = new Camera(null, cameraFrom, cameraTo, cameraUp);
        const projMtx = projection.perspective();
        const viewMtx = camera.getMatrix().viewMtx;
        const M = mat4_mul(projMtx, viewMtx);
        const IM = mat4_inv(M);
        const frustum = buildFrustum(projection, camera);

        const view = vec3.fromValues(...cameraFrom);

        const ray0 = planeCrossPlane(new Plane(frustum.left), new Plane(frustum.bottom));
        const ray1 = planeCrossPlane(new Plane(frustum.right), new Plane(frustum.bottom));
        const ray2 = planeCrossPlane(new Plane(frustum.right), new Plane(frustum.top));
        const ray3 = planeCrossPlane(new Plane(frustum.left), new Plane(frustum.top));

        const x0 = vec4_t3(vec3_t4_affine(vec3.fromValues(-1, -1, -1), IM));
        const x1 = vec4_t3(vec3_t4_affine(vec3.fromValues(1, -1, -1), IM));
        const x2 = vec4_t3(vec3_t4_affine(vec3.fromValues(1, 1, -1), IM));
        const x3 = vec4_t3(vec3_t4_affine(vec3.fromValues(-1, 1, -1), IM));
        const x5 = vec4_t3(vec3_t4_affine(vec3.fromValues(-1, -1, 1), IM));

        expect(ray0.ray.pointOnRay(x0)).toBeTruthy();
        expect(ray0.ray.pointOnRay(x5)).toBeTruthy();

        expect(ray0.ray.pointOnRay(view)).toBeTruthy();
        expect(ray1.ray.pointOnRay(view)).toBeTruthy();
        expect(ray2.ray.pointOnRay(view)).toBeTruthy();
        expect(ray3.ray.pointOnRay(view)).toBeTruthy();

        const other_ray0 = new Ray(view, vec3_normalize(vec3_sub(view, x0)));
        const other_ray1 = new Ray(view, vec3_normalize(vec3_sub(view, x1)));
        const other_ray2 = new Ray(view, vec3_normalize(vec3_sub(view, x2)));
        const other_ray3 = new Ray(view, vec3_normalize(vec3_sub(view, x3)));

        expect(ray0.ray.collineation(other_ray0)).toBeTruthy();
        expect(ray1.ray.collineation(other_ray1)).toBeTruthy();
        expect(ray2.ray.collineation(other_ray2)).toBeTruthy();
        expect(ray3.ray.collineation(other_ray3)).toBeTruthy();


    })



});