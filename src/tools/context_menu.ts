import TinyEarth from "../tinyearth.js";

type EventHandler = (e: any) => void;

export default class ContextMenuTool {

    tinyearth: TinyEarth;
    menuId: string = "tinyearth-menu";
    menuElem: HTMLElement;

    handleContextMenuFunc: EventHandler | null = null;
    handleClickFunc: EventHandler | null = null;

    constructor(tinyearth: TinyEarth) {
        this.tinyearth = tinyearth;
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