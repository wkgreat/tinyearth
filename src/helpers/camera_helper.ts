import type Camera from "../camera";
import { TinyEarthEvent } from "../event";
import { vec4_fromtext, vec4_text } from "../glmatrix_utils";
import { BaseHelper, type BaseHelperOptions } from "./helper";

export interface CameraHelperOptions extends BaseHelperOptions {
    camera?: Camera
};

export default class CameraHelper extends BaseHelper {

    #camera: Camera;
    helperId = "camera-helper";
    fromInputId = "camera-helper-from-input"
    toInputId = "camera-helper-to-input"
    upInputId = "camera-helper-up-input"
    title = "Camera";

    constructor(options: CameraHelperOptions) {
        super(options);
        this.#camera = options.camera ?? this.tinyearth.scene.camera;
    }

    createElement(): HTMLDivElement | null {

        const item0 = this.createItem(
            this.createLabel("from"),
            this.createInput(this.fromInputId, "text", { disabled: true })
        );

        const item1 = this.createItem(
            this.createLabel("to"),
            this.createInput(this.toInputId, "text", { disabled: true })
        );

        const item2 = this.createItem(
            this.createLabel("up"),
            this.createInput(this.upInputId, "text", { disabled: true })
        );

        this.element = this.createHelperDiv(this.helperId, this.title, [item0, item1, item2]);

        return this.element;

    }
    afterAddToContainer(): void {

        const fromInput = document.getElementById(this.fromInputId) as HTMLInputElement | null;
        const toInput = document.getElementById(this.toInputId) as HTMLInputElement | null;
        const upInput = document.getElementById(this.upInputId) as HTMLInputElement | null;

        if (fromInput) {
            fromInput.value = vec4_text(this.#camera.from);
            // fromInput.addEventListener("change", (e) => {
            //     const text = (e as any).target.value;
            //     const v = vec4_fromtext(text);
            //     if (v) {
            //         this.#camera.from = v;
            //     }
            // });
        }

        if (toInput) {
            toInput.value = vec4_text(this.#camera.to);
            // toInput.addEventListener("change", (e) => {
            //     const text = (e as any).target.value;
            //     const v = vec4_fromtext(text);
            //     if (v) {
            //         this.#camera.to = v;
            //     }
            // });
        }

        if (upInput) {
            upInput.value = vec4_text(this.#camera.up);
            // upInput.addEventListener("change", (e) => {
            //     const text = (e as any).target.value;
            //     const v = vec4_fromtext(text);
            //     if (v) {
            //         this.#camera.up = v;
            //     }
            // });
        }

        this.tinyearth.eventBus.addEventListener(TinyEarthEvent.CAMERA_CHANGE, {
            callback: (info) => {
                if (info.camera === this.#camera) {
                    if (fromInput) {
                        fromInput.value = vec4_text(this.#camera.from);
                    }
                    if (toInput) {
                        toInput.value = vec4_text(this.#camera.to);
                    }
                    if (upInput) {
                        upInput.value = vec4_text(this.#camera.up);
                    }

                }
            }
        });

    }

}