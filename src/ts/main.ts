/**
 * Top-level wiring.
 */

import * as core from "./core.js";
import * as viz from "./viz.js";
import * as sound from "./sound.js";
import * as input from "./input.js";

async function loadMap(name: string): Promise<core.GameMap> {
    return fetch(`assets/${name}.map.json`)
        .then(r => r.json())
        .then(j => j as core.GameMap);
}

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("autoreload")) {
        console.log("Autoreloading");
        const script = document.createElement("script");
        script.src = "https://livejs.com/live.js";
        document.head.appendChild(script);
    }

    loadMap("dev0").then(map => {
        const player = new sound.Player(new window.AudioContext());
        const keyboard = new input.Keyboard(new Map<string, string[]>(Object.entries({
            up: ["w", "ArrowUp"],
            down: ["s", "ArrowDown"],
            left: ["a", "ArrowLeft"],
            right: ["d", "ArrowRight"],
            playCollision: ["1"],
            playPing: ["2", " "],
            playFinished: ["3"],
            playDemo: ["9"],
        })));
        keyboard.listen("playCollision", () => { player.collision(); });
        keyboard.listen("playPing", () => { player.ping(); });
        keyboard.listen("playFinished", () => { player.finished(); });
        keyboard.listen("playDemo", () => {
            player.pingDemo(+((document.getElementById("pan") as HTMLInputElement).value));
        });
        const renderer = new viz.Renderer(
            document.getElementById("screen") as HTMLCanvasElement, map, 5);
        const ship = core.Ship.create(map);
        window.setInterval(function () {
            ship.tick(
                +keyboard.has("up") - +keyboard.has("down"),
                +keyboard.has("right") - +keyboard.has("left"),
            );
            renderer.draw(ship);
        }, 1000 * core.TickTime);
        ship.collisions.listen(e => {
            const [ship, hit] = e;
            console.log(ship.position, hit);
            player.collision();
        })
        ship.finished.listen(() => {
            player.finished();
        })
    });
};
