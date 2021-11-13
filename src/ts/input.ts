/**
 * User input (keyboard).
 */

import * as utility from "./utility.js";

export type KeyboardListener = (name: string) => void;

/**
 * Maps raw key presses onto named events (many keys => 1 event).
 */
export class Keyboard {
    private readonly pressed: Set<string> = new Set();
    private readonly keyToName: Map<string, string> = new Map();
    private readonly events: Map<string, utility.Event<string>> = new Map();

    constructor(private readonly nameToKeys: Map<string, string[]>) {
        addEventListener("keydown", e => this.handleKeyDown(e));
        addEventListener("keyup", e => this.handleKeyUp(e));
        for (const [event, keys] of this.nameToKeys.entries()) {
            for (const key of keys) {
                if (this.keyToName.has(key)) {
                    throw new Error(`Duplicate key ${key}`);
                }
                this.keyToName.set(key, event);
            }
        }
        for (const event of this.nameToKeys.keys()) {
            this.events.set(event, new utility.Event<string>());
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        const key = e.key;
        if (this.keyToName.has(key)) {
            if (!this.pressed.has(key)) {
                const name = this.keyToName.get(key);
                this.events.get(name).send(name);
            }
            this.pressed.add(key);
        }
    }

    private handleKeyUp(e: KeyboardEvent): void {
        this.pressed.delete(e.key);
    }

    has(name: string): boolean {
        for (const key of this.nameToKeys.get(name)) {
            if (this.pressed.has(key)) {
                return true;
            }
        }
        return false;
    }

    listen(name: string, listener: utility.EventListener<string>): void {
        this.events.get(name).listen(listener);
    }
}
