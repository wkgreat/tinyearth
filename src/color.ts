import type { NumArr3, NumArr4 } from "./defines";


export type ColorLike = Color | string | number[];

/**
 * Color class
*/
export default class Color {

    /**
     * red chennel (0-1)
    */
    r: number = 0;
    /**
     * green chennel (0-1)
    */
    g: number = 0;
    /**
     * blue chennel (0-1)
    */
    b: number = 0;
    /**
     * alpha chennel (0-1)
    */
    a: number = 0;

    /**
     * @param r red chennel (0-1)
     * @param g green chennel (0-1)
     * @param b blue chennel (0-1)
     * @param a alpha chennel (0-1)
    */
    constructor(r: number, g: number, b: number, a: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    clone(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    }

    static build(c: ColorLike): Color | null {

        if (c instanceof Color) {
            return c.clone();
        } else if (typeof c === 'string') {
            const cl = extractRGBA(c);
            if (cl === null) {
                return null;
            } else {
                return new Color(cl[0] / 255.0, cl[1] / 255.0, cl[2] / 255.0, cl[3]);
            }
        } else {
            const len = c.length;
            let t: number[] = [];
            if (len > 4) {
                t = c.slice(0, 4);
            } else if (len < 4) {
                t = [...c];
                for (let a = len; a <= 4; ++a) {
                    t.push(0);
                }
            }
            const lst = t as NumArr4;
            if (lst[0] > 1 || lst[0] > 1 || lst[0] > 1) {
                lst[0] /= 255.0;
                lst[1] /= 255.0;
                lst[2] /= 255.0;
            }
            if (lst[0] < 0) lst[0] = 0;
            if (lst[1] < 0) lst[1] = 0;
            if (lst[2] < 0) lst[2] = 0;
            if (lst[3] < 0) lst[2] = 0;
            if (lst[3] > 1) lst[2] = 1;
            return new Color(lst[0], lst[1], lst[2], lst[3]);
        }
    }

    toHex() {
        const rgb = [this.r, this.g, this.b];
        return (
            '#' +
            rgb.map(value => {
                const hex = (value * 255).toString(16)  // covert 0-1 chennel value to hex
                return hex.length === 1 ? '0' + hex : hex; // add 0
            }).join('')
        );
    }

    setAlpha(a: number) {
        this.a = a;
    }

}

function extractRGBA(colorString: string): NumArr4 | null {
    if (!colorString || typeof colorString !== 'string') {
        return null;
    }

    const s = colorString.trim().toLowerCase();

    // --- 1. HEX 格式 (#RRGGBB, #RGB, #RRGGBBAA, #RGBA) ---
    // 匹配 3, 4, 6, 8 位的 HEX 格式
    const hexMatch = s.match(/^#?([0-9a-f]{3,8})$/i);
    if (hexMatch) {
        let hex = hexMatch[1] as string;

        // 扩展 3位/4位 简写 (e.g. #F00 -> #FF0000)
        if (hex.length === 3 || hex.length === 4) {
            hex = Array.from(hex).map(char => char + char).join('');
        }

        // 解析 R, G, B, A
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // 检查是否有 Alpha (Hex 8位)
        let a = 1.0;
        if (hex.length === 8) {
            const alphaHex = hex.substring(6, 8);
            // 将 00-FF 转换为 0.0-1.0
            a = parseInt(alphaHex, 16) / 255;
        }

        return [r, g, b, a];
    }

    // --- 2. RGB 或 RGBA 格式 (rgb(...) / rgba(...) ) ---
    // 匹配 rgb/rgba 函数格式，提取括号内的内容
    const funcMatch = s.match(/^(rgb|rgba)\s*\(([^)]+)\)$/);

    if (funcMatch) {
        // 提取括号内的所有参数字符串
        const paramsStr = funcMatch[2] as string;

        // 尝试通过逗号或空格分割参数。处理如 "255, 0, 0, 0.5" 或 "255 0 0 / 0.5" 格式
        const values = paramsStr.split(/[,\s/]/)
            .map(v => v.trim())
            .filter(v => v.length > 0);

        // 颜色分量（R, G, B）
        const r = parseInt(values[0] as string, 10);
        const g = parseInt(values[1] as string, 10);
        const b = parseInt(values[2] as string, 10);

        // Alpha 分量（如果没有，则默认为 1.0）
        // 检查是否包含第四个值
        let a = 1.0;
        if (values.length >= 4) {
            // CSS 中的 Alpha 通常是 0.0 到 1.0 的浮点数
            a = parseFloat(values[3] as string);
        }

        // 基础验证：确保 R, G, B 在 0-255 范围内
        if (isNaN(r) || isNaN(g) || isNaN(b) || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
            return null;
        }

        // 返回结果
        return [r, g, b, Math.min(1.0, Math.max(0.0, a))]; // 限制 Alpha 在 0-1 之间
    }

    // --- 3. 格式不匹配 ---
    return null;
}

// export function color01Hex2RGB(hex: string) {
//     // 去掉开头的 #
//     hex = hex.replace(/^#/, '');

//     // 解析出 r、g、b
//     const r = parseInt(hex.substring(0, 2), 16);
//     const g = parseInt(hex.substring(2, 4), 16);
//     const b = parseInt(hex.substring(4, 6), 16);

//     return [r / 255.0, g / 255.0, b / 255.0];
// }
// export function color01RGB2Hex(rgb: NumArr3) {
//     return (
//         '#' +
//         rgb.map(value => {
//             const hex = (parseInt((value * 255).toString())).toString(16);  // 转成16进制
//             return hex.length === 1 ? '0' + hex : hex; // 补0，比如 'a' 变成 '0a'
//         }).join('')
//     );
// }