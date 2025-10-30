import scene_glsl from './shader/scene.glsl';
import spheriod_glsl from './shader/spheriod.glsl';

const glslCache: { [k: string]: string } = {
    "scene.glsl": scene_glsl,
    "spheriod.glsl": spheriod_glsl
}

export interface GLSLDefines {
    DEBUG_DEPTH?: boolean
}

export class GLSLSource {

    #source: string
    #defines: GLSLDefines = {};

    constructor(source: string, defines: GLSLDefines = {}) {
        this.#source = source;
        this.#defines = defines;
        this.#replaceInclude();
        this.#addDefines();
    }

    #replaceInclude() {

        const regex = /^\s+#include\s+["']([^"']+)["']\s+$/gm;

        this.#source = this.#source.replace(regex, (match, filename) => {
            const content = glslCache[filename] || `// Missing file: ${filename}`;
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
        return this.#source;
    }

}