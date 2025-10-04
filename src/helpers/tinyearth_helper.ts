import { createHelperDiv } from "./helper";
import type TinyEarth from "../tinyearth";
import Color from "../color";

export default class TinyEarthHelper {

    tinyearth: TinyEarth;
    helperId = "tinyearth-helper";
    helper: HTMLDivElement | null = null;
    nightCheckboxId = "tinyearth-helper-night-checkbox";
    skyboxCheckboxId = "tinyearth-helper-skybox-checkbox";
    bgcolorInputId = "tinyearth-helper-bgcolor-input";
    bgcolorAlphaInputId = "tinyearth-helper-bgcolor-alpha-input"


    constructor(tinyearth: TinyEarth) {
        this.tinyearth = tinyearth;
    }

    addTo(div: HTMLDivElement) {

        const innerHTML = `
        <div>
            <label>TinyEarth Options</label></br>
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
            <label>Background Alpha:</label>
            <input type="range" id="${this.bgcolorAlphaInputId}" min="0" max="1" step="0.01"></input>
            </div>
        </div>
        `

        this.helper = createHelperDiv(this.helperId, innerHTML);

        div.appendChild(this.helper);

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

    }
}