import proj4 from "proj4";
import type { MouseEventHandler } from "../defines.js";
import { EPSG_4326, EPSG_4978 } from "../proj.js";
import TinyEarth from "../tinyearth.js";
import BaseTool, { formatNumber, positionAtPixel, type BaseToolOptions } from "./tool.js";
import type ContextMenuTool from "./context_menu.js";

type ValueElement =
    HTMLInputElement |
    HTMLTextAreaElement |
    HTMLSelectElement |
    HTMLButtonElement;

interface MousePositionToolOptions extends BaseToolOptions {
    container?: string
    contextMenu?: ContextMenuTool
}

export class MousePositionTool extends BaseTool {

    handleMouseMoveFunc: MouseEventHandler | null = null;

    mouseX: number = 0;
    mouseY: number = 0;

    #container: string | null = null;
    #toolDivId: string = `tinyearth-mouse-position-tool-${crypto.randomUUID()}`;

    constructor(options: MousePositionToolOptions) {
        super(options);
        this.#container = options.container ?? null;
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
    }

    handleMouseMove(): MouseEventHandler {
        const that = this;
        return (event) => {
            const div = document.getElementById(this.#toolDivId);
            if (div) {
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
                    div.innerHTML = `MousePosition: ${formatNumber(lonLatAlt[0]!, 3, 6)}, ${formatNumber(lonLatAlt[1]!, 3, 6)}`;
                } else {
                    div.innerHTML = "MousePosition: null";
                }
            }

        }
    }

    enable() {
        if (this.#container) {
            const container = document.getElementById(this.#container);

            if (container) {

                const div = document.createElement('div');

                if (div) {
                    div.id = this.#toolDivId;
                    container.appendChild(div);
                    this.handleMouseMoveFunc = this.handleMouseMove();
                    this.tinyearth.canvas.addEventListener('mousemove', this.handleMouseMoveFunc);
                }
            }
        }

    }

    disable() {
        if (this.handleMouseMoveFunc) {
            this.tinyearth.canvas.removeEventListener('mousemove', this.handleMouseMoveFunc as any); // resovle any type
            this.handleMouseMoveFunc = null;
        }
        const div = document.getElementById(this.#toolDivId);
        if (div) {
            div.remove();
        }
    }
}