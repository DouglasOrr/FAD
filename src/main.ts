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
// Drawing

type DrawFn = (context: CanvasRenderingContext2D) => void;

function setupCanvas(canvas: HTMLCanvasElement, draw: DrawFn) {
    const context = canvas.getContext("2d");
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    draw(context);
    window.addEventListener("resize", () => {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        draw(context);
    });
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

    const player = new Player(new window.AudioContext());

    document.onkeydown = (e: KeyboardEvent) => {
        if (e.key === " ") {
            player.play(+((document.getElementById("pan") as HTMLInputElement).value));
        }
    };

    setupCanvas(document.getElementById("screen") as HTMLCanvasElement,
        (context: CanvasRenderingContext2D) => {
            context.fillStyle = "#000000";
            context.fillRect(0, 0, context.canvas.clientWidth, context.canvas.clientHeight);
        }
    );
};
