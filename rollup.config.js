import resolve from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss'
import glsl from 'rollup-plugin-glsl'
import path from 'path';
import fg from "fast-glob";

const entries = {};
for (const file of fg.sync("output/src/**/*")) {
    if (!file.endsWith(".map") && !file.endsWith(".css")) {
        const name = file.replace(/^output\/src\//, "");
        console.log(`${name}: ${file}`);
        entries[name] = file;
    }
}

const postcssPlugin = postcss({
    extract: true,
    inject: false,
});

const glslPlugin = glsl({
    include: ['**/*.glsl', '**/*.vert', '**/*.frag'],
    exclude: 'node_modules/**',
    sourceMap: true
});

export default [
    {
        input: entries,
        output: {
            dir: "dist",
            format: 'esm',
            preserveModules: true,
            sourcemap: true,
            entryFileNames: (chunkInfo) => {
                if (chunkInfo.name.includes("css")) {
                    console.log(chunkInfo.name)
                }
                const id = chunkInfo.facadeModuleId;
                if (!id) return '[name].js';
                const ext = path.extname(id);
                if (ext === '.js') {
                    return '[name]';
                }
                return '[name].js';
            }
        },
        treeshake: false,
        plugins: [glslPlugin, resolve()],
        external: ["gl-matrix", "mgrs", "proj4", "wkt-parser"]
    },
    {
        input: {
            "tinyearth.css": "output/src/tinyearth.css"
        },
        output: {
            dir: "dist",
            format: 'esm',
            preserveModules: true,
            sourcemap: true,
            entryFileNames: (chunkInfo) => {
                return '[name]';
            }
        },
        treeshake: false,
        sourceMap: false,
        plugins: [postcssPlugin, resolve()]
    }
];