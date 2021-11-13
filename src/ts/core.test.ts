import * as core from "./core";

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toBeVector(expected: core.Vector): R;
        }
    }
}

expect.extend({
    toBeVector(received: core.Vector, expected: core.Vector, atol = 1e-3) {
        const pass =
            core.vectorLength([received[0] - expected[0], received[1] - expected[1]]) < atol;
        return {
            message: () =>
                `expected ${received} ${pass ? "not to" : "to"} be within ${atol} of ${expected}`,
            pass: pass,
        }
    }
});

///////////////////////////////////////////////////////////////////////////////
// Tests

test("vectors", () => {
    expect(core.vectorLength([3, 4])).toBeCloseTo(5);
    expect(core.vectorDot([1, -1], [2, -3])).toBeCloseTo(5);
});

test("collisions", () => {
    const cellGrid = [
        [1, 1, 0, 0],
        [0, 0, 0, 1],
        [0, 2, 1, 1],
    ];
    let hit = core.HitTest.test(cellGrid.flat(), 4, 3, [2.9, 1.9]);
    expect(hit.collision).toBe(false);
    expect(hit.finish).toBe(false);

    hit = core.HitTest.test(cellGrid.flat(), 4, 3, [3.1, 1.9]);
    expect(hit.collision).toBe(true);
    expect(hit.finish).toBe(false);
    expect(hit.normal).toBeVector([-Math.SQRT1_2, -Math.SQRT1_2]);

    hit = core.HitTest.test(cellGrid.flat(), 4, 3, [0.5, 0.5]);
    expect(hit.collision).toBe(true);
    expect(hit.finish).toBe(false);
    expect(hit.normal).toBeVector([0, 1]);

    hit = core.HitTest.test(cellGrid.flat(), 4, 3, [1.5, 2.5]);
    expect(hit.collision).toBe(false);
    expect(hit.finish).toBe(true);
});
