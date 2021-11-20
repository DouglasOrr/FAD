import * as core from "./core.js";
import "./utility.test.js";

///////////////////////////////////////////////////////////////////////////////
// Tests

test("collisions", () => {
    const cells = [
        [1, 0, 0, 1, 1],
        [0, 0, 0, 1, 1],
        [0, 2, 1, 1, 1],
        [1, 1, 1, 1, 1],
    ];
    const grid = {
        cells: cells.flat(),
        width: cells[0].length,
        height: cells.length,
    };

    let hit = core.HitTest.test(grid, [2.1, 1.9]);
    expect(hit.cell).toBe(core.Cell.Empty);
    expect(hit.collision).toBe(false);

    // Simple
    hit = core.HitTest.test(grid, [2.1, 2.1]);
    expect(hit.cell).toBe(core.Cell.Terrain);
    expect(hit.collision).toBe(true);
    expect(hit.normal).toBeVector([-Math.SQRT1_2, -Math.SQRT1_2]);

    // Embedded
    hit = core.HitTest.test(grid, [3.1, 2.1]);
    expect(hit.cell).toBe(core.Cell.Terrain);
    expect(hit.collision).toBe(true);
    expect(hit.normal).toBeVector([-Math.SQRT1_2, -Math.SQRT1_2]);

    // Diagonal bias
    hit = core.HitTest.test(grid, [3.1, 1.5]);
    expect(hit.cell).toBe(core.Cell.Terrain);
    expect(hit.collision).toBe(true);
    expect(hit.normal).toBeVector([-4 / Math.sqrt(17), -1 / Math.sqrt(17)]);

    // Boundary
    hit = core.HitTest.test(grid, [0.5, 0.5]);
    expect(hit.cell).toBe(core.Cell.Terrain);
    expect(hit.collision).toBe(true);
    expect(hit.normal).toBeVector([Math.SQRT1_2, Math.SQRT1_2]);

    // Finish
    hit = core.HitTest.test(grid, [1.5, 2.5]);
    expect(hit.cell).toBe(core.Cell.Finish);
    expect(hit.collision).toBe(false);
});
