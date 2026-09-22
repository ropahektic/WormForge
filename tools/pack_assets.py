"""Pack PX gifs and real stock extract atlases into the GitHub Pages tree.

Stock catalog = PNGs that exist under WA_EXTRACT (Desktop/player), never the
engine Display-id alias table (_2 / # stubs).
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENGINE = Path(r"C:\Users\Adw11\Desktop\NewPX")
PX_SRC = Path(r"C:\Users\Adw11\Downloads\px gifs\pxl_gifs")
PX_GIF_RE = re.compile(r"^[A-Za-z0-9._-]+\.gif$", re.IGNORECASE)
sys.path.insert(0, str(ENGINE / "tools" / "weapon-creator"))
from gfx_preview import (  # noqa: E402
    find_extract_dir,
    find_gfx_dir,
    get_preview,
    png_size,
    slice_atlas,
)


def junk_stem(stem: str) -> bool:
    name = stem.lower()
    return (not name) or ("#" in name) or name.endswith("_2")


def gif_size(path: Path) -> tuple[int, int]:
    header = path.read_bytes()[:10]
    if len(header) >= 10 and header[:6] in (b"GIF87a", b"GIF89a"):
        w = int.from_bytes(header[6:8], "little")
        h = int.from_bytes(header[8:10], "little")
        if w and h:
            return w, h
    return 32, 32


def pack_px() -> int:
    dest = ROOT / "px"
    dest.mkdir(exist_ok=True)
    rows = []
    n = 0
    for path in sorted(PX_SRC.iterdir(), key=lambda p: p.name.lower()):
        if not path.is_file() or not PX_GIF_RE.fullmatch(path.name):
            continue
        target = dest / path.name
        if not target.exists() or target.stat().st_size != path.stat().st_size:
            shutil.copy2(path, target)
        fw, fh = gif_size(target)
        rows.append(
            {
                "name": path.stem,
                "file": path.name,
                "path": f"sprites/{path.name}",
                "preview": f"px/{path.name}",
                "fw": fw,
                "fh": fh,
                "frames": 1,
            }
        )
        n += 1
    (ROOT / "data" / "px_sprites.json").write_text(json.dumps(rows), encoding="utf-8")
    print(f"px {n} gifs")
    return n


def pack_stock() -> int:
    extract = find_extract_dir()
    if extract is None:
        print("WA extract missing; stock catalog not rebuilt")
        return 0

    gfx = get_preview()
    id_by_name = {}
    id_path = ENGINE / "crates" / "gfx" / "stock_sprites.json"
    if id_path.is_file():
        for row in json.loads(id_path.read_text(encoding="utf-8")):
            name = str(row.get("name") or "").lower()
            if junk_stem(name):
                continue
            if row.get("id") is not None:
                id_by_name[name] = int(row["id"])

    dest = ROOT / "stock"
    dest.mkdir(exist_ok=True)
    # Drop stale first-frame / alias thumbs so the folder matches the catalog.
    for stale in dest.glob("*.png"):
        stale.unlink()

    rows = []
    for path in sorted(extract.glob("*.png"), key=lambda p: p.stem.lower()):
        stem = path.stem.lower()
        if junk_stem(stem):
            continue
        size = png_size(path)
        if size is None:
            continue
        png_w, png_h = size
        spr_frames = None
        fps = 10
        if gfx is not None:
            try:
                meta = gfx.header(stem)
                spr_frames = meta["frames"]
                fps = meta["fps"] or 10
            except Exception:
                pass
        frames, frame_w, frame_h = slice_atlas(png_w, png_h, spr_frames)
        target = dest / f"{stem}.png"
        shutil.copy2(path, target)
        rows.append(
            {
                "name": stem,
                "id": id_by_name.get(stem),
                "fw": frame_w,
                "fh": frame_h,
                "frames": frames,
                "fps": fps,
                "preview": f"stock/{stem}.png",
            }
        )

    rows.sort(key=lambda row: (row["id"] is None, row["id"] or 0, row["name"]))
    (ROOT / "data" / "stock_sprites.json").write_text(json.dumps(rows), encoding="utf-8")

    # Panel icons from extract/hi only (real files).
    meta = json.loads((ROOT / "data" / "catalog.json").read_text(encoding="utf-8"))
    hi_src = extract / "hi"
    hi_dest = dest / "hi"
    hi_dest.mkdir(exist_ok=True)
    for stale in hi_dest.glob("*.png"):
        stale.unlink()
    icons = []
    if hi_src.is_dir():
        for path in sorted(hi_src.glob("*.png")):
            stem = path.stem.lower()
            if junk_stem(stem):
                continue
            size = png_size(path) or (48, 48)
            shutil.copy2(path, hi_dest / f"{stem}.png")
            icons.append(
                {
                    "name": stem,
                    "fw": size[0],
                    "fh": size[1],
                    "preview": f"stock/hi/{stem}.png",
                }
            )
    meta["icons"] = icons
    (ROOT / "data" / "catalog.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"stock {len(rows)} atlases, {len(icons)} icons (from {extract})")
    return len(rows)


if __name__ == "__main__":
    pack_px()
    pack_stock()
