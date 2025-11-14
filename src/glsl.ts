import dfloat_glsl from './shader/dfloat.glsl';
import scene_glsl from './shader/scene.glsl';
import spheriod_glsl from './shader/spheriod.glsl';
import depth_glsl from './shader/depth.glsl'
import color_glsl from './shader/color.glsl';

export interface GLSLDefines {
    DEBUG_DEPTH?: boolean
    WIREFRAME?: boolean
    LOG_DEPTH?: boolean
}

namespace GLSLCACHE {

    const rawGlslCache: { [k: string]: string } = {
        "scene.glsl": scene_glsl,
        "spheriod.glsl": spheriod_glsl,
        "depth.glsl": depth_glsl,
        "color.glsl": color_glsl,
        "dfloat.glsl": dfloat_glsl
    }

    export const glslCache: { [k: string]: string } = {}

    const searchRegex = /#include/;
    const includeRegex = /^\s*#include\s+["']([^"']+)["']\s*$/gm;

    function deleteInclude(source: string) {
        return source.replace(includeRegex, (match, filename) => {
            return "\n";
        });
    }

    export function replaceInclude(filename: string, source: string, path: string[]): string {

        if (filename === path[0]) {
            return deleteInclude(source);
        }

        if (filename in glslCache) {
            return glslCache[filename] as string;
        }

        if (searchRegex.test(source)) {

            const newSource = source.replace(includeRegex, (match, fname) => {

                let content = "";

                if (fname in glslCache) {
                    content = glslCache[fname] as string;
                } else {
                    path.push(filename);
                    content = replaceInclude(fname, rawGlslCache[fname] || `// Missing file: ${fname}`, path);
                }

                return `\n${content}\n`;
            });

            glslCache[filename] = newSource;
            return glslCache[filename] as string;

        } else {
            glslCache[filename] = source;
            return glslCache[filename] as string;
        }
    }

    function createGlslCache() {
        for (const name in rawGlslCache) {
            const source = rawGlslCache[name] as string;
            replaceInclude(name, source, []);
        }
    }

    createGlslCache();

}

export class GLSLSource {

    #rawSource: string = "";
    #source: string = "";
    #defines: GLSLDefines = {};

    constructor(source: string, defines: GLSLDefines = {}) {
        this.#rawSource = source;
        this.#defines = defines;
    }

    set defines(ds: GLSLDefines) {
        this.#defines = ds;
    }

    #replaceInclude() {

        const regex = /^\s+#include\s+["']([^"']+)["']\s+$/gm;

        this.#source = this.#source.replace(regex, (match, filename) => {
            const content = GLSLCACHE.glslCache[filename] || `// Missing file: ${filename}`;
            return `\n${content}\n`;
        });
    }

    #addDefines() {

        const regex = /^\s+#define\s+__DEFINE_REPLACE__\s+$/gm;

        const defineLines = [];
        for (const key in this.#defines) {
            if (this.#defines[key as keyof GLSLDefines]) {
                defineLines.push(`#define ${key}`);
            }
        }
        const str = `\n${defineLines.join("\n")}\n`

        this.#source = this.#source.replace(regex, str);

    }

    get source(): string {
        this.#source = this.#rawSource;
        this.#replaceInclude();
        this.#addDefines();
        return this.#source;
    }

    logSource(): void {
        const lines = this.#source.split("\n");
        const newLines = lines.map((s, i) => `${i}\t${s}`);
        const r = newLines.join("\n");
        console.log(r);
    }

}