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
                this.onFinalSegment();
            }
        });
    }

    protected freeze(): void { this.frozen = true; }
    protected unfreeze(): void { this.frozen = false; }
    protected onFinalSegment(): void {
        this.finish();
    }

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
    private pinged = false;

    override init(): void {
        this.playRadio("3.1_intro", { then: () => this.loopPing() });
        this.ship.segmentChanged.listen(([route, segment]) => this.segmentChanged(route, segment));
    }

    private loopPing(): void {
        if (this.pinged) {
            this.unfreeze();
            this.playRadio("3.3_wall", { startDelay: 0.5 });
        } else {
            this.playRadio("3.2_ping", { delay: 2, then: () => this.loopPing() });
        }
    }
    private segmentChanged(route: number, segment: number): void {
        function isIn(settings: { _0?: number, _1?: number }): boolean {
            return route === 0 && segment === settings?._0 || route === 1 && segment === settings?._1;
        }
        if (route === 0 && 4 <= segment) this.playRadio("3.4_obstacles", { once: true });
        if (isIn({ _0: 6 })) this.playRadio("3.5_past", {});
        if (isIn({ _0: 15, _1: 12 })) this.playRadio("3.6_obstacles_2", { once: true });
        if (isIn({ _0: 17, _1: 14 })) this.playRadio("3.7_past_2", {});
        if (isIn({ _0: 23, _1: 20 })) this.playRadio("3.8_proverb", { once: true });
        if (isIn({ _0: 37, _1: 34 })) this.playRadio("3.9_obstacles_3", { once: true });
        if (isIn({ _0: 45, _1: 44 })) this.playRadio("3.10_past_3", {});
    }
    beacon(): void {
        if (this.radioAvailable) {
            this.playRadio("3.help", { saveReplay: false });
        }
    }
    ping(): void {
        if (!this.pinged) {
            this.pinged = true;
            this.loopPing();
        }
        super.ping();
    }
}

class Level4 extends StandardLevel {
    override init(): void {
        this.playRadio("4.1_intro", { then: () => this.unfreeze() });
        this.ship.segmentChanged.listen(([route, segment]) => this.segmentChanged(route, segment));
    }

    private segmentChanged(route: number, segment: number): void {
        function isIn(settings: { _0?: number, _1?: number }): boolean {
            return route === 0 && segment === settings?._0 || route === 1 && segment === settings?._1;
        }
        if (isIn({ _0: 3, _1: 3 })) this.playRadio("4.2_precise", { once: true });
        if (isIn({ _0: 13, _1: 13 })) this.playRadio("4.3_patchy", { once: true });
        if (isIn({ _0: 20, _1: 20 })) this.playRadio("4.4_cargo", { once: true });
        if (isIn({ _0: 30, _1: 30 })) this.playRadio("4.5_cavern", { once: true });
        if (isIn({ _0: 36, _1: 36 })) this.playRadio("4.6_secondary", { once: true });
        if (isIn({ _0: 43, _1: 43 })) this.playRadio("4.7_obstacles", { once: true });
        if (isIn({ _0: 47, _1: 47 })) this.playRadio("4.8_interference_2", { once: true });
        if (isIn({ _0: 55, _1: 55 })) this.playRadio("4.9_questions", { once: true });
    }
    beacon(): void {
        if (this.radioAvailable) {
            this.playRadio("3.help", { saveReplay: false });
        }
    }
}

class Level5 extends StandardLevel {
    override init(): void {
        this.playRadio("5.1_intro", { then: () => this.unfreeze() });
        this.ship.segmentChanged.listen(([route, segment]) => this.segmentChanged(route, segment));
    }

    protected override onFinalSegment(): void {
        // Handle finish() manually (see segmentChanged)
    }
    private segmentChanged(route: number, segment: number): void {
        function isIn(settings: { _0?: number, _1?: number }): boolean {
            return route === 0 && segment === settings?._0 || route === 1 && segment === settings?._1;
        }
        if (isIn({ _0: 13, _1: 13 })) this.playRadio("5.2_secondary", { once: true });
        if (isIn({ _0: 24, _1: 26 })) this.playRadio("5.3_obstacle", { once: true });
        if (isIn({ _0: 27, _1: 29 })) this.playRadio("5.4_passage", { once: true });
        if (isIn({ _0: 49, _1: 51 })) this.playRadio("5.5_obstacles_2", { once: true });
        if (isIn({ _0: 53, _1: 55 })) this.playRadio("5.6_past_2", { once: true });
        if (isIn({ _0: 58, _1: 60 })) this.playRadio("5.7_obstacles_3", { once: true });
        if (isIn({ _0: 61, _1: 63 })) this.playRadio("5.8_past_3", { once: true });
        if (isIn({ _0: 68, _1: 70 })) this.playRadio("5.9_jammed", {
            once: true,
            delay: 0.3, then: () => this.playRadio("5.10_crosstalk", {})
        });
        if (isIn({ _0: 73 })) this.playRadio("5.11_please", {});
        if (isIn({ _0: 76 })) this.playRadio("5.12a_please_2", {});
        if (isIn({ _1: 79 })) this.playRadio("5.12b_thank_you", {});
        if (isIn({ _0: 78 })) this.playRadio("5.13_save_or_destroy", {});
        if (isIn({ _0: 84 })) {
            this.freeze();
            this.playRadio("5.14a_final", { then: () => this.finish() });
        }
        if (isIn({ _1: 87 })) {
            this.freeze();
            this.playRadio("5.14b_final", { then: () => this.finish() });
        }
    }
    beacon(): void {
        if (this.radioAvailable) {
            this.playRadio("3.help", { saveReplay: false });
        }
    }
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
