import * as core from "./core.js";
import "./utility.test.js";

///////////////////////////////////////////////////////////////////////////////
// Tests

test("collisions", () => {
    const cells = [
        [1, 1, 0, 0],
        [0, 0, 0, 1],
        [0, 2, 1, 1],
    ];
    const grid = {
        cells: cells.flat(),
        width: cells[0].length,
        height: cells.length,
    };

    let hit = core.HitTest.test(grid, [2.9, 1.9]);
    expect(hit.collision).toBe(false);
    expect(hit.finish).toBe(false);

    hit = core.HitTest.test(grid, [3.1, 1.9]);
    expect(hit.collision).toBe(true);
    expect(hit.finish).toBe(false);
    expect(hit.normal).toBeVector([-Math.SQRT1_2, -Math.SQRT1_2]);

    hit = core.HitTest.test(grid, [0.5, 0.5]);
    expect(hit.collision).toBe(true);
    expect(hit.finish).toBe(false);
    expect(hit.normal).toBeVector([0, 1]);

    hit = core.HitTest.test(grid, [1.5, 2.5]);
    expect(hit.collision).toBe(false);
    expect(hit.finish).toBe(true);
});
