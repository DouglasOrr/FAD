/**
 * General utilities.
 */

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
