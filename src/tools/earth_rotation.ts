import { TinyEarthEvent } from "../event";
import { BaseHelper, type BaseHelperOptions } from "../helpers/helper";
import type Timer from "../timer";
import type TinyEarth from "../tinyearth";
import type { BaseToolOptions } from "./tool";
import BaseTool from "./tool";

/**
 * The options of EarthRotationTool
*/
export interface EarthRotationToolOptions extends BaseToolOptions {
    /**
     * angular velocity (radians/ms) of earth self rotation
     * optional, default value is real earth self roation velocity.
    */
    velocity?: number;
}

/**
 * real earth self roation velocity
*/
export const DefaultEarthRotationVelocity: number = Math.PI / (12 * 3600 * 1000);

/**
 * tool for simulating the earth self rotaion.
 * this effect is actualy the camera rotation, not real earth object rotation.
 * because thie world coordinate system is ECEF, the earth cannot rotaion in ECEF system.
 * {@link ../../docs/source/camera.md | Earth Self Rotation Effect}
*/
export default class EarthRotationTool extends BaseTool {

    #callbackId: string | null = null;
    #velocity: number;

    constructor(options: EarthRotationToolOptions) {
        super({ tinyearth: options.tinyearth });
        this.#velocity = options.velocity ?? DefaultEarthRotationVelocity;
    }

    enable() {
        const callback = (timer: Timer) => {
            const dt = timer.deltaTime;
            const w = this.#velocity * dt;
            this.tinyearth.scene.camera.roundForEarthSelfRotationEffect(w);
        };
        this.#callbackId = this.tinyearth.eventBus.addEventListener(TinyEarthEvent.TIMER_TICK, { callback });
    }

    disable() {
        if (this.#callbackId) {
            this.tinyearth.eventBus.removeEventListener(TinyEarthEvent.TIMER_TICK, this.#callbackId);
            this.#callbackId = null;
        }
    }

    get enabled(): boolean {
        return !!this.#callbackId;
    }

};


export interface EarthRotationToolHelperOptions extends BaseHelperOptions {
    tool: EarthRotationTool
}

export class EarthRotationToolHelper extends BaseHelper {

    tool: EarthRotationTool;
    title: string = "EarthRotationTool";
    helperId: string = "earthrotationtool-helper";
    enableCheckboxId: string = "earthrotationtool-helper-enable-checkbox";

    constructor(options: EarthRotationToolHelperOptions) {
        super(options);
        this.tool = options.tool;
        this.title = options.title ?? "EarthRotationTool";
    }

    createElement(): HTMLDivElement | null {
        const item = this.createItem(
            this.createLabel("Enable"),
            this.createInput(this.enableCheckboxId, "checkbox")
        );
        this.element = this.createHelperDiv(this.helperId, this.title, [item]);
        return this.element;
    }
    afterAddToContainer(): void {
        const enableCheckbox = document.getElementById(this.enableCheckboxId) as HTMLInputElement | null;

        if (enableCheckbox) {

            enableCheckbox.checked = this.tool.enabled;

            enableCheckbox.addEventListener("change", (event) => {
                if ((event as any).target.checked) { // TODO resolve any type
                    this.tool.enable();
                } else {
                    this.tool.disable();
                }
            });

        }

    }

}