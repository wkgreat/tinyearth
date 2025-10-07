import TinyEarth from "../tinyearth.js";

export interface TinyEarthHelperContainerOptions {
    id: string;
    tinyearth: TinyEarth;
}

export class TinyEarthHelperContainer {
    id: string;
    tinyearth: TinyEarth;
    div: HTMLDivElement | null = null;
    helpers: BaseHelper[] = [];

    constructor(options: TinyEarthHelperContainerOptions) {
        this.id = options.id;
        this.tinyearth = options.tinyearth;
        this.div = this.getElement();
    }

    addHelper(helper: BaseHelper) {
        this.helpers.push(helper);
        helper.addToContainer(this);
    }

    getElement(): HTMLDivElement | null {
        if (this.div) {
            return this.div;
        } else {
            const div = document.getElementById(this.id) as HTMLDivElement | null;
            if (div) {
                div.className = "cls-tinyearth-helper-container";
            }
            return div;
        }
    }
}

export interface BaseHelperOptions {
    tinyearth: TinyEarth
    title?: string;
}

export abstract class BaseHelper {

    tinyearth: TinyEarth;
    element: HTMLDivElement | null = null;
    container: TinyEarthHelperContainer | null = null;

    constructor(options: BaseHelperOptions) {
        this.tinyearth = options.tinyearth;
    }

    abstract createElement(): HTMLDivElement | null;

    abstract afterAddToContainer(): void;

    addToContainer(container: TinyEarthHelperContainer) {
        this.element = this.createElement();
        const containerElement = container.getElement();
        if (containerElement) {
            if (this.element) {
                containerElement.appendChild(this.element);
                this.container = container;
            }
        }
        this.afterAddToContainer();
    }

    createHelperDiv(id: string, title: string, items: (HTMLDivElement | null)[]): HTMLDivElement | null {
        const container = document.createElement('div') as HTMLDivElement | null;
        if (container) {
            container.id = id;
            container.className = "cls-tinyearth-helper-div";

            const titleDiv = document.createElement('div') as HTMLDivElement | null;
            if (titleDiv) {
                titleDiv.className = "cls-tinyearth-helper-title-div";
                titleDiv.innerHTML = title;
                container.appendChild(titleDiv);
            }

            const bodyDiv = document.createElement('div') as HTMLDivElement | null;
            if (bodyDiv) {
                bodyDiv.className = "cls-tinyearth-helper-body-div";
                for (const item of items) {
                    if (item) {
                        bodyDiv.appendChild(item);
                    }
                }
                container.appendChild(bodyDiv);
            }

        }
        return container;
    }

    createItem(...elements: (HTMLElement | null)[]): HTMLDivElement | null {
        const div = document.createElement('div') as HTMLDivElement | null;
        if (div) {
            div.className = "cls-tinyearth-helper-item-div";
            for (const e of elements) {
                if (e) {
                    div.appendChild(e);
                }
            }
        }
        return div;
    }

    createLabel(text: string, id?: string) {
        const label = document.createElement("label") as HTMLLabelElement | null;
        if (label) {
            label.innerHTML = text;
            if (id) {
                label.id = id;
            }
        }
        return label;
    }

    createElementWithId(tagName: string, id: string, innerHTML: string = "") {
        const elem = document.createElement(tagName);
        if (elem) {
            elem.id = id;
            elem.innerHTML = innerHTML;
        }
        return elem;
    }

    createInput(id: string, type: string = 'text', props?: object) {

        const input = this.createElementWithId('input', id) as HTMLInputElement | null;
        if (input) {
            Object.assign(input, props);
            input.id = id;
            input.type = type;
        }

        return input;
    }

}