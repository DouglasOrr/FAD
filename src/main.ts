export function name() {
    return "ping";
}

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("autoreload")) {
        console.log("Autoreloading");
        const script = document.createElement("script");
        script.src = "https://livejs.com/live.js";
        document.head.appendChild(script);
    }

    document.onkeydown = (e: KeyboardEvent) => {
        if (e.key === " ") {
            new Audio("assets/ping0.mp3").play()
        }
    };
};
