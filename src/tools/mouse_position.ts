import proj4 from "proj4";
import type { MouseEventHandler } from "../defines.js";
import { EPSG_4326, EPSG_4978 } from "../proj.js";
import TinyEarth from "../tinyearth.js";
import { positionAtPixel } from "./tool.js";
import type ContextMenuTool from "./context_menu.js";

type ValueElement =
    HTMLInputElement |
    HTMLTextAreaElement |
    HTMLSelectElement |
    HTMLButtonElement;

interface MousePositionToolOptions {
    tinyearth: TinyEarth
    contextMenu?: ContextMenuTool
    textElementId?: string
}

export class MousePositionTool {

    tinyearth: TinyEarth;
    handleMouseMoveFunc: MouseEventHandler | null = null;

    mouseX: number = 0;
    mouseY: number = 0;

    textElementId: string = "";

    constructor(options: MousePositionToolOptions) {
        this.tinyearth = options.tinyearth;
        if (options.contextMenu) {
            const option = document.createElement('li');
            option.innerHTML = "复制坐标";
            const ctxMenuElem = options.contextMenu.getElement();
            if (ctxMenuElem) {
                ctxMenuElem.appendChild(option);
                const that = this;
                option.addEventListener('click', () => {
                    const p = positionAtPixel(that.tinyearth.scene!, this.mouseX, this.mouseY);
                    let text = "";
                    if (p) {
                        const lonLatAlt = proj4(EPSG_4978, EPSG_4326, [p.getX(), p.getY(), p.getZ()]);
                        text = `${lonLatAlt[0]}, ${lonLatAlt[1]}`;
                    } else {
                        text = "";
                    }
                    navigator.clipboard.writeText(text)
                        .then(() => { alert(`坐标已复制到剪贴板: ${text}`) })
                        .catch(err => { alert(`坐标复制失败`) });
                });
            }
        }
        this.textElementId = options.textElementId ?? "";
    }

    getTextElement(): ValueElement | null {
        const elem = document.getElementById(this.textElementId) as ValueElement | null;
        return elem;
    }

    handleMouseMove(): MouseEventHandler {
        const that = this;
        return (event) => {
            const elem = that.getTextElement();
            if (elem) {
                const canvas = that.tinyearth.canvas!;
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const x = (event.clientX - rect.left) * scaleX;
                const y = (event.clientY - rect.top) * scaleY;
                that.mouseX = x;
                that.mouseY = y;
                const p = positionAtPixel(that.tinyearth.scene!, x, y);
                if (p) {
                    const lonLatAlt = proj4(EPSG_4978, EPSG_4326, [p.getX(), p.getY(), p.getZ()]);
                    elem.value = `${lonLatAlt[0]}, ${lonLatAlt[1]}`;
                } else {
                    elem.value = "";
                }
            }

        }
    }

    enable() {
        this.handleMouseMoveFunc = this.handleMouseMove();
        this.tinyearth.canvas.addEventListener('mousemove', this.handleMouseMoveFunc);
    }

    disable() {
        this.tinyearth.canvas.removeEventListener('mousemove', this.handleMouseMoveFunc as any); // resovle any type
        this.handleMouseMoveFunc = null;
    }

}