import type { TileProvider } from "../tilerender";
import { TileResources, type TileSourceInfo } from "../tilesource";
import { BaseHelper, type BaseHelperOptions } from "./helper";

export interface TileProviderHelperOptions extends BaseHelperOptions {
    provider: TileProvider
    title?: string;
    enableTileSelector?: boolean;
};

export default class TileProviderHelper extends BaseHelper {

    provider: TileProvider;
    title: string;
    enableTileSelector: boolean;

    tileProviderHelperDivId: string = "";
    startOrStopCheckBoxId: string = "";
    tileSelectId: string = "";

    constructor(options: TileProviderHelperOptions) {
        super({ tinyearth: options.tinyearth });
        this.provider = options.provider;
        this.title = options.title ?? "Provider";
        this.enableTileSelector = options.enableTileSelector ?? false;
    }

    createElement(): HTMLDivElement | null {
        this.element = this.createTileProviderElement();
        return this.element;
    }

    createTileProviderElement() {

        this.tileProviderHelperDivId = `tile-provider-helper-${crypto.randomUUID()}`;
        this.startOrStopCheckBoxId = `tile-provider-start-stop-checkbox-${crypto.randomUUID()}`

        const providerCheckboxItem = this.createItem(
            this.createLabel("Start/Stop"),
            this.createInput(this.startOrStopCheckBoxId, "checkbox")
        );
        const tileSelectItem = this.createTileSelectorItem();

        const element = this.createHelperDiv(this.tileProviderHelperDivId, this.title, [providerCheckboxItem, tileSelectItem]);
        return element;
    }

    #createTileOptions() {
        let options = "";

        for (const key of Object.keys(TileResources)) {
            const info = TileResources[key as keyof typeof TileResources] as TileSourceInfo;
            options = `${options}<option value="${info.name}">${info.name}</option>`
        }
        return options;
    }

    createTileSelectorItem(): HTMLDivElement | null {
        if (this.enableTileSelector) {
            this.tileSelectId = `tile-provider-tile-select-${crypto.randomUUID()}`;
            const item = this.createItem(
                this.createLabel("Tile Source"),
                this.createElementWithId("select", this.tileSelectId, this.#createTileOptions())
            );
            return item;
        } else {
            return null;
        }

    }

    afterAddToContainer(): void {
        const checkbox = document.getElementById(this.startOrStopCheckBoxId) as HTMLInputElement | null;

        if (checkbox) {
            checkbox.checked = !this.provider.isStop();
            checkbox.addEventListener("change", (event) => {
                if ((event as any).target.checked) { // TODO resolve any type
                    this.provider.start();
                } else {
                    this.provider.stop();
                }
            });
        } else {
            console.error("addTileProviderHelper checkbox is null.");
        }

        if (this.enableTileSelector) {
            const tileSelect = document.getElementById(this.tileSelectId) as HTMLInputElement | null;

            if (tileSelect) {

                tileSelect.value = this.provider.source.name;

                tileSelect.addEventListener('change', event => {
                    const tileName = (event as any).target.value; // TODO resovle any type

                    let tileInfo: TileSourceInfo | null = null;
                    for (const key of Object.keys(TileResources)) {
                        const info = TileResources[key as keyof typeof TileResources] as TileSourceInfo;
                        if (info.name === tileName) {
                            tileInfo = info;
                        }
                    }

                    if (tileInfo) {
                        this.provider.changeTileSource(tileInfo);
                    } else {
                        console.warn("tileinfo is null");
                    }
                });
            }
        }
    }
}