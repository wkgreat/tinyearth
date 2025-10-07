export const MOCK_TILE_URL = "mock://{x}/{y}/{z}";

export async function loadTileImage(url: string, x: number, y: number, z: number): Promise<HTMLImageElement | null> {
    if (url.startsWith("mock")) {
        return loadMockTileImage(url, x, y, z);
    } else {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => {
                console.warn(url);
                console.warn("loadImage ERROR: ", err);
                reject(err);
            }
            img.crossOrigin = "anonymous";
            img.src = url;
        });
    }
}

async function loadMockTileImage(url: string, x: number, y: number, z: number): Promise<HTMLImageElement | null> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");

        if (ctx === null) {
            resolve(null);
        } else {
            // 设置背景（可选）
            ctx.fillStyle = "#484848ff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = "red"
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);

            // 设置字体样式
            ctx.textAlign = "center";       // 水平居中
            ctx.textBaseline = "middle";    // 垂直居中
            ctx.fillStyle = "white";
            ctx.font = "24px Arial";
            ctx.fillText(`${z},${x},${y}`, canvas.width / 2, canvas.height / 2);

            // 转换为 image
            const imageData = canvas.toDataURL("image/png");

            const img = new Image();

            img.onload = () => resolve(img);
            img.onerror = (err) => {
                console.warn("loadImage ERROR: ", err);
                reject(err);
            }
            img.crossOrigin = "anonymous";
            img.src = imageData;;
        }
    });
}