/**
 * Audio processing.
 */

export class Player {
    private ping0: AudioBuffer;

    constructor(private readonly context: AudioContext) {
        this.context = context;
        (async () => {
            const response = await fetch("assets/ping0.mp3");
            const buffer = await response.arrayBuffer();
            this.ping0 = await context.decodeAudioData(buffer);
        })();
    }

    pingDemo(pan: number): void {
        const source = this.context.createBufferSource();
        source.buffer = this.ping0;
        const panNode = this.context.createStereoPanner();
        panNode.pan.value = pan;
        source.connect(panNode).connect(this.context.destination);
        source.start();
    }

    private decay(value: number, duration: number): GainNode {
        const node = this.context.createGain();
        node.gain.value = value;
        node.gain.exponentialRampToValueAtTime(value / 10, this.context.currentTime + duration);
        return node
    }

    ping(): void {
        const oscillator = this.context.createOscillator();
        oscillator.frequency.value = 1000;
        oscillator.type = "sine";
        oscillator.connect(this.decay(1.0, 0.1)).connect(this.context.destination);
        oscillator.start();
        oscillator.stop(this.context.currentTime + 0.1);
    }

    collision(): void {
        const oscillator = this.context.createOscillator();
        oscillator.frequency.setValueAtTime(200, this.context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.5);
        oscillator.type = "triangle";
        oscillator.connect(this.decay(1.0, 0.5)).connect(this.context.destination);
        oscillator.start();
        oscillator.stop(this.context.currentTime + 0.5);
    }

    finished(): void {
        const baseFrequency = 440;
        for (const frequency of [baseFrequency, baseFrequency * 1.5, baseFrequency * 2]) {
            const oscillator = this.context.createOscillator();
            oscillator.frequency.value = frequency;
            oscillator.type = "triangle";
            oscillator.connect(this.decay(0.5, 1.0)).connect(this.context.destination);
            oscillator.start();
            oscillator.stop(this.context.currentTime + 1.0);
        }
    }
}
