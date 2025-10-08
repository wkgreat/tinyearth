import resolve from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import glsl from 'rollup-plugin-glsl';
import url from '@rollup/plugin-url';
import path from 'path';
import fg from "fast-glob";

const entries = {};

const assetExts = ['.png', '.jpg', '.jpeg'];
const excludeExts = ['.map', '.css', ...assetExts];

for (const file of fg.sync("output/src/**/*")) {
    if (!excludeExts.includes(path.extname(file))) {
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

const urlPlugin = url({
    limit: 0,
    emitFiles: false,
    include: ['**/*.png', '**/*.jpg', '**/*.gif', '**/*.svg']
});

const mapFilterPlugin = {
    name: 'filter-maps',
    generateBundle(_, bundle) {
        for (const name of Object.keys(bundle)) {
            const maps = excludeExts.map(ext => `${ext}.map`);
            if (maps.some(map => name.endsWith(map))) {
                delete bundle[name];
            }
        }
    }
};

export default [
    {
        input: entries,
        output: {
            dir: "dist",
            format: 'esm',
            preserveModules: true,
            sourcemap: true,
            // assetFileNames: 'assets/[name]-[hash][extname]',
            entryFileNames: (chunkInfo) => {
                const id = chunkInfo.facadeModuleId;
                if (!id) return '[name].js';
                const ext = path.extname(id);
                if (ext === '.js') {
                    return '[name]';
                }
                if (excludeExts.includes(ext)) {
                    return '[name]';
                }
                return '[name].js';
            }
        },
        treeshake: false,
        plugins: [glslPlugin, urlPlugin, resolve(), mapFilterPlugin],
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
            entryFileNames: (chunkInfo) => '[name]'
        },
        treeshake: false,
        sourceMap: false,
        plugins: [postcssPlugin, resolve()]
    }
];