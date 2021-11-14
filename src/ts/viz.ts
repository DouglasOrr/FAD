/**
 * Debug rendering of the map.
 */

import * as core from "./core.js";

const ShowPongTime = 1;

export class Renderer {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly background: ImageData;
    private pongs: core.Pong[];
    private pongTTL = -1;

    constructor(
        readonly map: core.GameMap,
        readonly ship: core.Ship,
        canvas: HTMLCanvasElement,
        readonly options: { scale: number },
    ) {
        canvas.width = options.scale * map.width;
        canvas.height = options.scale * map.height;
        this.ctx = canvas.getContext("2d");
        // Pre-render the background image
        this.background = this.ctx.createImageData(canvas.width, canvas.height);
        const data = this.background.data;
        const cellTypeToGrayscale = [255, 0, 192];
        // Manually scale the image up - not pretty!
        for (let y = 0; y < map.width; ++y) {
            for (let x = 0; x < map.width; ++x) {
                const gray = cellTypeToGrayscale[map.cells[y * map.width + x]];
                for (let yy = 0; yy < options.scale; ++yy) {
                    for (let xx = 0; xx < options.scale; ++xx) {
                        const idx = map.width * options.scale * (options.scale * y + yy)
                            + (options.scale * x + xx);
                        data[4 * idx + 0] = gray
                        data[4 * idx + 1] = gray;
                        data[4 * idx + 2] = gray;
                        data[4 * idx + 3] = 255;
                    }
                }
            }
        }
    }

    addPongs(pongs: core.Pong[]) {
        this.pongs = pongs;
        this.pongTTL = ShowPongTime;
    }

    draw(): void {
        // Background
        this.ctx.putImageData(this.background, 0, 0);

        // Transform
        this.ctx.resetTransform();
        this.ctx.scale(this.options.scale, this.options.scale);

        // Breadcrumbs
        this.ctx.strokeStyle = "#ff0000";
        this.ctx.lineWidth = .5 / this.options.scale;
        this.ctx.beginPath();
        this.ctx.moveTo(this.map.start[0] + 0.5, this.map.start[1] + 0.5);
        for (const breadcrumb of this.map.breadcrumbs) {
            this.ctx.lineTo(breadcrumb[0] + 0.5, breadcrumb[1] + 0.5);
        }
        this.ctx.stroke();

        // Pongs
        if (this.pongTTL > 0) {
            for (const pong of this.pongs) {
                this.ctx.fillStyle = "#00ff00";
                this.ctx.fillRect(pong.hit[0], pong.hit[1], 1, 1);
            }
            this.pongTTL -= core.TickTime;
        }

        // Ship
        this.ctx.beginPath();
        this.ctx.arc(this.ship.position[0], this.ship.position[1], core.ShipRadius, 0, 2 * Math.PI);
        this.ctx.fillStyle = "#ff0000";
        this.ctx.fill();
        const shipFrontAngle = 0.25 * Math.PI;
        this.ctx.beginPath();
        this.ctx.moveTo(this.ship.position[0], this.ship.position[1]);
        this.ctx.arc(this.ship.position[0], this.ship.position[1], core.ShipRadius + 0.25,
            Math.PI / 2 - shipFrontAngle + this.ship.bearing,
            Math.PI / 2 + shipFrontAngle + this.ship.bearing);
        this.ctx.fillStyle = "#0000ff";
        this.ctx.fill();
    }
}

