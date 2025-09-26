import TinyEarth from "./tinyearth.js";

/**
 * @param {TinyEarth} tinyearth 
*/
export function addMenu(tinyearth) {
    const menu = document.getElementById('contextMenu');
    // 禁止默认右键菜单
    tinyearth.canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();

        // 显示自定义菜单
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.style.display = 'block';
    });

    // 点击任意处隐藏菜单
    document.addEventListener('click', function () {
        menu.style.display = 'none';
    });
}