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
        const source = new AudioBufferSourceNode(this.context, { buffer: this.ping0 });
        source.connect(new StereoPannerNode(this.context, { pan: pan })).connect(this.context.destination);
        source.start();
    }

    private decay(value: number, duration: number): GainNode {
        const node = new GainNode(this.context);
        node.gain.value = value;
        node.gain.exponentialRampToValueAtTime(value / 10, this.context.currentTime + duration);
        return node
    }

    private addEcho(source: AudioNode, delay: number, gain: number): void {
        source
            .connect(new DelayNode(this.context, { delayTime: delay, maxDelayTime: delay }))
            .connect(new GainNode(this.context, { gain: gain }))
            .connect(this.context.destination);
    }

    ping(): void {
        const oscillator = new OscillatorNode(this.context, { type: "sine", frequency: 1000 });

        const decay = oscillator.connect(this.decay(1.0, 0.1));
        decay.connect(this.context.destination);
        this.addEcho(decay, 0.2, 0.5);
        this.addEcho(decay, 0.4, 0.1);

        oscillator.start();
        oscillator.stop(this.context.currentTime + 0.1);
    }

    collision(): void {
        const oscillator = new OscillatorNode(this.context, { type: "triangle" });
        oscillator.frequency.setValueAtTime(200, this.context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.5);
        oscillator.connect(this.decay(1.0, 0.5)).connect(this.context.destination);
        oscillator.start();
        oscillator.stop(this.context.currentTime + 0.5);
    }

    finished(): void {
        const baseFrequency = 440;
        for (const frequency of [baseFrequency, baseFrequency * 1.5, baseFrequency * 2]) {
            const oscillator = new OscillatorNode(this.context, { type: "triangle", frequency: frequency });
            oscillator.connect(this.decay(0.5, 1.0)).connect(this.context.destination);
            oscillator.start();
            oscillator.stop(this.context.currentTime + 1.0);
        }
    }
}
