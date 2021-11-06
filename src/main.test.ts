import * as main from "./main";

test("the name of main", () => {
    expect(main.name()).toBe("ping");
});
