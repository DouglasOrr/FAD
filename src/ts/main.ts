/**
 * Top-level wiring.
 */

import * as core from "./core.js";
import * as mrenderer from "./renderer.js";
import { Player } from "./player.js";
import { Keyboard } from "./keyboard.js";
import * as utility from "./utility.js";
import * as levels from "./levels.js";

function createTicker(multiplier: number): utility.Event<number> {
    const ticker = new utility.Event<number>();
    let counter = 0;
    window.setInterval(() => {
        ticker.send(counter++);
    }, 1000 * core.TickTime / multiplier);
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
    let debugRender: mrenderer.Settings = null;
    if (params.has("debug")) {
        debugRender = {
            canvas: document.getElementById("screen") as HTMLCanvasElement,
            scale: 5,
            showPongTime: 1,
        };
    }
    let levelIndex = 0;
    if (params.has("level")) {
        levelIndex = parseInt(params.get("level"));
    }
    let speed = 1;
    if (params.has("speed")) {
        speed = parseFloat(params.get("speed"));
    }

    const ticker = createTicker(speed);
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
        replay: ["r"],
        beacon: ["k"],
    })));
    let level: levels.Level = null;
    ticker.listen(count => {
        level?.tick(
            count,
            +keyboard.has("up") - +keyboard.has("down"),
            +keyboard.has("right") - +keyboard.has("left"),
        );
    });
    keyboard.listen("toggleFAD", () => { level?.toggleFAD(); });
    keyboard.listen("cycleRoute", () => { level?.cycleRoute(); });
    keyboard.listen("ping", () => { level?.ping(); });
    keyboard.listen("beacon", () => { level?.beacon(); });
    keyboard.listen("replay", () => { level?.replay(); });
    function loadNextLevel() {
        levels.load(player, debugRender, levelIndex).then(lvl => {
            level = lvl;
            levelIndex += 1;
            level.finished.listen(loadNextLevel);
        })
    }
    player.whenEnabled(loadNextLevel);
};
