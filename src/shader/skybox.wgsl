//skybox.wgsl

#include "spheriod.module.wgsl"

#include "scene.module.wgsl"

struct VSInput {
    @location(0) position: vec4f, // clip space
    @location(1) direction: vec3f // world space
}

struct VSOutput {
    @builtin(position) position : vec4f,
    @location(0) direction : vec3f
}

@vertex fn vs(input: VSInput) -> VSOutput {
    var output: VSOutput;
    output.position = input.position;
    output.direction = input.direction;
    return output;
}

struct SkyBoxUniforms {
    exposure: f32,
    contrast: f32
};

@group(1) @binding(0) var skybox: texture_cube<f32>;
@group(1) @binding(1) var theSampler: sampler;
@group(1) @binding(2) var<uniform> skyboxUniforms: SkyBoxUniforms;

struct FSOutput {
    @location(0) color : vec4<f32>,
    @builtin(frag_depth) depth : f32
};

fn adjust_stars(color: vec3<f32>, exposure: f32, contrast: f32) -> vec3<f32> {
    var x = color * pow(2.0, exposure);
    let contrast_base = 0.1;
    x = (x - vec3<f32>(contrast_base)) * contrast + vec3<f32>(contrast_base);
    
    return max(x, vec3<f32>(0.0)); // 确保不会出现负值
}

@fragment fn fs(input: VSOutput) -> FSOutput {

    var output: FSOutput;

    let f = vec3f(scene.camera.eye.xyz);
    let d = normalize(input.direction);
    let c = vec3f(0, 0, 0); // earth center
    let m = dot((c - f), d);
    let p = f + m * d;
    let v = p - c;
    let r: f32 = earth_radius(v); // earth radius
    var H: f32; // ray to earth center height
    if(m>0.0) {
        H = length(v);
    } else {
        H = length(f);
    }
    let h = (H - r) / (1E-2f * length(f)); // ray to earth surface height
    let w = pow(2.0f, -h); // surface light weight

    let ringcolor = vec3(0.529f, 0.808f, 0.922f);
    var starcolor = textureSample(skybox, theSampler, d).rgb;
    
    starcolor = adjust_stars(starcolor, skyboxUniforms.exposure, skyboxUniforms.contrast);
    
    var skycolor:vec3<f32> = mix(starcolor, ringcolor, w);
    if(m > 0.0f && h <= 0.0f) {
        skycolor = vec3f(0,0,0);
    }

    output.color = vec4f(skycolor, 1.0f);
    output.depth = scene.depth.fardepth;

    return output;
}