// Standard worklet types

interface AudioWorkletProcessor {
    readonly port: MessagePort;
    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean;
}

declare const AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor;
    new(options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

declare const sampleRate: number;

declare function registerProcessor(
    name: string,
    processorCtor: (new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor)
): void;

const renderQuantum = 128;

/**
 * Multiple delay/gain lines mapping mono input to stereo output.
 */
class EchoProcessor extends AudioWorkletProcessor {
    // Holds [delayLeft, gainLeft, delayRight, gainRight]
    private readonly echoes: Array<[number, number, number, number]>;
    private readonly leftBuffer: Float32Array;
    private readonly rightBuffer: Float32Array;
    private readonly maxDelay: number;
    private readonly bufferLength: number;
    private readIdx = 0;
    private lastWriteIdx = 0;

    constructor(options: AudioWorkletNodeOptions) {
        super(options);
        this.echoes = options.processorOptions.echoes.map(echo => {
            return [
                Math.round(sampleRate * echo.delayLeft),
                echo.gainLeft,
                Math.round(sampleRate * echo.delayRight),
                echo.gainRight,
            ];
        });
        this.maxDelay = this.echoes.reduce(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            (value, [decayLeft, _gainLeft, decayRight, _gainRight]) =>
                Math.max(value, decayLeft, decayRight),
            0);
        this.bufferLength = this.maxDelay + renderQuantum + 1;
        this.leftBuffer = new Float32Array(this.bufferLength);
        this.rightBuffer = new Float32Array(this.bufferLength);
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
        if (inputs[0].length) {
            const input = inputs[0][0];
            for (const [delayLeft, gainLeft, delayRight, gainRight] of this.echoes) {
                for (let i = 0; i < renderQuantum; ++i) {
                    this.leftBuffer[(this.readIdx + i + delayLeft) % this.bufferLength] += gainLeft * input[i];
                    this.rightBuffer[(this.readIdx + i + delayRight) % this.bufferLength] += gainRight * input[i];
                }
            }
            this.lastWriteIdx = (this.readIdx + renderQuantum + this.maxDelay) % this.bufferLength;
        }
        const outputLeft = outputs[0][0];
        const outputRight = outputs[0][1];
        for (let i = 0; i < renderQuantum && this.readIdx !== this.lastWriteIdx; ++i) {
            outputLeft[i] = this.leftBuffer[this.readIdx];
            outputRight[i] = this.rightBuffer[this.readIdx];
            this.leftBuffer[this.readIdx] = 0;
            this.rightBuffer[this.readIdx] = 0;
            this.readIdx = (this.readIdx + 1) % this.bufferLength;
        }
        return this.readIdx !== this.lastWriteIdx;
    }
}

registerProcessor("echo-processor", EchoProcessor);
