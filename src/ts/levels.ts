/**
 * Logic to run levels.
 */

import * as core from "./core.js";
import * as mplayer from "./player.js";
import * as mrenderer from "./renderer.js";

export class Level {
    protected readonly ship: core.Ship;
    private readonly renderer: mrenderer.Renderer;

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

    init(): void {
        // empty
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
}

enum Level_1_State {
    Start,
    Intro,
    FAD,
    Play,
}

class Level_1 extends Level {
    private state: Level_1_State;
    private playing: mplayer.Playback;

    override init(): void {
        this.state = Level_1_State.Start;
        this.ship.toggleFAD();
        this.handleState();
    }

    private handleState(): void {
        console.log(this.state);
        this.playing?.stop();
        if (this.state === Level_1_State.Start) {
            this.playing = this.player.play("assets/1.1_can_you_hear_me.mp3", 2000);
            this.playing.ended.listen(() => { this.handleState(); });
        }
        if (this.state === Level_1_State.Intro) {
            this.playing = this.player.play("assets/1.2_intro.mp3", 0);
            this.playing.ended.listen(() => {
                this.state = Level_1_State.FAD;
                this.handleState();
            });
        }
        if (this.state === Level_1_State.FAD) {
            this.playing = this.player.play("assets/1.3_fad.mp3", 2000);
            this.playing.ended.listen(() => { this.handleState(); });
        }
        if (this.state === Level_1_State.Play) {
            this.playing = this.player.play("assets/1.4_drive.mp3", 0);
        }
    }

    beacon(): void {
        if (this.state === Level_1_State.Start) {
            this.state = Level_1_State.Intro;
            this.handleState();
        }
        if (this.state === Level_1_State.Play) {
            this.playing.stop();
            this.playing = this.player.play("assets/1.help.mp3", 0);
        }
        super.beacon();
    }

    toggleFAD(): void {
        if (this.state < Level_1_State.FAD) {
            return;
        }
        if (this.state === Level_1_State.FAD) {
            this.state = Level_1_State.Play;
            this.handleState();
        }
        super.toggleFAD();
    }
}

export async function loadFirstLevel(player: mplayer.Player, debugRender: mrenderer.Settings): Promise<Level> {
    const response = await fetch("assets/lvl0.map.json");
    const map = await response.json() as core.GameMap;
    return new Level_1(map, player, debugRender);
}
