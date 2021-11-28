/**
 * Logic to run levels.
 */

import * as core from "./core.js";
import * as mplayer from "./player.js";
import * as mrenderer from "./renderer.js";
import * as utility from "./utility.js";

export class Level {
    readonly finished: utility.Event<void> = new utility.Event();
    private playing: mplayer.Playback = null;
    private lastRadioMessage: string;
    private played: Set<string> = new Set<string>();

    constructor(protected readonly player: mplayer.Player) { }

    protected playRadio(
        message: string,
        settings: {
            startDelay?: number,
            delay?: number,
            then?: () => void,
            saveReplay?: boolean,
            once?: boolean,
        }
    ): boolean {
        if (settings.once) {
            if (this.played.has(message)) {
                return false;
            }
            this.played.add(message);
        }
        this.playing?.stop();
        if (settings.saveReplay == null || settings.saveReplay) {
            this.lastRadioMessage = message;
        }
        this.playing = this.player.play(
            `assets/${message}.mp3`,
            { startDelay: 1000 * settings.startDelay, endDelay: 1000 * settings.delay }
        );
        if (settings.then) {
            this.playing.ended.listen(settings.then);
        }
        return true;
    }

    protected finish(): void {
        this.finished.send();
        this.playing.stop();
    }

    get radioAvailable(): boolean {
        return this.playing === null || this.playing.is_ended || this.playing.is_stopped;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tick(count: number, thrust: number, rotate: number): void {
        // empty
    }
    toggleFAD(): void {
        // empty
    }
    cycleRoute(): void {
        // empty
    }
    ping(): void {
        // empty
    }
    beacon(): void {
        // empty
    }
    replay(): void {
        if (this.radioAvailable) {
            this.playRadio(this.lastRadioMessage, { saveReplay: false });
        }
    }
}

class Level0 extends Level {
    private part: "title" | "soundtest" = "title";
    private readyToAdvance = false;

    constructor(player: mplayer.Player) {
        super(player);
        this.loopTitle();
    }

    private loopTitle(): void {
        this.readyToAdvance = true;
        this.playRadio("0.1_title", { delay: 2, then: () => this.loopTitle() });
    }

    private loopSoundTest(): void {
        this.playRadio("0.2_soundtest1", {
            then: () => {
                this.player.fad.set(0.5);
                window.setTimeout(() => { this.player.fad.set(null); }, 1000);
                this.playRadio("0.3_soundtest2", {
                    then: () => {
                        this.player.collision();
                        this.readyToAdvance = true;
                        this.playRadio("0.4_ready", {
                            delay: 2, then: () => {
                                this.loopSoundTest();
                            }
                        });
                    }
                });
            }
        });
    }

    ping(): void {
        if (this.readyToAdvance) {
            if (this.part === "title") {
                this.part = "soundtest";
                this.readyToAdvance = false;
                this.loopSoundTest();
            } else {
                this.finish();
            }
        }
    }
}

class StandardLevel extends Level {
    protected readonly ship: core.Ship;
    private readonly renderer: mrenderer.Renderer;
    protected frozen = true;

    constructor(
        protected readonly player: mplayer.Player,
        protected readonly map: core.GameMap,
        debugRender: mrenderer.Settings,
    ) {
        super(player);
        this.ship = core.Ship.create(map);
        this.renderer = (debugRender === null ? null
            : new mrenderer.Renderer(this.map, this.ship, debugRender));
        this.ship.collisions.listen(() => {
            player.collision();
        });
        this.ship.pongs.listen((e) => {
            player.ping(e);
            this.renderer?.addPongs(e);
        });
        this.ship.segmentChanged.listen(([route, segment]) => {
            console.log(`Segment ${route}:${segment} of ${this.map.routes[route].length}`);
            if (this.map.routes[route].length - 2 <= segment) {
                this.finish();
            }
        });
    }

    protected unfreeze(): void { this.frozen = false; }

    init(): void {
        // empty
    }
    tick(count: number, thrust: number, rotate: number): void {
        if (this.frozen) {
            // Disable movement
            thrust = 0;
        }
        this.ship.tick(thrust, rotate);
        if (count % core.TicksPerSupertick === 0) {
            this.player.fad.set(this.ship.fadBearing);
            this.player.engine.set(Math.abs(thrust));
            this.player.interference.set(+(
                this.ship.fadEnabled && this.ship.cell === core.Cell.Interference));
        }
        if (this.renderer !== null) {
            this.renderer.draw();
        }
    }
    toggleFAD(): void {
        const enabled = this.ship.toggleFAD();
        this.player.play(`assets/${enabled ? "console_fad_on" : "console_fad_off"}.mp3`, { volume: 0.25 });
    }
    cycleRoute(): void {
        if (this.map.routes.length >= 2) {
            const route = this.ship.cycleRoute();
            this.player.play(`assets/${["console_primary", "console_secondary"][route]}.mp3`, { volume: 0.25 });
        }
    }
    ping(): void {
        this.ship.ping();
    }
}

class Level1 extends StandardLevel {
    private state: "start" | "intro" | "FAD" | "play";

