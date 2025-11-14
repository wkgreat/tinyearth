import type Camera from "../camera";
import { TinyEarthEvent } from "../event";
import { VEC4 } from "../matrix";
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
    heightInputId = "camera-helper-height-input"
    resInputId = "camera-helper-res-input";
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

        const item3 = this.createItem(
            this.createLabel("height"),
            this.createInput(this.heightInputId, "text", { disabled: true })
        );

        const item4 = this.createItem(
            this.createLabel("resolution:"),
            this.createInput(this.resInputId, "text", { disabled: true })
        );

        this.element = this.createHelperDiv(this.helperId, this.title, [item0, item1, item2, item3, item4]);

        return this.element;

    }
    afterAddToContainer(): void {

        const fromInput = document.getElementById(this.fromInputId) as HTMLInputElement | null;
        const toInput = document.getElementById(this.toInputId) as HTMLInputElement | null;
        const upInput = document.getElementById(this.upInputId) as HTMLInputElement | null;
        const heightInput = document.getElementById(this.heightInputId) as HTMLInputElement | null;
        const resolutionInput = document.getElementById(this.resInputId) as HTMLInputElement | null;

        if (fromInput) {
            fromInput.value = VEC4.text(this.#camera.from);
        }

        if (toInput) {
            toInput.value = VEC4.text(this.#camera.to);
        }

        if (upInput) {
            upInput.value = VEC4.text(this.#camera.up);
        }

        if (heightInput) {
            heightInput.value = this.#camera.getHeightToSurface().toString();
        }

        if (resolutionInput) {
            resolutionInput.value = this.#camera.getResolution().join(",");
        }



        this.tinyearth.eventBus.addEventListener(TinyEarthEvent.CAMERA_CHANGE, {
            callback: (info) => {
                if (info.camera === this.#camera) {
                    if (fromInput) {
                        fromInput.value = VEC4.text(this.#camera.from);
                    }
                    if (toInput) {
                        toInput.value = VEC4.text(this.#camera.to);
                    }
                    if (upInput) {
                        upInput.value = VEC4.text(this.#camera.up);
                    }
                    if (heightInput) {
                        heightInput.value = this.#camera.getHeightToSurface().toString();
                    }
                    if (resolutionInput) {
                        resolutionInput.value = this.#camera.getResolution().join(",");
                    }

                }
            }
        });

    }

}