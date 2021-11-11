/**
 * Basic game logic: physics.
 */

export type Vector = [number, number];

function vectorLength(x: Vector): number {
    return Math.sqrt(x[0] * x[0] + x[1] * x[1]);
}

const TickTime = 0.1;
const RotationRate = 2;
const Acceleration = 30;
const Drag = 2;

export class Ship {
    constructor(public position: Vector, public velocity: Vector, public bearing: number) { }

    tick(thrust: number, rotate: number): void {
        this.bearing = (this.bearing + rotate * RotationRate * TickTime);
        if (this.bearing < -Math.PI) { this.bearing += 2 * Math.PI; }
        if (Math.PI < this.bearing) { this.bearing -= 2 * Math.PI; }
        const speed = vectorLength(this.velocity);
        const acceleration = [
            thrust * -Math.sin(this.bearing) * Acceleration * TickTime - this.velocity[0] * speed * Drag * TickTime,
            thrust * Math.cos(this.bearing) * Acceleration * TickTime - this.velocity[1] * speed * Drag * TickTime,
        ];
        this.position[0] += this.velocity[0] * TickTime / 2;
        this.position[1] += this.velocity[1] * TickTime / 2;
        this.velocity[0] += acceleration[0] * TickTime;
        this.velocity[1] += acceleration[1] * TickTime;
        this.position[0] += this.velocity[0] * TickTime / 2;
        this.position[1] += this.velocity[1] * TickTime / 2;
    }
}
