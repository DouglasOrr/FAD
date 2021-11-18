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

    private echo(source: AudioNode, delay: number, gain: number, pan: number): AudioNode {
        return source
            .connect(new DelayNode(this.context, { delayTime: delay, maxDelayTime: delay }))
            .connect(new GainNode(this.context, { gain: gain }))
            .connect(new StereoPannerNode(this.context, { pan: pan }));
    }

    ping(pongs: core.Pong[]): void {
        const startTime = this.context.currentTime + 0.01;
        const duration = 0.1;
        const oscillator = new OscillatorNode(this.context, { type: "sine", frequency: 500 });
        const decay = new GainNode(this.context);
        decay.gain.value = 0;
        decay.gain.linearRampToValueAtTime(0.5, startTime + duration / 2);
        decay.gain.linearRampToValueAtTime(0, startTime + duration);
        oscillator.connect(decay)
            .connect(new GainNode(this.context, { gain: 0.1 }))
            .connect(this.context.destination);

        let totalGain = 0;
        for (const pong of pongs) {
            totalGain += dbToGain(-pong.attenuation);
        }
        for (const pong of pongs) {
            const gain = dbToGain(-pong.attenuation) / totalGain;
            this.echo(decay, pong.delay, gain, Math.sin(pong.relativeBearing))
                .connect(this.context.destination);
        }
        console.log(totalGain);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    collision(): void {
        const startTime = this.context.currentTime + 0.01;
        const duration = 0.5;
        const oscillator = new OscillatorNode(this.context, { type: "triangle" });
        oscillator.frequency.setValueAtTime(200, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, startTime + duration);
        const decay = new GainNode(this.context, { gain: 0.1 });
        decay.gain.linearRampToValueAtTime(0.01, startTime + duration);
        oscillator.connect(decay).connect(this.context.destination);
        oscillator.start();
        oscillator.stop(startTime + duration);
    }

    finished(): void {
        const startTime = this.context.currentTime + 0.01;
        const duration = 1.0;
        const baseFrequency = 440;
        for (const frequency of [baseFrequency, baseFrequency * 1.5, baseFrequency * 2]) {
            const oscillator = new OscillatorNode(this.context, { type: "triangle", frequency: frequency });
            const decay = new GainNode(this.context, { gain: 0.1 });
            decay.gain.linearRampToValueAtTime(0.01, startTime + duration);
            oscillator.connect(decay).connect(this.context.destination);
            oscillator.start();
            oscillator.stop(this.context.currentTime + duration);
        }
    }
}
