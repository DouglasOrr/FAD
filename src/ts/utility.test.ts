import * as utility from "./utility.js";

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toBeVector(expected: utility.Vector): R;
        }
    }
}

expect.extend({
    toBeVector(received: utility.Vector, expected: utility.Vector, atol = 1e-3) {
        const pass =
            utility.vectorLength([received[0] - expected[0], received[1] - expected[1]]) < atol;
        return {
            message: () =>
                `expected ${received} ${pass ? "not to" : "to"} be within ${atol} of ${expected}`,
            pass: pass,
        }
    }
});

test("vector expect", () => {
    expect([1, 2]).toBeVector([1, 2.00001]);
    expect([1, 2]).not.toBeVector([1, 2.1]);
});

test("vectors", () => {
    expect(utility.vectorLength([3, 4])).toBeCloseTo(5);
    expect(utility.vectorDot([1, -1], [2, -3])).toBeCloseTo(5);
    expect(utility.vectorDistance([10, 20], [50, -10])).toBeCloseTo(50);
    expect(utility.vectorSub([5, 7], [6, -2])).toBeVector([-1, 9]);
});

test("bearing difference", () => {
    const differences = [-3 * Math.PI / 4, -0.1, 0, 0.1, 3 * Math.PI / 4];
    for (let a = -Math.PI; a < Math.PI; a += 0.1) {
        for (const difference of differences) {
            let b = a + difference;
            if (b < Math.PI) b += 2 * Math.PI;
            if (b > Math.PI) b -= 2 * Math.PI;
            expect(utility.bearingDifference(a, b)).toBeCloseTo(difference);
        }
    }
});

test("distanceToLine", () => {
    // Middle
    expect(utility.distanceToLine([10, 20], [15, 15], [15, 20]))
        .toBeCloseTo(5 * Math.SQRT1_2);
    // Start
    expect(utility.distanceToLine([10, 20], [15, 15], [10, 27]))
        .toBeCloseTo(7);
    // End
    expect(utility.distanceToLine([10, 20], [15, 15], [16, 16]))
        .toBeCloseTo(Math.SQRT2);
});
