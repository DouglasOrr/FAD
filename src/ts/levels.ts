/**
 * Logic to run levels.
 */

import * as core from "./core.js";
import * as mplayer from "./player.js";
import * as mrenderer from "./renderer.js";
import * as utility from "./utility.js";

export class Level {
    readonly finished: utility.Event<void> = new utility.Event();
    protected readonly ship: core.Ship;
    private readonly renderer: mrenderer.Renderer;
    private playing: mplayer.Playback;
    private lastRadioMessage: string;

    constructor(
        protected readonly map: core.GameMap,
        protected readonly player: mplayer.Player,
        debugRender: mrenderer.Settings,
    ) {
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
            console.log(`Segment ${route}:${segment} of ${map.routes[route].length}`);
            if (map.routes[route].length - 2 <= segment) {
                this.finish();
            }
        });
        this.init();
    }

    protected init(): void {
        // empty
    }

    protected playRadio(
        message: string,
        settings: { startDelay?: number, delay?: number, then?: () => void, saveReplay?: boolean }
    ): void {
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
    }

    protected finish(): void {
        this.finished.send();
        this.playing.stop();
    }

    tick(count: number, thrust: number, rotate: number): void {
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
        } else {
            // TODO - ship tone
        }
    }
    ping(): void {
        this.ship.ping();
    }
    beacon(): void {
        // empty
    }
    replay(): void {
        if (this.playing?.is_ended || this.playing?.is_stopped) {
            this.playRadio(this.lastRadioMessage, { saveReplay: false });
        } else {
            // TODO - ship tone
        }
    }
}

class Level0 extends Level {
    protected override init(): void {
        this.ship.toggleFAD();
        this.playRadio("0.1_intro", { then: () => this.loop() });
    }

    private loop(): void {
        this.playRadio("0.1_ready", { delay: 2, then: () => this.loop() });
    }

    ping(): void {
        this.finish();
    }
}

enum Level1State {
    Start,
    Intro,
    FAD,
    Play,
}

class Level1 extends Level {
    private state: Level1State;

    protected override init(): void {
        this.ship.toggleFAD();
        this.handleState(Level1State.Start);
    }

    private handleState(newState?: Level1State): void {
        if (newState !== undefined) {
            this.state = newState;
        }
        if (this.state === Level1State.Start) {
            this.playRadio("1.1_can_you_hear_me", { delay: 2, then: () => this.handleState() });
        }
        if (this.state === Level1State.Intro) {
            this.playRadio("1.2_intro", { then: () => this.handleState(Level1State.FAD) });
        }
        if (this.state === Level1State.FAD) {
            this.playRadio("1.3_fad", { delay: 2, then: () => this.handleState() });
        }
        if (this.state === Level1State.Play) {
            this.playRadio("1.4_drive", { startDelay: 2 });
        }
    }

    beacon(): void {
        if (this.state === Level1State.Start) {
            this.handleState(Level1State.Intro);
        }
        if (this.state === Level1State.Play) {
            this.playRadio("1.help", { saveReplay: false });
        }
        super.beacon();
    }

    toggleFAD(): void {
        if (this.state < Level1State.FAD) {
            return;
        }
        if (this.state === Level1State.FAD) {
            this.handleState(Level1State.Play);
        }
        super.toggleFAD();
    }
}

class Level2 extends Level {
    protected override init(): void {
        this.ship.segmentChanged.listen(([route, segment]) => {
            if (route === 0 && segment === 28) {
                this.playRadio("dev_secondary_beacons", {});
            }
            if (route === 1 && segment === 34) {
                this.playRadio("dev_primary_beacons", {});
            }
            if (route === 0 && segment === 51) {
                this.playRadio("dev_secondary_beacons", {});
            }
            if (route === 1 && segment === 56) {
                this.playRadio("dev_primary_beacons", {});
            }
        });
    }
}

class Level3 extends Level {
}

class Level4 extends Level {
}

class Level5 extends Level {
}

export async function load(player: mplayer.Player, debugRender: mrenderer.Settings, index: number): Promise<Level> {
    const levelClass = [
        Level0,
        Level1,
        Level2,
        Level3,
        Level4,
        Level5,
    ][index];
    const response = await fetch(`assets/level_${index}.map.json`);
    const map = await response.json() as core.GameMap;
    return new levelClass(map, player, debugRender);
}
