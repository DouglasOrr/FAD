/**
 * Top-level wiring.
 */

import * as core from "./core.js";
import * as viz from "./viz.js";
import * as sound from "./sound.js";
import * as input from "./input.js";
import * as utility from "./utility.js";

async function loadMap(name: string): Promise<core.GameMap> {
    return fetch(`assets/${name}.map.json`)
        .then(r => r.json())
        .then(j => j as core.GameMap);
}

function createTicker(): utility.Event<void> {
    const ticker = new utility.Event<void>();
    window.setInterval(() => ticker.send(), 1000 * core.TickTime);
    return ticker;
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
        const ticker = createTicker();
        const player = new sound.Player(new window.AudioContext());
        const keyboard = new input.Keyboard(new Map<string, string[]>(Object.entries({
            up: ["w", "ArrowUp"],
            down: ["s", "ArrowDown"],
            left: ["a", "ArrowLeft"],
            right: ["d", "ArrowRight"],
            ping: [" "],
            toggleAutolocator: ["f"],
            playCollision: ["1"],
            playPing: ["2"],
            playFinished: ["3"],
            playDemo: ["9"],
        })));
        keyboard.listen("toggleAutolocator", () => { player.autolocator.toggle(); });
        keyboard.listen("playCollision", () => { player.collision(); });
        keyboard.listen("playPing", () => { player.ping([]); });
        keyboard.listen("playFinished", () => { player.finished(); });
        keyboard.listen("playDemo", () => {
            player.pingDemo(+((document.getElementById("pan") as HTMLInputElement).value));
        });
        const ship = core.Ship.create(map);
        ticker.listen(() => {
            ship.tick(
                +keyboard.has("up") - +keyboard.has("down"),
                +keyboard.has("right") - +keyboard.has("left"),
            );
            player.autolocator.set(ship.relativeBreadcrumbBearing);
        });
        ship.collisions.listen(() => {
            player.collision();
        });
        ship.finished.listen(() => {
            player.finished();
        });
        keyboard.listen("ping", () => {
            ship.ping();
        });
        ship.pongs.listen((e) => {
            player.ping(e);
        });

        // Debug only
        const renderer = new viz.Renderer(
            map, ship, document.getElementById("screen") as HTMLCanvasElement,
            { scale: 5 },
        );
        ticker.listen(() => renderer.draw());
        ship.pongs.listen((e) => { renderer.addPongs(e); });
    });
};
