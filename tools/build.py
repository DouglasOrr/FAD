#!/usr/bin/env python3

"""App build & continuous rebuild."""

import argparse
import datetime
import fnmatch
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path
from typing import Callable, List, Optional, Tuple

import inotify.adapters

import mapbuilder


def run(
    command: List[str],
    background: bool = False,
    cwd: Optional[Path] = None,
    log: Optional[Path] = None,
) -> None:
    command = [arg for arg in command if arg is not None]
    print(f"$ {' '.join(command)}", file=sys.stderr)
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    process = subprocess.Popen(
        command,
        cwd=cwd,
        stdout=log.open("wb", buffering=0) if log else None,
        stderr=subprocess.STDOUT if log else None,
        env=env,
    )
    if not background:
        if rc := process.wait():
            sys.exit(rc)


class Rules:
    Rule = Callable[[Path, Path], None]

    @staticmethod
    def copy(src: Path, dest: Path) -> None:
        shutil.copy(src, dest)

    @staticmethod
    def mapbuilder(src: Path, dest: Path) -> None:
        mapbuilder.build(src, dest)


def custom_build(
    src_root: Path,
    rules: List[Tuple[str, str, Rules.Rule]],
    dest_root: Path,
    watch: bool,
) -> None:
    def _dobuild(src: Path) -> None:
        for ending, replacement, rule in rules:
            if src.name.endswith(ending):
                name = src.name[: -len(ending)] + replacement
                dest = dest_root / src.parent.relative_to(src_root) / name
                if not src.exists():
                    print(f"$ rm {dest}", file=sys.stderr)
                    dest.unlink(missing_ok=True)
                else:
                    print(f"$ {rule.__name__} {src} {dest}", file=sys.stderr)
                    dest.parent.mkdir(exist_ok=True)
                    rule(src, dest)
                return  # The first matching rule is applied

    def _dowatch() -> None:
        events = inotify.adapters.InotifyTree(str(src_root)).event_gen(
            yield_nones=False
        )
        for _, types, parent, name in events:
            if any(
                x in types
                for x in ["IN_CLOSE_WRITE", "IN_MOVED_TO", "IN_DELETE", "IN_MOVED_FROM"]
            ):
                _dobuild(Path(parent) / name)

    # Initial sync
    for src in src_root.rglob("*"):
        _dobuild(src)

    # Watch for changes
    if watch:
        threading.Thread(target=_dowatch, daemon=True).start()


def build(dev: bool, port: int) -> None:
    out = Path("dist_dev" if dev else "dist")
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    if dev:
        run(
            ["python3", "-m", "http.server", str(port)],
            background=True,
            cwd=out,
            log=out / "server.log",
        )
    run(
        ["npx", "tsc", "--outDir", str(out), "--watch" if dev else None],
        background=dev,
    )
    shutil.copy("assets/favicon.ico", out / "favicon.ico")
    for src_root, rules, dest_root in [
        (
            Path("src"),
            [(".html", ".html", Rules.copy), (".css", ".css", Rules.copy)],
            out,
        ),
        (
            Path("assets"),
            [
                (".map.png", ".map.json", Rules.mapbuilder),
                (".mp3", ".mp3", Rules.copy),
                (".png", ".png", Rules.copy),
            ],
            out / "assets",
        ),
    ]:
        custom_build(src_root, rules, dest_root, watch=dev)
    with (out / "COMMIT").open("wb") as f:
        subprocess.check_call(["git", "rev-parse", "HEAD"], stdout=f)

    # Create a submission zipfile
    if not dev:
        run(
            ["zip", "-r", f"FAD_{datetime.datetime.now().isoformat()}.zip", "."],
            cwd=out,
        )

    if dev:
        threading.Event().wait()  # wait forever


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dev",
        action="store_true",
        help="run in dev mode (continuous rebuilding & serving)",
    )
    parser.add_argument(
        "--port",
        default=8000,
        type=int,
        help="dev server port",
    )
    build(**vars(parser.parse_args()))
