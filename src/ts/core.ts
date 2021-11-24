/**
 * Basic game logic: physics.
 */

import * as utility from "./utility.js";

// Physics
export const TickTime = 0.01;  // s
export const ShipRadius = 2;  // px
const RotationRate = 1;  // rad/s
const Acceleration = 30;  // px/s/s
const ReboundAcceleration = 5;  // px/s/s
const ReboundRestitution = 0.7;
const Drag = 5;  // 1/s

// Pings
const PingCount = 32;
const SpeedOfSound = 60;  // px/s
const Attenuation = 2;  // dB/px

export interface Grid {
    width: number;
    height: number;
    cells: number[];
}

export const enum Cell {
    Empty = 0,
    Terrain = 1,
    Finish = 2,
    Interference = 3,
}

export interface GameMap extends Grid {
    start: utility.Vector;
    start_bearing: number;
    routes: utility.Vector[][];
}

export class HitTest {
    constructor(
        readonly cell: Cell,
        readonly collision: boolean,
        readonly normal?: utility.Vector
    ) { }

    static getNormal(grid: Grid, x: number, y: number): utility.Vector | null {
        const hasRight = x < grid.width - 1;
        const hasLeft = 1 <= x;
        const hasDown = y < grid.height - 1;
        const hasUp = 1 <= y;
        const cells = grid.cells;
        const width = grid.width;
        let dx = 0, dy = 0;

        if (!(hasRight && hasLeft && hasUp && hasDown)) {
            dx = +!hasRight - +!hasLeft;
            dy = +!hasDown - +!hasUp;
        } else {
            dx = (
                3 * +(cells[width * y + x + 1] === Cell.Terrain) +
                +(cells[width * (y + 1) + x + 1] === Cell.Terrain) +
                +(cells[width * (y - 1) + x + 1] === Cell.Terrain) +
                3 * -(cells[width * y + x - 1] === Cell.Terrain) +
                -(cells[width * (y + 1) + x - 1] === Cell.Terrain) +
                -(cells[width * (y - 1) + x - 1] === Cell.Terrain)
            );
            dy = (
                3 * +(cells[width * (y + 1) + x] === Cell.Terrain) +
                +(cells[width * (y + 1) + x + 1] === Cell.Terrain) +
                +(cells[width * (y + 1) + x - 1] === Cell.Terrain) +
                3 * -(cells[width * (y - 1) + x] === Cell.Terrain) +
                -(cells[width * (y - 1) + x + 1] === Cell.Terrain) +
                -(cells[width * (y - 1) + x - 1] === Cell.Terrain)
            );
        }

        if (dx === 0 && dy === 0) {
            return null;
        }
        const normal: utility.Vector = [-dx, -dy];
        const length = utility.vectorLength(normal);
        normal[0] /= length;
        normal[1] /= length;
        return normal;
    }

    static test(grid: Grid, position: utility.Vector): HitTest {
        const ox = Math.floor(position[0]);
        const oy = Math.floor(position[1]);
        const cell = grid.cells[grid.width * oy + ox];
        const normal = (cell === Cell.Terrain) ? this.getNormal(grid, ox, oy) : null;
        return new HitTest(cell, normal !== null, normal);
    }
}

function findSegment(breadcrumbs: utility.Vector[], position: utility.Vector): number {
    let closestDistance = Infinity;
    let index: number;
    for (let i = 0; i < breadcrumbs.length - 1; ++i) {
        const start = breadcrumbs[i];
        const end = breadcrumbs[i + 1];
        const distance = utility.distanceToLine(start, end, position);
        if (distance < closestDistance) {
            closestDistance = distance;
            index = i;
        }
    }
    return index;
}

function breadcrumbBearing(breadcrumbs: utility.Vector[], index: number, position: utility.Vector): number {
    // Note: this still creates "hard jumps" between breadcrumbs
    const target = breadcrumbs[index + 1];
    const next = index < breadcrumbs.length - 2 ? breadcrumbs[index + 2] : target;
    return Math.atan2(
        position[0] - .5 * (target[0] + next[0]),
        .5 * (target[1] + next[1]) - position[1]
    );
}

export class Pong {
    constructor(
        readonly relativeBearing: number,
        public delay: number,
        public attenuation: number,
        public hit: utility.Vector,
    ) { }
}

export class Ship {
    readonly collisions = new utility.Event<HitTest>();
    readonly pongs = new utility.Event<Pong[]>();
    readonly routeChanged = new utility.Event<number>();
    readonly segmentChanged = new utility.Event<[number, number]>();

    private fadEnabled = true;
    private relativeBreadcrumbBearing: number = null;
    private currentRoute = 0;
    private currentSegment: number = null;

    constructor(
        public readonly position: utility.Vector,
        public readonly velocity: utility.Vector,
        public bearing: number,
        readonly map: GameMap,
    ) { }

    static create(map: GameMap): Ship {
        return new Ship([map.start[0] + 0.5, map.start[1] + 0.5], [0, 0], map.start_bearing, map);
    }

