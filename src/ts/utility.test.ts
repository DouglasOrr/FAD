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

test("vectors", () => {
    expect(utility.vectorLength([3, 4])).toBeCloseTo(5);
    expect(utility.vectorDot([1, -1], [2, -3])).toBeCloseTo(5);
});

test("vector expect", () => {
    expect([1, 2]).toBeVector([1, 2.00001]);
    expect([1, 2]).not.toBeVector([1, 2.1]);
});
