/**
 * Top-level wiring.
 */

import * as core from "./core.js";
import * as viz from "./viz.js";

///////////////////////////////////////////////////////////////////////////////
// Audio

class Player {
    context: AudioContext;
    ping0: AudioBuffer;

    constructor(context: AudioContext) {
        this.context = context;
        (async () => {
            const response = await fetch("assets/ping0.mp3");
            const buffer = await response.arrayBuffer();
            this.ping0 = await context.decodeAudioData(buffer);
        })();
    }

    play(pan: number): void {
        const source = this.context.createBufferSource();
        source.buffer = this.ping0;
        const panNode = this.context.createStereoPanner();
        panNode.pan.value = pan;
        source.connect(panNode).connect(this.context.destination);
        source.start();
    }
}

///////////////////////////////////////////////////////////////////////////////
// Input

class Keyboard {
    private pressed: Set<string> = new Set<string>();

    keyDown(e: KeyboardEvent): void {
        this.pressed.add(e.key);
    }
    keyUp(e: KeyboardEvent): void {
        this.pressed.delete(e.key);
    }
    isPressed(key: string): boolean {
        return this.pressed.has(key);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Startup

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("autoreload")) {
        console.log("Autoreloading");
        const script = document.createElement("script");
        script.src = "https://livejs.com/live.js";
        document.head.appendChild(script);
    }

    // Dev example
    const player = new Player(new window.AudioContext());
    addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === " ") {
            player.play(+((document.getElementById("pan") as HTMLInputElement).value));
        }
    });

    const keyboard = new Keyboard();
    addEventListener("keydown", e => keyboard.keyDown(e));
    addEventListener("keyup", e => keyboard.keyUp(e));

    fetch("assets/dev0.map.json").then(r => r.json()).then(function (json) {
        const map = json as core.GameMap;
        const renderer = new viz.Renderer(
            document.getElementById("screen") as HTMLCanvasElement, map, 5);
        const ship = core.Ship.create(map);
        window.setInterval(function () {
            const up = (keyboard.isPressed("w") || keyboard.isPressed("ArrowUp"));
            const down = (keyboard.isPressed("s") || keyboard.isPressed("ArrowDown"));
            const left = (keyboard.isPressed("a") || keyboard.isPressed("ArrowLeft"));
            const right = (keyboard.isPressed("d") || keyboard.isPressed("ArrowRight"));
            ship.tick(+up - +down, +right - +left);
            renderer.draw(ship);
        }, 1000 * core.TickTime);
    });
};
