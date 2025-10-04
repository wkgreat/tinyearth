import TinyEarth from "../tinyearth.js";

export function createHelperDiv(id: string, title: string = "helper", innerHtml: string = ""): HTMLDivElement {
    const container = document.createElement('div');
    container.id = id;
    container.className = "cls-helper-div";
    const titleDivId = `tinyearth-helper-title-div-${crypto.randomUUID()}`
    container.innerHTML = `
        <div id="${titleDivId}" class="cls-tinyearth-helper-title-div">${title}</div>
        <div class='cls-tinyearth-helper-body-div'>${innerHtml}</div>`;
    return container;
}

export function addDebugHelper(root: HTMLDivElement, tinyearth: TinyEarth) {

    const drawCheckboxId = `$tinyearth-draw-checkbox-${crypto.randomUUID()}`;

    const innerHTML = `
    <div>
        <label>停止渲染</label>
        <input type="checkbox" id=${drawCheckboxId}></input>
    </div>
    `;

    const div = createHelperDiv("tinyearth-debug-helper", "Debugger Helper", innerHTML);
    root.appendChild(div);

    const checkbox = document.getElementById(drawCheckboxId) as HTMLInputElement;

    checkbox.checked = !tinyearth.isStartDraw();
    checkbox.addEventListener("change", (event) => {
        if ((event as any).target.checked) { // TODO resolve any type
            tinyearth.stopDraw();
        } else {
            tinyearth.startDraw();
        }
    });

}