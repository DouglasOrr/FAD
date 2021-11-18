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

export function vectorDistance(a: Vector, b: Vector): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
}

export function vectorSub(a: Vector, b: Vector): Vector {
    return [a[0] - b[0], a[1] - b[1]];
}

/**
 * Difference between two bearings in range [-PI, PI].
 *
 * Difference is positive clockwise from a -> b.
 */
export function bearingDifference(a: number, b: number): number {
    return (b - a + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
}

export function distanceToLine(start: Vector, end: Vector, position: Vector): number {
    const direction = vectorSub(end, start);
    const length = vectorLength(direction);
    direction[0] /= length;
    direction[1] /= length;
    const relative = vectorSub(position, start);
    const delta = Math.max(0, Math.min(length, vectorDot(direction, relative)));
    return vectorDistance([delta * direction[0], delta * direction[1]], relative);
}
