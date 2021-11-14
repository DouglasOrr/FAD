/**
 * Audio processing.
 */

import * as core from "./core.js";

function dbToGain(db: number): number {
    return Math.pow(10, db / 20);
}

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

    ping(pongs: core.Pong[]): void {
        const duration = 0.1;
        const oscillator = new OscillatorNode(this.context, { type: "sine", frequency: 1000 });
        const decay = new GainNode(this.context);
        decay.gain.value = 0;
        decay.gain.linearRampToValueAtTime(0.5, this.context.currentTime + duration / 10);
        decay.gain.linearRampToValueAtTime(0, this.context.currentTime + duration);
        oscillator.connect(decay).connect(this.context.destination);

        for (const pong of pongs) {
            const gain = dbToGain(-pong.attenuation) / pongs.length;
            if (0.01 < gain) {
                this.addEcho(decay, pong.delay, gain);
            }
        }
        oscillator.start();
        oscillator.stop(this.context.currentTime + duration);
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
