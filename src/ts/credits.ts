/**
 * A fancy credits screen.
 */

const Credits: Array<[string, number, number, number]> = [
    ["Sound effects - Zapsplat", 1.4, 0.5, 1.1],
    ["Credits music - Pioxonaq, Zapsplat", 2.0, 0.7, 0.9],
    ["Programming - Doug Orr", 3.3, 0.9, 1.3],
    ["Script - Doug Orr", 3.5, 0.7, 1.0],
    ["Other voices - Doug Orr", 3.1, 0.8, 0.9],
    ["Marsha - Miriam Orr", 4.3, 0.8, 1.3],
    ["Graphics - Miriam Orr", 4.4, 0.6, 1],
    ["Thanks - Audacity, VS Code, GitHub, MDN & others", 5.7, 0.1, 0.7],
];

export function roll(background: HTMLCanvasElement, foreground: HTMLCanvasElement, leftEdge: number): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    background.width = foreground.width = width;
    background.height = foreground.height = height;

    const radius = 0.95 * (Math.min(width - leftEdge, height) / 2);
    const ox = leftEdge + radius;
    const oy = height / 2;

    const bgCtx = background.getContext("2d");
    const fgCtx = foreground.getContext("2d");
    const delta = 0.01;
    const fades = Credits.map(() => 0);
    let angle = 1.25 * Math.PI;
    function draw() {
        // Fade
        bgCtx.fillStyle = "#00000010"
        bgCtx.fillRect(0, 0, width, height);

        // Sweep
        bgCtx.strokeStyle = "#00ff0080";
        bgCtx.lineWidth = 5;
        bgCtx.beginPath();
        bgCtx.moveTo(ox, oy);
        bgCtx.lineTo(ox + radius * Math.cos(angle), oy + radius * Math.sin(angle));
        bgCtx.stroke();

        // Credits
        fgCtx.clearRect(0, 0, width, height);
        for (const idx in Credits) {
            const [text, tAngle, tRadius, tSize] = Credits[idx];
            const markerRadius = radius / 80;
            const mx = ox + radius * tRadius * Math.cos(tAngle);
            const my = oy + radius * tRadius * Math.sin(tAngle);
            const refresh = 255 * (fades[idx] < 0.01 ? 0 : fades[idx]);
            const r = Math.max((refresh - 64) / 2, 0);
            const g = refresh;
            const b = Math.max((refresh - 128) / 4, 0);

            // Marker
            const gradient = fgCtx.createRadialGradient(mx, my, 0, mx, my, markerRadius);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${refresh})`);
            fgCtx.fillStyle = gradient;
            fgCtx.beginPath();
            fgCtx.moveTo(mx, my);
            fgCtx.arc(mx, my, markerRadius, 0, 2 * Math.PI);
            fgCtx.fill();

            // Label
            fgCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${refresh})`;
            fgCtx.font = `100 small-caps ${Math.round(tSize * radius / 20)}px sans-serif`;
            fgCtx.fillText(text, mx + 15, my + 15);
        }

        for (const idx in Credits) {
            const tAngle = Credits[idx][1];
            if (angle < tAngle && tAngle <= angle + delta) {
                fades[idx] = 1;
            } else {
                fades[idx] *= 0.99;
            }
        }
        angle += delta;
        angle %= 2 * Math.PI;
    }

    window.setInterval(draw, 10);
}
