import TinyEarth from "../tinyearth.js";
import type { BaseToolOptions } from "./tool.js";
import BaseTool from "./tool.js";

type EventHandler = (e: any) => void;

export interface ContextMenuToolOptions extends BaseToolOptions {};

export default class ContextMenuTool extends BaseTool {

    menuId: string = "tinyearth-menu";
    menuElem: HTMLElement;

    handleContextMenuFunc: EventHandler | null = null;
    handleClickFunc: EventHandler | null = null;

    constructor(options: ContextMenuToolOptions) {
        super({ tinyearth: options.tinyearth });
        this.menuElem = document.createElement('ul');
        this.menuElem.id = this.menuId;
        document.body.appendChild(this.menuElem);
    }

    getElement(): HTMLUListElement | null {
        const elem = document.getElementById(this.menuId);
        if (elem instanceof HTMLUListElement) {
            return elem;
        } else {
            return null;
        }
    }

    handleContextMenu() {
        const that = this;
        return (e: any) => {
            const elem = that.getElement();
            e.preventDefault();
            // 显示自定义菜单
            if (elem) {
                elem.style.left = `${e.clientX}px`;
                elem.style.top = `${e.clientY}px`;
                elem.style.display = 'block';
            }
        }
    }

    handleClick() {
        const that = this;
        return (e: any) => {
            const elem = that.getElement();
            if (elem) {
                this.menuElem.style.display = 'none';
            }
        }
    }

    enable() {
        this.handleContextMenuFunc = this.handleContextMenu();
        this.handleClickFunc = this.handleClick();
        this.tinyearth.canvas.addEventListener('contextmenu', this.handleContextMenuFunc as any);

        // click any other place, hide context menu
        document.addEventListener('click', this.handleClickFunc);
    }

    disable() {
        this.tinyearth.canvas.removeEventListener('contextmenu', this.handleContextMenuFunc as any);
        this.handleContextMenuFunc = null;
        document.removeEventListener('click', this.handleClickFunc as any);
        this.handleClickFunc = null;
    }
}