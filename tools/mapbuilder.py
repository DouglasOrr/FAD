import enum
import json
from pathlib import Path
from typing import Any, Dict

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


class MapPng:
    START = 0xFF00FF00
    START_LOOK_AT = 0xFFFFFF00
    BREADCRUMB = 0xFF0000FF
    TERRAIN = 0xFF000000
    FINISH = 0xFFFF0000

    def __init__(self, data: np.ndarray):
        self.data = data

    @classmethod
    def load(cls, path: Path) -> "MapPng":
        # Transpose to format [x, y, channel]
        return cls(imageio.imread(path).swapaxes(0, 1))

    def find_pixels(self, pixel: np.ndarray) -> np.ndarray:
        return np.stack(np.where(np.all((self.data == pixel), -1)), -1)

    def find_start(self) -> np.ndarray:
        starts = self.find_pixels(int_to_rgba(self.START))
        if len(starts) != 1:
            raise ValueError(
                f"Expected exactly 1 START pixel #{self.START:>08x},"
                f" found {len(starts)} = {starts}"
            )
        return starts[0]

    def find_start_look_at(self) -> np.ndarray:
        look_at = self.find_pixels(int_to_rgba(self.START_LOOK_AT))
        if len(look_at) != 1:
            raise ValueError(
                f"Expected exactly 1 START_LOOK_AT pixel #{self.START_LOOK_AT:>08x},"
                f" found {len(look_at)} = {look_at}"
            )
        return look_at[0]

    def find_breadcrumbs(self) -> np.ndarray:
        breadcrumbs = self.find_pixels(int_to_rgba(self.BREADCRUMB))
        if not breadcrumbs.size:
            raise ValueError(
                f"Expected at least one BREADCRUMB pixel #{self.BREADCRUMB:>08x}"
            )
        return breadcrumbs

    def get_breadcrumbs_path(self) -> np.ndarray:
        breadcrumbs = self.find_breadcrumbs()
        order = [self.find_start()]
        while breadcrumbs.size:
            idx = np.argmin(np.sum(((breadcrumbs - order[-1]) ** 2), -1))
            order.append(breadcrumbs[idx])
            breadcrumbs = np.delete(breadcrumbs, idx, axis=0)
        return np.stack(order[1:])

    def get_cell(self, x: int, y: int) -> Cell:
        rgba = self.data[x, y]
        colour = rgba_to_int(rgba)
        if rgba[3] == 0 or colour in {self.START, self.START_LOOK_AT, self.BREADCRUMB}:
            return Cell.BLANK
        if colour == self.TERRAIN:
            return Cell.TERRAIN
        if colour == self.FINISH:
            return Cell.FINISH
        raise ValueError(f"Bad pixel value #{colour:>08x} at {[x, y]}")

    def to_jsonable(self) -> Dict[str, Any]:
        start = self.find_start()
        look = self.find_start_look_at() - start
        bearing = np.arctan2(-look[0], look[1])  # clockwise from +y
        width, height, _ = self.data.shape
        return dict(
            width=width,
            height=height,
            start=start.tolist(),
            start_bearing=bearing,
            breadcrumbs=self.get_breadcrumbs_path().tolist(),
            cells=[
                self.get_cell(x, y).value for y in range(height) for x in range(width)
            ],
        )

    def to_json(self) -> str:
        return json.dumps(self.to_jsonable(), separators=(",", ":"))


def build(src: Path, dest: Path) -> None:
    dest.write_text(MapPng.load(src).to_json())
