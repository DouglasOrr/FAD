import * as player from "./player.js";

test("gain", () => {
    expect(player.dbToGain(-20)).toBeCloseTo(0.1);
});

test("triangle", () => {
    const cases = [[0, 0], [Math.PI / 4, 0.5], [Math.PI / 2, 1], [Math.PI, 0], [3 * Math.PI / 2, -1]];
    for (const [x, y] of cases) {
        expect(player.triangleWave(x)).toBeCloseTo(y);
        expect(player.triangleWave(x + 2 * Math.PI)).toBeCloseTo(y);
        expect(player.triangleWave(x - 2 * Math.PI)).toBeCloseTo(y);
    }
});
