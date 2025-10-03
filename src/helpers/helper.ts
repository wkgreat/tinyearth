import TinyEarth from "../tinyearth.js";

export function createHelperDiv(id: string, innerHtml: string = ""): HTMLDivElement {
    const container = document.createElement('div');
    container.id = id;
    container.className = "cls-helper-div";
    container.style = "border: 1px solid black; padding: 10px;"
    container.innerHTML = innerHtml;
    return container;
}

export function addDebugHelper(root: HTMLDivElement, tinyearth: TinyEarth) {

    const drawCheckboxId = `$tinyearth-draw-checkbox-${crypto.randomUUID()}`;

    const innerHTML = `
    <div>
        <label>调试器</label></br>
        <label>停止渲染</label>
        <input type="checkbox" id=${drawCheckboxId}></input>
    </div>
    `;

    const div = createHelperDiv("tinyearth-debug-helper", innerHTML);
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