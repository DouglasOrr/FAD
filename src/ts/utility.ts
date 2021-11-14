/**
 * General utilities.
 */

///////////////////////////////////////////////////////////////////////////////
// Event

export type EventListener<T> = (data: T) => void;

export class Event<T> {
    private readonly listeners: EventListener<T>[] = [];

    listen(listener: EventListener<T>): void {
        this.listeners.push(listener);
    }

    async send(data: T): Promise<void> {
        for (const listener of this.listeners) {
            listener(data);
        }
    }
}

///////////////////////////////////////////////////////////////////////////////
// Vector

export type Vector = [number, number];

export function vectorLength(x: Vector): number {
    return Math.sqrt(x[0] * x[0] + x[1] * x[1]);
}

export function vectorDot(a: Vector, b: Vector): number {
    return a[0] * b[0] + a[1] * b[1];
}
