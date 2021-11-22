/**
 * Logic to run levels.
 */

import * as core from "./core.js";
import * as mplayer from "./player.js";
import * as mrenderer from "./renderer.js";

export class Level {
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
            console.log(`Segment ${route}:${segment}`);
        });
        this.init();
    }

    protected init(): void {
        // empty
    }

    protected playRadio(message: string, settings: { delay?: number, then?: () => void, saveReplay?: boolean }): void {
        this.playing?.stop();
        if (settings.saveReplay == null || settings.saveReplay) {
            this.lastRadioMessage = message;
        }
        this.playing = this.player.play(`assets/${message}.mp3`, 1000 * (settings.delay || 0));
        if (settings.then) {
            this.playing.ended.listen(settings.then);
        }
    }

    tick(thrust: number, rotate: number): void {
        this.ship.tick(thrust, rotate);
        this.player.fad.set(this.ship.fadBearing);
        if (this.renderer !== null) {
            this.renderer.draw();
        }
    }
    toggleFAD(): void {
        this.ship.toggleFAD();
    }
    cycleRoute(): void {
        this.ship.cycleRoute();
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

enum Level_1_State {
    Start,
    Intro,
    FAD,
    Play,
}

class Level_1 extends Level {
    private state: Level_1_State;

    protected override init(): void {
        this.ship.toggleFAD();
        this.handleState(Level_1_State.Start);
    }

    private handleState(newState?: Level_1_State): void {
        if (newState !== undefined) {
            this.state = newState;
        }
        console.log(this.state);
        if (this.state === Level_1_State.Start) {
            this.playRadio("1.1_can_you_hear_me", { delay: 2, then: () => this.handleState() });
        }
        if (this.state === Level_1_State.Intro) {
            this.playRadio("1.2_intro", { then: () => this.handleState(Level_1_State.FAD) });
        }
        if (this.state === Level_1_State.FAD) {
            this.playRadio("1.3_fad", { delay: 2, then: () => this.handleState() });
        }
        if (this.state === Level_1_State.Play) {
            this.playRadio("1.4_drive", {});
        }
    }

    beacon(): void {
        if (this.state === Level_1_State.Start) {
            this.handleState(Level_1_State.Intro);
        }
        if (this.state === Level_1_State.Play) {
            this.playRadio("1.help", { saveReplay: false });
        }
        super.beacon();
    }

    toggleFAD(): void {
        if (this.state < Level_1_State.FAD) {
            return;
        }
        if (this.state === Level_1_State.FAD) {
            this.handleState(Level_1_State.Play);
        }
        super.toggleFAD();
    }
}

export async function loadFirstLevel(player: mplayer.Player, debugRender: mrenderer.Settings): Promise<Level> {
    const response = await fetch("assets/lvl0.map.json");
    const map = await response.json() as core.GameMap;
    return new Level_1(map, player, debugRender);
}
