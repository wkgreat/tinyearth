import { TinyEarthEvent } from "../event";
import type { BaseToolOptions } from "./tool";
import BaseTool from "./tool";

export interface PerformanceToolOptions extends BaseToolOptions {
    container: string
}

export default class PerformanceTool extends BaseTool {

    #container: string;
    #tooldivId: string = "tinyearth-performace-tool";
    #frameCallbackId: string | null = null;
    #lastFrameTime = 0;
    #curFrameTime = 0;
    #cnt = 0;
    #nsamples = 100;

    constructor(options: PerformanceToolOptions) {
        super(options);
        this.#container = options.container;
        this.#tooldivId = `tinyearth-performace-tool-${crypto.randomUUID()}`;
    }

    formatFPS(fps: number): string {

        if (fps < 60) {
            return `<span style="color: red;">${fps.toFixed(3)}</span>`;
        } else if (fps < 120) {
            return `<span style="color: yellow;">${fps.toFixed(3)}</span>`;
        } else {
            return `<span style="color: white;">${fps.toFixed(3)}</span>`;
        }

    }

    enable(): void {

        const container = document.getElementById(this.#container);
        if (container) {
            const div = document.createElement('div');
            div.id = this.#tooldivId;
            container.appendChild(div);
        }

        this.#frameCallbackId = this.tinyearth.eventBus.addEventListener(TinyEarthEvent.TINYEARTH_FRAME, {
            callback: (info) => {
                this.#curFrameTime = info.frameTime;
                this.#cnt++;
                if (this.#cnt % this.#nsamples == 0) {
                    const fps = this.#cnt / ((this.#curFrameTime - this.#lastFrameTime) / 1000);
                    const div = document.getElementById(this.#tooldivId);
                    if (div) {
                        div.innerHTML = `FPS: ${this.formatFPS(fps)}`;
                    }
                    this.#cnt = 0;
                    this.#lastFrameTime = this.#curFrameTime;
                }

            }
        });
    }
    disable(): void {
        if (this.#frameCallbackId) {
            this.tinyearth.eventBus.removeEventListener(TinyEarthEvent.TINYEARTH_FRAME, this.#frameCallbackId);
            this.#frameCallbackId = null;
        }

        const div = document.getElementById(this.#tooldivId);
        if (div) {
            div.remove();
        }
    }
}