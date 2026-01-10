import dfloat_wgsl from './shader/dfloat.module.wgsl';
import scene_wgsl from './shader/scene.module.wgsl';
import spheriod_wgsl from './shader/spheriod.module.wgsl';
import depth_wgsl from './shader/depth.module.wgsl'
import color_wgsl from './shader/color.module.wgsl';

const RAW_WGSL_CACHE: { [k: string]: string } = {
    "scene.module.wgsl": scene_wgsl,
    "spheriod.module.wgsl": spheriod_wgsl,
    "depth.module.wgsl": depth_wgsl,
    "color.module.wgsl": color_wgsl,
    "dfloat.module.wgsl": dfloat_wgsl
}

export class WGSLSource {

    #regex = /^\s*#include\s+["']([^"']+)["']\s*$/gm;
    #rawSource: string = "";
    #source: string | null = null;

    constructor(source: string) {
        this.#rawSource = source;
        this.resovleSource();
    }

    resovleSource(): string {
        if (this.#source) {
            return this.#source;
        }
        const tree = this.buildIncludeTree();
        const modules = this.topologySort(tree);

        let finalSource = "";
        for (let module of modules) {
            const moduleSource = this.removeAllIncludes(RAW_WGSL_CACHE[module]!);
            finalSource = `${finalSource}\n${moduleSource}`;
        }
        const rootSource = this.removeAllIncludes(this.#rawSource);
        finalSource = `${finalSource}\n${rootSource}`;
        this.#source = finalSource;
        return this.#source;
    }

    removeAllIncludes(source: string): string {

        const newSource = source.replaceAll(this.#regex, "");
        return newSource;

    }

    buildIncludeTree(): { [key: string]: string[] } {
        const tree = {};
        this.#buildIncludeTreeRec("root", this.#rawSource, tree);
        return tree;
    }

    #buildIncludeTreeRec(file: string, source: string, tree: { [key: string]: string[] }) {

        if (!(file in tree)) {
            tree[file] = [];
        }

        for (const match of source.matchAll(this.#regex)) {

            const matchFileName = match[1];

            if (!matchFileName) {
                console.error(`matchFileName in null, file: ${file}`);
            } else {

                tree[file]!.push(matchFileName);

                const matchSource = RAW_WGSL_CACHE[matchFileName];

                if (!matchSource) {
                    console.error(`matchSource in null, file: ${file}, ${matchFileName}`);
                } else {
                    this.#buildIncludeTreeRec(matchFileName, matchSource, tree);
                }
            }
        }
    }

    topologySort(tree: { [key: string]: string[] }): string[] {

        let canrm = true;
        let includeList: string[] = [];

        while (canrm) {
            canrm = false;
            let i = -1;
            let key: string = "";
            for (let k of Object.keys(tree)) {
                if (tree[k]!.length === 0) {
                    key = k;
                }
            }
            includeList.push(key);
            for (let k of Object.keys(tree)) {
                const files = tree[k];
                if (files!.includes(key)) {
                    tree[k] = tree[k]!.filter(f => f !== key);
                    canrm = true;
                }
            }
            delete tree[key];
        }

        const nelem = Object.entries(tree).map(([k, v]) => v.length).reduce((a, b) => a + b, 0);

        if (nelem > 0) {
            console.error("Exists Circular Dependency");
        }

        includeList = includeList.filter(f => f !== "root");

        return includeList;
    }

    logSource(): void {
        if (this.#source) {
            const lines = this.#source.split("\n");
            const newLines = lines.map((s, i) => `${i}\t${s}`);
            const r = newLines.join("\n");
            console.log(r);
        } else {
            console.log("source is null");
        }

    }

}