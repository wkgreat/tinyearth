import type Camera from "../camera";
import { LEFTBUTTON, WHEELBUTTON, type MouseEventHandler, type WheelEventHandler } from "../defines";
import type { BaseToolOptions } from "./tool";
import BaseTool from "./tool";

export interface CameraMouseControlToolOptions extends BaseToolOptions {
    camera?: Camera
}

export default class CameraMouseControlTool extends BaseTool {

    #camera: Camera
    #canvas: HTMLCanvasElement;

    leftButtonDown: boolean = false;
    wheelButtonDown: boolean = false;
    lastMouseX: number = 0;
    lastMouseY: number = 0;
    handleMouseDownFunc: MouseEventHandler | null = null;
    handleMouseMoveFunc: MouseEventHandler | null = null;
    handleMouseUpFunc: MouseEventHandler | null = null;
    handleMouseLeaveFunc: MouseEventHandler | null = null;
    handleMouseWheelFunc: WheelEventHandler | null = null;

    constructor(options: CameraMouseControlToolOptions) {
        super({ tinyearth: options.tinyearth });
        this.#canvas = options.tinyearth.canvas;
        this.#camera = options.camera ?? options.tinyearth.scene.camera;
    }

    handleMouseDown(): MouseEventHandler {
        const that = this;
        return (e) => {
            if (e.button == LEFTBUTTON) {
                that.leftButtonDown = true;
            } else if (e.button == WHEELBUTTON) {
                that.wheelButtonDown = true;
            }
            that.lastMouseX = e.clientX;
            that.lastMouseY = e.clientY;

        }
    }

    handleMouseMove(): MouseEventHandler {
        const that = this;
        return (e) => {
            if (this.leftButtonDown) {
                const dx = e.clientX - that.lastMouseX;
                const dy = e.clientY - that.lastMouseY;
                that.#camera.round(dx, dy);
            } else if (this.wheelButtonDown) {
                e.preventDefault();
                const dx = e.clientX - that.lastMouseX;
                const dy = e.clientY - that.lastMouseY;
                that.#camera.moveTarget(-dx * (Math.PI / 180.0) / 10, -dy * (Math.PI / 180.0) / 10);
            }
            that.lastMouseX = e.clientX;
            that.lastMouseY = e.clientY;
        }
    }

    handleMouseUp(): MouseEventHandler {
        const that = this;
        return (e) => {
            if (e.button == LEFTBUTTON) {
                that.leftButtonDown = false;
            }
            if (e.button == WHEELBUTTON) {
                that.wheelButtonDown = false;
            }
        }
    }

    handleMouseLeave(): MouseEventHandler {
        const that = this;
        return (e) => {
            that.leftButtonDown = false;
            that.wheelButtonDown = false;
        }
    }

    handleMouseWheel(): WheelEventHandler {
        const that = this;
        return (e) => {
            e.preventDefault();
            this.#camera.zoom(e.deltaY / 120 * (1 / 10));
        }
    }

    enable() {
        this.handleMouseDownFunc = this.handleMouseDown();
        this.handleMouseMoveFunc = this.handleMouseMove();
        this.handleMouseUpFunc = this.handleMouseUp();
        this.handleMouseLeaveFunc = this.handleMouseLeave();
        this.handleMouseWheelFunc = this.handleMouseWheel();
        this.#canvas.addEventListener('mousedown', this.handleMouseDownFunc);
        this.#canvas.addEventListener('mousemove', this.handleMouseMoveFunc)
        this.#canvas.addEventListener('mouseup', this.handleMouseUpFunc);
        this.#canvas.addEventListener('mouseleave', this.handleMouseLeaveFunc);
        this.#canvas.addEventListener('wheel', this.handleMouseWheelFunc);
    }
    disable() {
        //TODO resolve any type
        this.#canvas.removeEventListener('mousedown', this.handleMouseDownFunc as any);
        this.#canvas.removeEventListener('mousemove', this.handleMouseMoveFunc as any)
        this.#canvas.removeEventListener('mouseup', this.handleMouseUpFunc as any);
        this.#canvas.removeEventListener('mouseleave', this.handleMouseLeaveFunc as any);
        this.#canvas.removeEventListener('wheel', this.handleMouseWheelFunc as any);
        this.handleMouseDownFunc = null;
        this.handleMouseMoveFunc = null;
        this.handleMouseUpFunc = null;
        this.handleMouseLeaveFunc = null;
        this.handleMouseWheelFunc = null;
    }

}