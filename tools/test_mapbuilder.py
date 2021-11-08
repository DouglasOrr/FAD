import numpy as np
import mapbuilder


def test_rgba_conversions():
    for colour, rgba in [
        (0xFF000000, [0, 0, 0, 255]),
        (0x00FF0000, [255, 0, 0, 0]),
        (0x0000FF00, [0, 255, 0, 0]),
        (0x000000FF, [0, 0, 255, 0]),
    ]:
        np.testing.assert_equal(mapbuilder.int_to_rgba(colour), rgba)
        np.testing.assert_equal(mapbuilder.rgba_to_int(rgba), colour)


def test_mappng():
    char_to_colour = {
        " ": 0x00000000,
        ".": mapbuilder.MapPng.TERRAIN,
        "s": mapbuilder.MapPng.START,
        "l": mapbuilder.MapPng.START_LOOK_AT,
        "b": mapbuilder.MapPng.BREADCRUMB,
        "f": mapbuilder.MapPng.FINISH,
    }
    mapstr = """
.....
.sl .
.bbf.
.....
"""
    converted = mapbuilder.MapPng(
        np.stack(
            [
                [mapbuilder.int_to_rgba(char_to_colour[col]) for col in row]
                for row in mapstr.strip("\n").split("\n")
            ]
        ).swapaxes(0, 1)
    ).to_jsonable()
    assert converted["width"] == 5
    assert converted["height"] == 4
    np.testing.assert_equal(converted["start"], [1, 1])
    np.testing.assert_approx_equal(converted["start_bearing"], -np.pi / 2)
    np.testing.assert_equal(converted["breadcrumbs"], [[1, 2], [2, 2]])
    np.testing.assert_equal(
        converted["cells"],
        np.array(
            [
                [1, 1, 1, 1, 1],
                [1, 0, 0, 0, 1],
                [1, 0, 0, 2, 1],
                [1, 1, 1, 1, 1],
            ]
        ).flatten(),
    )
