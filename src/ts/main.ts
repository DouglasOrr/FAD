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

    fetch("assets/dev0.map.json").then(r => r.json()).then(function (json) {
        const map = json as viz.GameMap;
        const renderer = new viz.Renderer(
            document.getElementById("screen") as HTMLCanvasElement, map, 5);
        const ship = {
            position: map.start.slice() as viz.Vector,
            bearing: map.start_bearing,
        };
        window.setInterval(function () {
            ship.position[1] += 0.1;
            // console.log(ship.position);
            renderer.draw(ship);
        }, 100);
        renderer.draw(ship);
    });
};
