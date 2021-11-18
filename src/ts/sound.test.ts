import * as sound from "./sound.js";

test("gain", () => {
    expect(sound.dbToGain(-20)).toBeCloseTo(0.1);
});

test("triangle", () => {
    const cases = [[0, 0], [Math.PI / 4, 0.5], [Math.PI / 2, 1], [Math.PI, 0], [3 * Math.PI / 2, -1]];
    for (const [x, y] of cases) {
        expect(sound.triangleWave(x)).toBeCloseTo(y);
        expect(sound.triangleWave(x + 2 * Math.PI)).toBeCloseTo(y);
        expect(sound.triangleWave(x - 2 * Math.PI)).toBeCloseTo(y);
    }
});
