/**
 * Top-level wiring.
 */

import * as core from "./core.js";
import * as mrenderer from "./renderer.js";
import { Player } from "./player.js";
import { Keyboard } from "./keyboard.js";
import * as utility from "./utility.js";
import * as levels from "./levels.js";
import * as credits from "./credits.js";

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
        const script = document.createElement("script");
        script.src = "https://livejs.com/live.js";
        document.head.appendChild(script);
    }
    let debugRender: mrenderer.Settings = null;
    if (params.has("debug")) {
        debugRender = {
            canvas: document.getElementById("screen-debug") as HTMLCanvasElement,
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
        document.getElementById("note-attribution").hidden = (levelIndex <= 5);
        document.getElementById("note-start").hidden = true;
        document.getElementById("note-check-speakers").hidden = (levelIndex !== 0);
        document.getElementById("cover").hidden = (1 <= levelIndex && levelIndex <= 5);
        document.getElementById("screen-debug").hidden = (levelIndex === 6);

        if (levelIndex <= 5) {
            levels.load(player, debugRender, levelIndex).then(lvl => {
                level = lvl;
                levelIndex += 1;
                level.finished.listen(loadNextLevel);
            });
        } else {
            player.play("assets/music_credits.mp3", { volume: 0.3 });
            credits.roll(
                document.getElementById("screen-credits-bg") as HTMLCanvasElement,
                document.getElementById("screen-credits-fg") as HTMLCanvasElement,
                document.getElementById("cover").getBoundingClientRect().right,
            );
        }
    }
    // Only start after a click/key & player enabled
    let started = false;
    function start() {
        if (!started) {
            player.resume();
            player.whenEnabled(loadNextLevel);
            started = true;
        }
    }
    createClicker().listen(start);
    window.addEventListener("keypress", (e: KeyboardEvent) => {
        if (e.key === " ") { start(); }
    });
};
