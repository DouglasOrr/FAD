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

const FADBaseGain = 0.04;
const FADBaseFrequency = 250;
const FADExponent = 1.5;

class FAD {
    private readonly positive: GainNode;
    private readonly positiveSource: OscillatorNode;
    private readonly negative: GainNode;
    private readonly negativeSource: OscillatorNode;

    constructor(private readonly context: AudioContext) {
        [this.positiveSource, this.positive] = this.create(FADBaseFrequency * 4 / 3);
        [this.negativeSource, this.negative] = this.create(FADBaseFrequency);
        this.set(null);
    }

    start() {
        this.positiveSource.start();
        this.negativeSource.start();
    }

    set(direction: number | null) {
        const rampEndTime = this.context.currentTime + core.TickTime * core.TicksPerSupertick;
        if (direction === null) {
            this.positive.gain.linearRampToValueAtTime(0, rampEndTime);
            this.negative.gain.linearRampToValueAtTime(0, rampEndTime);
            return;
        }
        direction /= Math.PI;
        // This function looks like this:
        //          /\
        //    \    /  \
        //     ---+
        //   -1   0   1
        const positiveGain = FADBaseGain * Math.pow(
            (direction < 0) ? Math.max(-1 - 3 / 2 * direction, 0) :
                Math.min(3 / 2 * direction, 2 - 3 / 2 * direction),
            FADExponent
        );
        this.positive.gain.linearRampToValueAtTime(positiveGain, rampEndTime);
        const negativeGain = FADBaseGain * Math.pow(
            (0 < direction) ? Math.max(-1 + 3 / 2 * direction, 0) :
                Math.min(-3 / 2 * direction, 2 + 3 / 2 * direction),
            FADExponent
        );
        this.negative.gain.linearRampToValueAtTime(negativeGain, rampEndTime);
    }

    private create(frequency: number): [OscillatorNode, GainNode] {
        const source = new OscillatorNode(this.context, { frequency: frequency });
        const gain = new GainNode(this.context, { gain: 0 });
        source.connect(gain).connect(this.context.destination);
        return [source, gain];
    }
}

class Drone {
    private readonly source: AudioBufferSourceNode;
    private readonly gainNode: GainNode;

    constructor(
        private readonly context: AudioContext,
        buffer: AudioBuffer,
        private readonly maxGain: number,
        private readonly rampTime: number,
    ) {
        this.source = new AudioBufferSourceNode(context, { buffer: buffer, loop: true });
        this.gainNode = new GainNode(this.context, { gain: 0 });
        this.source.connect(this.gainNode).connect(this.context.destination);
    }

    start() {
        this.source.start();
    }

    set(value: number) {
        const currentGain = this.gainNode.gain.value;
        const maxDelta = core.TickTime * core.TicksPerSupertick * this.maxGain / this.rampTime;
        const delta = value * this.maxGain - currentGain;
        const newGain = currentGain + Math.max(-maxDelta, Math.min(maxDelta, delta));
        const rampEndTime = this.context.currentTime + core.TickTime * core.TicksPerSupertick;
        this.gainNode.gain.linearRampToValueAtTime(newGain, rampEndTime);
    }
}

export class Playback {
    readonly ended = new utility.Event<void>();
    private _stopped = false;
    private _ended = false;

    constructor(
        private element: HTMLAudioElement,
        readonly settings: { startDelay?: number, endDelay?: number },
    ) {
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

async function fetchAudio(context: AudioContext, path: string): Promise<AudioBuffer> {
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    return await context.decodeAudioData(buffer);
}

export class Player {
    readonly fad: FAD;
    engine: Drone;
    interference: Drone;
    private _collisionBuffer: AudioBuffer;
    private readonly halfSine = new Float32Array(32).map((_, idx) => {
        return Math.sin(idx * Math.PI / 31);
    });

    constructor(private readonly context: AudioContext) {
        this.fad = new FAD(context);
        // A bit ugly - assume these complete before anything exciting happens
        fetchAudio(context, "assets/fx_engine.mp3").then(buffer => { this.engine = new Drone(context, buffer, 0.02, 0.5); });
        fetchAudio(context, "assets/fx_interference.mp3").then(buffer => { this.interference = new Drone(context, buffer, 0.02, 0.5); });
        fetchAudio(context, "assets/fx_collision.mp3").then(buffer => { this._collisionBuffer = buffer });
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
        this.whenEnabled(() => {
            this.fad.start();
            this.engine.start();
            this.interference.start();
        });
    }

    // Sounds

    play(path: string, settings: { startDelay?: number, endDelay?: number, volume?: number }): Playback {
        const element = document.createElement("audio");
        element.src = path;
        element.volume = settings.volume || 1;
        return new Playback(element, settings);
    }

    private echo(source: AudioNode, delay: number, gain: number, pan: number): AudioNode {
        const spread = 0.01;
        const a = Math.sin(pan * Math.PI / 2);
        const delayLeft = delay + spread * Math.max(a, 0);
        const delayRight = delay + spread * Math.max(-a, 0);
        const gainLeft = gain * (1 - a) / 2;
        const gainRight = gain * (1 + a) / 2;

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
        const startTime = this.context.currentTime + 0.1;
        const duration = 0.04;
        const oscillator = new OscillatorNode(this.context, { type: "sine", frequency: 700 });
        const decay = new GainNode(this.context, { gain: 0 });
        decay.gain.setValueCurveAtTime(this.halfSine, startTime, duration);
        oscillator.connect(decay)
            .connect(new GainNode(this.context, { gain: 0.1 }))
            .connect(this.context.destination);

        let totalGain = 0;
        for (const pong of pongs) {
            totalGain += dbToGain(-pong.attenuation);
        }
        for (const pong of pongs) {
            const gain = 1 * Math.min(1, 1 / totalGain) * dbToGain(-pong.attenuation);
            this.echo(decay, pong.delay, gain, triangleWave(pong.relativeBearing))
                .connect(this.context.destination);
        }
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    collision(): void {
        const startTime = this.context.currentTime + 0.01;
        const buffer = new AudioBufferSourceNode(this.context, { buffer: this._collisionBuffer })
        buffer.connect(new GainNode(this.context, { gain: 0.6 })).connect(this.context.destination);
        buffer.start(startTime);
    }
}