    private bounce(normal: utility.Vector): void {
        const scale = ReboundAcceleration * TickTime +
            (1 + ReboundRestitution) * Math.max(0, -utility.vectorDot(this.velocity, normal));
        this.velocity[0] += normal[0] * scale;
        this.velocity[1] += normal[1] * scale;
    }

    private traceRay(relativeBearing: number): Pong {
        let major: number, minor: number;
        let majorLimit: number, minorLimit: number;
        let majorStride: number, minorStride: number;
        let majorStep: number, minorStep: number;
        // Transform everything into [major, minor] coordinates
        const ox = Math.floor(this.position[0]);
        const oy = Math.floor(this.position[1]);
        const cosBearing = Math.cos(this.bearing + relativeBearing);
        const sinBearing = -Math.sin(this.bearing + relativeBearing);
        const yMajor = Math.abs(cosBearing) > Math.abs(sinBearing);
        if (yMajor) {  // Y axis is major
            major = oy;
            minor = ox;
            majorLimit = this.map.height - 1;
            minorLimit = this.map.width - 1;
            majorStride = this.map.width;
            minorStride = 1;
            majorStep = Math.sign(cosBearing);
            minorStep = sinBearing / Math.abs(cosBearing);
        } else {  // X axis is major
            major = ox;
            minor = oy;
            majorLimit = this.map.width - 1;
            minorLimit = this.map.height - 1;
            majorStride = 1;
            minorStride = this.map.width;
            majorStep = Math.sign(sinBearing);
            minorStep = cosBearing / Math.abs(sinBearing);
        }
        // Line rasterisation loop
        let attenuation = 0, delay = 0;
        const stepLength = Math.abs(majorStep) + Math.abs(minorStep);
        for (; ;) {
            // 'major' is always quantised, 'minor' requires quantisation
            const iMinor = Math.floor(minor);
            if (major < 0 || majorLimit < major || iMinor < 0 || minorLimit < iMinor) {
                major = Math.max(0, Math.min(major, majorLimit));
                minor = Math.max(0, Math.min(iMinor, minorLimit));
                break;
            }
            if (this.map.cells[majorStride * major + minorStride * iMinor] === Cell.Terrain) {
                minor = iMinor;
                break;
            }
            attenuation += 2 * stepLength * Attenuation;
            delay += 2 * stepLength / SpeedOfSound;
            major += majorStep;
            minor += minorStep;
        }
        return new Pong(relativeBearing, delay, attenuation, yMajor ? [minor, major] : [major, minor]);
    }

    get fadBearing(): number {
        return this.relativeBreadcrumbBearing;
    }

    toggleFAD(): boolean {
        this.fadEnabled = !this.fadEnabled;
        return this.fadEnabled;
    }

    cycleRoute(): number {
        this.currentRoute = (this.currentRoute + 1) % this.map.routes.length;
        if (this.map.routes.length) {
            this.routeChanged.send(this.currentRoute);
            this.currentSegment = null;
        }
        return this.currentRoute;
    }

    ping(): void {
        const pongs = [];
        for (let i = 0; i < PingCount; ++i) {
            pongs.push(this.traceRay(2 * Math.PI * i / PingCount));
        }
        this.pongs.send(pongs);
    }

    tick(thrust: number, rotate: number): void {
        // Update bearing
        this.bearing = (this.bearing + rotate * RotationRate * TickTime);
        if (this.bearing < -Math.PI) { this.bearing += 2 * Math.PI; }
        if (Math.PI < this.bearing) { this.bearing -= 2 * Math.PI; }

        // Handle collisions
        const hit = HitTest.test(this.map, this.position);
        if (hit.collision) {
            this.bounce(hit.normal);
            this.collisions.send(hit);
        }

        // Update position
        const speed = utility.vectorLength(this.velocity);
        const acceleration = [
            thrust * -Math.sin(this.bearing) * Acceleration - this.velocity[0] * Drag,
            thrust * Math.cos(this.bearing) * Acceleration - this.velocity[1] * Drag,
        ];
        this.position[0] += this.velocity[0] * TickTime / 2;
        this.position[1] += this.velocity[1] * TickTime / 2;
        this.velocity[0] += acceleration[0] * TickTime;
        this.velocity[1] += acceleration[1] * TickTime;
        this.position[0] += this.velocity[0] * TickTime / 2;
        this.position[1] += this.velocity[1] * TickTime / 2;

        // Update segments
        const segment = findSegment(this.map.routes[this.currentRoute], this.position);
        if (!this.fadEnabled || hit.cell === Cell.Interference) {
            this.relativeBreadcrumbBearing = null;
        } else {
            this.relativeBreadcrumbBearing = utility.bearingDifference(
                this.bearing,
                breadcrumbBearing(this.map.routes[this.currentRoute], segment, this.position)
            );
        }
        if (segment !== this.currentSegment) {
            this.currentSegment = segment;
            this.segmentChanged.send([this.currentRoute, this.currentSegment]);
        }
    }
}
