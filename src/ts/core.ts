/**
 * Basic game logic: physics.
 */

import * as utility from "./utility.js";

export interface Grid {
    width: number;
    height: number;
    cells: Array<number>;
}

export interface GameMap extends Grid {
    start: utility.Vector;
    start_bearing: number;
    breadcrumbs: Array<utility.Vector>;
}

export class HitTest {
    constructor(
        readonly collision: boolean,
        readonly finish: boolean,
        readonly normal?: utility.Vector
    ) { }

    static test(grid: Grid, position: utility.Vector): HitTest {
        const ox = Math.floor(position[0]);
        const oy = Math.floor(position[1]);
        const cell = grid.cells[grid.width * oy + ox];
        let collision = (cell === 1);
        let normal: utility.Vector = null;
        if (collision) {
            // Note: dx = (terrain_right - terrain_left)
            const dx =
                +(grid.width <= ox + 1 ? true : (grid.cells[grid.width * oy + ox + 1] === 1))
                - +(ox - 1 < 0 ? true : (grid.cells[grid.width * oy + ox - 1] === 1));
            const dy =
                +(grid.height <= oy + 1 ? true : (grid.cells[grid.width * (oy + 1) + ox] === 1))
                - +(oy - 1 < 0 ? true : (grid.cells[grid.width * (oy - 1) + ox] === 1));

            if (dx === 0 && dy === 0) {
                // This is unlikely - an "embedded" collision - just give up so we don't get stuck
                collision = false;
            } else {
                normal = [-dx, -dy];
                const length = utility.vectorLength(normal);
                normal[0] /= length;
                normal[1] /= length;
            }
        }
        const finish = (cell === 2);
        return new HitTest(collision, finish, normal);
    }
}

export const TickTime = 0.01;
export const ShipRadius = 2;
const RotationRate = 2.5;
const Acceleration = 15;
const ReboundAcceleration = 5;
const ReboundRestitution = 0.7;
const Drag = 0.2;

export class Ship {
    readonly collisions = new utility.Event<[Ship, HitTest]>();
    readonly finished = new utility.Event<Ship>();
    private isFinished = false;

    constructor(
        public readonly position: utility.Vector,
        public readonly velocity: utility.Vector,
        public bearing: number,
        readonly map: GameMap,
    ) { }

    static create(map: GameMap): Ship {
        return new Ship([map.start[0], map.start[1]], [0, 0], map.start_bearing, map);
    }

    private bounce(normal: utility.Vector): void {
        const scale = ReboundAcceleration * TickTime +
            (1 + ReboundRestitution) * Math.max(0, -utility.vectorDot(this.velocity, normal));
        this.velocity[0] += normal[0] * scale;
        this.velocity[1] += normal[1] * scale;
    }

    ping(): void {
        console.log(`ping ${this.position} ${this.bearing}`);
    }

    tick(thrust: number, rotate: number): void {
        // Update bearinig
        this.bearing = (this.bearing + rotate * RotationRate * TickTime);
        if (this.bearing < -Math.PI) { this.bearing += 2 * Math.PI; }
        if (Math.PI < this.bearing) { this.bearing -= 2 * Math.PI; }

        // Handle collisions
        const hit = HitTest.test(this.map, this.position);
        if (hit.collision) {
            this.bounce(hit.normal);
            this.collisions.send([this, hit]);
        }
        if (hit.finish && !this.isFinished) {
            this.isFinished = true;
            this.finished.send(this);
        }

        // Update position
        const speed = utility.vectorLength(this.velocity);
        const acceleration = [
            thrust * -Math.sin(this.bearing) * Acceleration - this.velocity[0] * speed * Drag,
            thrust * Math.cos(this.bearing) * Acceleration - this.velocity[1] * speed * Drag,
        ];
        this.position[0] += this.velocity[0] * TickTime / 2;
        this.position[1] += this.velocity[1] * TickTime / 2;
        this.velocity[0] += acceleration[0] * TickTime;
        this.velocity[1] += acceleration[1] * TickTime;
        this.position[0] += this.velocity[0] * TickTime / 2;
        this.position[1] += this.velocity[1] * TickTime / 2;
    }
}
