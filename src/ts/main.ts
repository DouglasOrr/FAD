/**
 * Top-level wiring.
 */

import * as core from "./core.js";
import { Renderer } from "./renderer.js";
import { Player } from "./player.js";
import { Keyboard } from "./keyboard.js";
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

function createClicker(): utility.Event<void> {
    const clicker = new utility.Event<void>();
    window.addEventListener("click", () => { clicker.send() });
    return clicker;
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
        const player = new Player(new window.AudioContext());
        createClicker().listen(() => { player.resume() });
        const keyboard = new Keyboard(new Map<string, string[]>(Object.entries({
            up: ["w", "ArrowUp"],
            down: ["s", "ArrowDown"],
            left: ["a", "ArrowLeft"],
            right: ["d", "ArrowRight"],
            ping: [" "],
            toggleFAD: ["f"],
            cycleRoute: ["c"],
        })));
        const ship = core.Ship.create(map);
        keyboard.listen("toggleFAD", () => { ship.toggleFAD(); });
        keyboard.listen("cycleRoute", () => { ship.cycleRoute(); });
        ticker.listen(() => {
            ship.tick(
                +keyboard.has("up") - +keyboard.has("down"),
                +keyboard.has("right") - +keyboard.has("left"),
            );
            player.fad.set(ship.fadBearing);
        });
        ship.collisions.listen(() => {
            player.collision();
        });
        keyboard.listen("ping", () => {
            ship.ping();
        });
        ship.pongs.listen((e) => {
            player.ping(e);
        });
        ship.segmentChanged.listen(([route, segment]) => {
            console.log(`Segment ${route}:${segment}`);
        });

        // Debug only
        const renderer = new Renderer(
            map, ship, document.getElementById("screen") as HTMLCanvasElement,
            { scale: 5 },
        );
        ticker.listen(() => renderer.draw());
        ship.pongs.listen((e) => { renderer.addPongs(e); });
    });
};
