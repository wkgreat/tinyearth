import Color from "../color";
import { BaseHelper, type BaseHelperOptions } from "./helper";

export interface TinyEarthHelperOptions extends BaseHelperOptions {};

export default class TinyEarthHelper extends BaseHelper {

    helperId = "tinyearth-helper";
    nightCheckboxId = "tinyearth-helper-night-checkbox";
    skyboxCheckboxId = "tinyearth-helper-skybox-checkbox";
    bgcolorInputId = "tinyearth-helper-bgcolor-input";
    bgcolorAlphaInputId = "tinyearth-helper-bgcolor-alpha-input"
    renderCheckboxId = "tinyearth-render-checkbox"
    title: string = "";


    constructor(options: TinyEarthHelperOptions) {
        super(options);
        this.title = options.title ?? "Tinyearth Helper"
    }

    createElement(): HTMLDivElement | null {

        const innerHTML = `
        <div>
            <div>
            <label>Enable Night:</label>
            <input type="checkbox" id="${this.nightCheckboxId}"></input>
            </div>
            <div>
            <label>Enable Skybox:</label>
            <input type="checkbox" id="${this.skyboxCheckboxId}"></input>
            </div>
            <div>
            <label>Background Color:</label>
            <input type="color" id="${this.bgcolorInputId}"></input>
            </div>
            <div>
            <label>Background Alpha:</label>
            <input type="range" id="${this.bgcolorAlphaInputId}" min="0" max="1" step="0.01"></input>
            </div>
            <div>
            <label>Render Start/Stop</label>
            <input type="checkbox" id=${this.renderCheckboxId}></input>
            </div>
        </div>
        `

        const item0 = this.createItem(
            this.createLabel("Enable Night"),
            this.createInput(this.nightCheckboxId, "checkbox")
        );
        const item1 = this.createItem(
            this.createLabel("Enable Skybox"),
            this.createInput(this.skyboxCheckboxId, "checkbox")
        );
        const item2 = this.createItem(
            this.createLabel("Background Color"),
            this.createInput(this.bgcolorInputId, "color")
        );
        const item3 = this.createItem(
            this.createLabel("Background Alpha"),
            this.createInput(this.bgcolorAlphaInputId, "range", { min: "0", max: "1", step: "0.01" })
        );
        const item4 = this.createItem(
            this.createLabel("Render Start/Stop"),
            this.createInput(this.renderCheckboxId, "checkbox")
        );


        return this.createHelperDiv(this.helperId, this.title, [item0, item1, item2, item3, item4]);
    }

    afterAddToContainer() {
        const nightCheckbox = document.getElementById(this.nightCheckboxId) as HTMLInputElement;

        nightCheckbox.checked = this.tinyearth.night;

        nightCheckbox.addEventListener("change", (event) => {
            if ((event as any).target.checked) { // TODO resolve any type
                this.tinyearth.enableNight();
            } else {
                this.tinyearth.disableNight();
            }
        });

        const skyboxCheckbox = document.getElementById(this.skyboxCheckboxId) as HTMLInputElement;

        skyboxCheckbox.checked = this.tinyearth.skybox;

        skyboxCheckbox.addEventListener("change", (event) => {
            if ((event as any).target.checked) { // TODO resolve any type
                this.tinyearth.enableSkybox();
            } else {
                this.tinyearth.disableSkybox();
            }
        });

        const bgcolorInput = document.getElementById(this.bgcolorInputId) as HTMLInputElement;

        bgcolorInput.value = this.tinyearth.getBackGroudColor().toHex();

        bgcolorInput.addEventListener("input", (event) => {
            let hex = (event as any).target.value
            const color = Color.build(hex);
            color?.setAlpha(this.tinyearth.getBackGroudColor().a);
            if (color !== null) {
                this.tinyearth.setBackGroudColor(color);
            }
        });

        const bgColorAlphaInput = document.getElementById(this.bgcolorAlphaInputId) as HTMLInputElement;

        bgColorAlphaInput.value = this.tinyearth.getBackGroudColor().a.toString();

        bgColorAlphaInput.addEventListener("input", (event) => {
            let v = (event as any).target.value
            this.tinyearth.getBackGroudColor().setAlpha(v);
        });

        const renderCheckBox = document.getElementById(this.renderCheckboxId) as HTMLInputElement;

        if (renderCheckBox) {
            renderCheckBox.checked = this.tinyearth.isStartDraw();
            renderCheckBox.addEventListener("change", (event) => {
                if ((event as any).target.checked) { // TODO resolve any type
                    this.tinyearth.startDraw();
                } else {
                    this.tinyearth.stopDraw();
                }
            });
        }


    }
}