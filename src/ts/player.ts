/**
 * Audio processing.
 */

import * as core from "./core.js";
import * as utility from "./utility.js";

export function dbToGain(db: number): number {
    return Math.pow(10, db / 20);
}

export function triangleWave(x: number): number {
    let delta = x / (2 * Math.PI) + 0.25;
    delta -= Math.floor(delta);
    return 1 - 4 * Math.abs(delta - 0.5);
}

const FADBaseGain = 0.05;
const FADBaseFrequency = 150;
const FADExponent = 1.5;

class FAD {
    private readonly positive: GainNode;
    private readonly negative: GainNode;

    constructor(private readonly context: AudioContext) {
        const startTime = this.context.currentTime + 0.1;
        this.positive = this.start(startTime, FADBaseFrequency * 4 / 3);
        this.negative = this.start(startTime, FADBaseFrequency);
        this.set(null);
    }

    set(direction: number | null) {
        if (direction === null) {
            this.positive.gain.value = 0;
            this.negative.gain.value = 0;
            return;
        }
        direction /= Math.PI;
        // This function looks like this:
        //          /\
        //    \    /  \
        //     ---+
        //   -1   0   1
        this.positive.gain.value = FADBaseGain * Math.pow(
            (direction < 0) ? Math.max(-1 - 3 / 2 * direction, 0) :
                Math.min(3 / 2 * direction, 2 - 3 / 2 * direction),
            FADExponent
        );
        this.negative.gain.value = FADBaseGain * Math.pow(
            (0 < direction) ? Math.max(-1 + 3 / 2 * direction, 0) :
                Math.min(-3 / 2 * direction, 2 + 3 / 2 * direction),
            FADExponent
        );
    }

    private start(startTime: number, frequency: number): GainNode {
        const source = new OscillatorNode(this.context, { frequency: frequency });
        const gain = new GainNode(this.context, { gain: 0 });
        source.connect(gain).connect(this.context.destination);
        source.start(startTime);
        return gain;
    }
}

export class Playback {
    readonly ended = new utility.Event<void>();
    private _stopped = false;
    private _ended = false;

    constructor(private element: HTMLAudioElement, readonly settings: { startDelay?: number, endDelay?: number }) {
        console.log(element.src, settings);
        if (settings.startDelay) {
            window.setTimeout(() => {
                if (!this._stopped) {
                    element.play();
                }
            }, settings.startDelay);
        } else {
            element.play();
        }
        element.addEventListener("ended", () => {
            if (!this._stopped) {
                if (settings.endDelay) {
                    window.setTimeout(() => {
                        if (!this._stopped) {
                            this._ended = true;
                            this.ended.send();
                        }
                    }, settings.endDelay);
                } else {
                    this._ended = true;
                    this.ended.send();
                }
            }
        }, { once: true });
    }

    get is_ended(): boolean { return this._ended; }
    get is_stopped(): boolean { return this._stopped; }

    stop() {
        this._stopped = true;
        this.element.pause();
    }
}

export class Player {
    // private ping0: AudioBuffer;
    readonly fad: FAD;

    constructor(private readonly context: AudioContext) {
        this.fad = new FAD(context);
        (async () => {
            const response = await fetch("assets/ping0.mp3");
            const buffer = await response.arrayBuffer();
            console.log(await context.decodeAudioData(buffer));
        })();
    }

    // Control

    whenEnabled(listener: utility.EventListener<void>): void {
        if (this.context.state === "running") {
            listener();
        } else {
            this.context.addEventListener("statechange", () => {
                listener();
            }, { once: true });
        }
    }

    resume(): void {
        if (this.context.state !== "running") {
            this.context.resume();
        }
    }

    // Sounds

    play(path: string, settings: { startDelay?: number, endDelay?: number, volume?: number }): Playback {
        const element = document.createElement("audio");
        element.src = path;
        const source = new MediaElementAudioSourceNode(this.context, { mediaElement: element });
        source.connect(new GainNode(this.context, { gain: settings.volume || 1 }))
            .connect(this.context.destination);
        return new Playback(element, settings);
    }

    private echo(source: AudioNode, delay: number, gain: number, pan: number): AudioNode {
        const delayLeft = delay + Math.max(0.05 * pan, 0);
        const delayRight = delay + Math.max(0.05 * -pan, 0);
        const gainLeft = gain * (1 - pan) / 2;
        const gainRight = gain * (1 + pan) / 2;

        const merge = new ChannelMergerNode(this.context, { numberOfInputs: 2 });
        source.connect(new DelayNode(this.context, { delayTime: delayLeft, maxDelayTime: delayLeft }))
            .connect(new GainNode(this.context, { gain: gainLeft }))
            .connect(merge, 0, 0);
        source.connect(new DelayNode(this.context, { delayTime: delayRight, maxDelayTime: delayRight }))
            .connect(new GainNode(this.context, { gain: gainRight }))
            .connect(merge, 0, 1);
        return merge;
    }

    ping(pongs: core.Pong[]): void {
        const startTime = this.context.currentTime + 0.01;
        const duration = 0.1;
        const oscillator = new OscillatorNode(this.context, { type: "sine", frequency: 500 });
        const decay = new GainNode(this.context);
        decay.gain.value = 0;
        decay.gain.linearRampToValueAtTime(1.0, startTime + duration / 2);
        decay.gain.linearRampToValueAtTime(0, startTime + duration);
        oscillator.connect(decay)
            .connect(new GainNode(this.context, { gain: 0.1 }))
            .connect(this.context.destination);

        for (const pong of pongs) {
            const gain = 0.2 * dbToGain(-pong.attenuation);
            this.echo(decay, 0.05 + pong.delay, gain, triangleWave(pong.relativeBearing))
                .connect(this.context.destination);
        }
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    collision(): void {
        const startTime = this.context.currentTime + 0.01;
        const duration = 0.5;
        const oscillator = new OscillatorNode(this.context, { type: "triangle" });
        oscillator.frequency.setValueAtTime(200, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, startTime + duration);
        const decay = new GainNode(this.context, { gain: 0.3 });
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
            const decay = new GainNode(this.context, { gain: 0 });
            decay.gain.linearRampToValueAtTime(0.05, startTime + duration / 10);
            decay.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            oscillator.connect(decay).connect(this.context.destination);
            oscillator.start();
            oscillator.stop(this.context.currentTime + duration);
        }
    }
}