    override init(): void {
        super.init();
        this.ship.toggleFAD();
        this.handleState("start");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.ship.segmentChanged.listen(([_, segment]) => this.segmentChanged(segment));
    }

    private segmentChanged(segment: number): void {
        if (this.state !== "play") return;
        if (3 <= segment) this.playRadio("1.5_going", { once: true });
        if (8 <= segment) this.playRadio("1.6_background", { once: true });
        if (20 <= segment) this.playRadio("1.7_holding", { once: true });
    }

    private handleState(newState?: "start" | "intro" | "FAD" | "play"): void {
        if (newState !== undefined) {
            this.state = newState;
        }
        if (this.state === "start") {
            this.playRadio("1.1_can_you_hear_me", { delay: 2, then: () => this.handleState() });
        }
        if (this.state === "intro") {
            this.playRadio("1.2_intro", { then: () => this.handleState("FAD") });
        }
        if (this.state === "FAD") {
            this.playRadio("1.3_fad", { delay: 2, then: () => this.handleState() });
        }
        if (this.state === "play") {
            this.unfreeze();
            this.playRadio("1.4_drive", { startDelay: 2 });
        }
    }

    beacon(): void {
        if (this.state === "start") {
            this.handleState("intro");
        }
        if (this.state === "play" && this.radioAvailable) {
            this.playRadio("1.help", { saveReplay: false });
        }
    }
    toggleFAD(): void {
        if (this.state === "start" || this.state === "intro") {
            // Disable FAD
            return;
        }
        if (this.state === "FAD") {
            this.handleState("play");
        }
        super.toggleFAD();
    }
    ping(): void {
        // Disable ping
    }
}

class Level2 extends StandardLevel {
    private doneSecondary = false;
    private donePrimary = false;

    override init(): void {
        this.playRadio("2.1_intro", { then: () => this.unfreeze() });
        this.ship.segmentChanged.listen(([route, segment]) => this.segmentChanged(route, segment));
    }

    private loopSecondary(): void {
        if (!this.doneSecondary) {
            this.playRadio("2.4_secondary", { delay: 2, then: () => this.loopSecondary() });
        }
    }
    private loopPrimary(): void {
        if (!this.donePrimary) {
            this.playRadio("2.5_primary", { delay: 2, then: () => this.loopPrimary() });
        }
    }
    private segmentChanged(route: number, segment: number): void {
        function isIn(settings: { _0?: number, _1?: number }): boolean {
            return route === 0 && segment === settings?._0 || route === 1 && segment === settings?._1;
        }
        if (isIn({ _0: 18, _1: 18 })) this.playRadio("2.2_lucky", { once: true });
        if (isIn({ _0: 28 })) this.playRadio("2.3_blocked", {
            once: true, then: () => this.loopSecondary()
        });
        if (isIn({ _1: 34 })) this.loopPrimary();
        if (isIn({ _0: 42, _1: 41 })) this.playRadio("2.6_music", { once: true });
        if (isIn({ _0: 51 })) this.playRadio("2.7_secondary_2", {});
        if (isIn({ _1: 56 })) this.playRadio("2.8_primary_2", {});
    }

    cycleRoute(): void {
        if (this.doneSecondary) {
            this.donePrimary = true;
        }
        this.doneSecondary = true;
        super.cycleRoute();
    }
    ping(): void {
        // Disable ping
    }
    beacon(): void {
        if (this.radioAvailable) {
            this.playRadio("2.help", { saveReplay: false });
        }
    }
}

class Level3 extends StandardLevel {
}

class Level4 extends StandardLevel {
}

class Level5 extends StandardLevel {
}

export async function load(player: mplayer.Player, debugRender: mrenderer.Settings, index: number): Promise<Level> {
    if (index === 0) {
        return new Level0(player);
    }
    const levelClass = [
        Level1,
        Level2,
        Level3,
        Level4,
        Level5,
    ][index - 1];
    const response = await fetch(`assets/level_${index}.map.json`);
    const map = await response.json() as core.GameMap;
    const level = new levelClass(player, map, debugRender);
    level.init();
    return level;
}
