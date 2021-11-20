import collections
import enum
import json
from pathlib import Path
from typing import Any, Dict, Optional

import imageio
import numpy as np


def int_to_rgba(colour: int) -> np.ndarray:
    return np.array([(colour >> (8 * n)) & 0xFF for n in [2, 1, 0, 3]])


def rgba_to_int(rgba: np.ndarray) -> int:
    return sum((rgba[n] & 0xFF) << (8 * i) for i, n in enumerate([2, 1, 0, 3]))


class Cell(enum.Enum):
    BLANK = 0
    TERRAIN = 1
    FINISH = 2
    INTERFERENCE = 3


class MapPng:
    START = 0xFF00FF00
    START_LOOK_AT = 0xFF008800
    BREADCRUMB_MASK = 0xFF0000FF
    TERRAIN = 0xFF000000
    FINISH = 0xFFFF0000
    INTERFERENCE = 0xFFFFFF00

    @classmethod
    def is_breadcrumb(cls, colour: int) -> bool:
        return (colour & cls.BREADCRUMB_MASK) == cls.BREADCRUMB_MASK

    def __init__(self, data: np.ndarray):
        self.data = data

    @classmethod
    def load(cls, path: Path) -> "MapPng":
        # Transpose to format [x, y, channel]
        rgba = imageio.imread(path).swapaxes(0, 1)
        # Convert pixels to colour integers
        return cls(np.array([[rgba_to_int(pixel) for pixel in row] for row in rgba]))

    def find_pixels(self, pixel: int, mask: Optional[int] = None) -> np.ndarray:
        data = self.data if mask is None else (self.data & mask)
        return np.stack(np.where(data == pixel), -1)

    def find_start(self) -> np.ndarray:
        starts = self.find_pixels(self.START)
        if len(starts) != 1:
            raise ValueError(
                f"Expected exactly 1 START pixel #{self.START:>08x},"
                f" found {len(starts)} = {starts}"
            )
        return starts[0]

    def find_start_look_at(self) -> np.ndarray:
        look_at = self.find_pixels(self.START_LOOK_AT)
        if len(look_at) != 1:
            raise ValueError(
                f"Expected exactly 1 START_LOOK_AT pixel #{self.START_LOOK_AT:>08x},"
                f" found {len(look_at)} = {look_at}"
            )
        return look_at[0]

    def find_breadcrumbs(self) -> np.ndarray:
        breadcrumbs = self.find_pixels(self.BREADCRUMB_MASK, self.BREADCRUMB_MASK)
        if not breadcrumbs.size:
            raise ValueError(
                f"Expected at least one BREADCRUMB pixel #{self.BREADCRUMB:>08x}"
            )
        return breadcrumbs

    def filter_breadcrumbs(
        self, breadcrumbs: np.ndarray, alternative: bool
    ) -> np.ndarray:
        result = []
        selected_green = 0x88 if alternative else 0x00
        for x, y in breadcrumbs:
            green = (self.data[x, y] >> 8) & 0xFF
            if green not in {0x00, 0x88, 0xFF}:
                raise ValueError(
                    f"Unexpected green hue for breadcrumb {self.data[x, y]:>08x}"
                )
            if green == 0xFF or green == selected_green:
                result.append([x, y])
        return np.array(result)

    def get_route(self, alternative: bool) -> Optional[np.ndarray]:
        breadcrumbs = self.filter_breadcrumbs(self.find_breadcrumbs(), alternative)
        if not breadcrumbs.size:
            return None
        order = [self.find_start()]
        while breadcrumbs.size:
            idx = np.argmin(np.sum(((breadcrumbs - order[-1]) ** 2), -1))
            order.append(breadcrumbs[idx])
            breadcrumbs = np.delete(breadcrumbs, idx, axis=0)
        return np.stack(order)

    def get_neighbour_colour(self, x: int, y: int) -> int:
        counts = collections.Counter(
            self.data[xx, yy]
            for xx, yy in [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
        )
        order = counts.most_common()
        if 2 <= len(order) and order[0][1] == order[1][1]:
            raise ValueError(
                f"Point [{x}, {y}] has ambiguous colour from neighbours: {order}"
            )
        return order[0][0]

    def get_cell(self, x: int, y: int) -> Cell:
        colour = self.data[x, y]
        if colour in {self.START, self.START_LOOK_AT} or self.is_breadcrumb(colour):
            colour = self.get_neighbour_colour(x, y)
        if not (colour & 0xFF000000):
            return Cell.BLANK
        if colour == self.TERRAIN:
            return Cell.TERRAIN
        if colour == self.FINISH:
            return Cell.FINISH
        if colour == self.INTERFERENCE:
            return Cell.INTERFERENCE
        raise ValueError(f"Bad pixel value #{colour:>08x} at {[x, y]}")

    def to_jsonable(self) -> Dict[str, Any]:
        start = self.find_start()
        look = self.find_start_look_at() - start
        bearing = np.arctan2(-look[0], look[1])  # clockwise from +y
        width, height = self.data.shape
        routes = [
            route.tolist()
            for route in map(self.get_route, [False, True])
            if route is not None
        ]
        return dict(
            width=width,
            height=height,
            start=start.tolist(),
            start_bearing=bearing,
            routes=routes,
            cells=[
                self.get_cell(x, y).value for y in range(height) for x in range(width)
            ],
        )

    def to_json(self) -> str:
        return json.dumps(self.to_jsonable(), separators=(",", ":"))


def build(src: Path, dest: Path) -> None:
    dest.write_text(MapPng.load(src).to_json())
