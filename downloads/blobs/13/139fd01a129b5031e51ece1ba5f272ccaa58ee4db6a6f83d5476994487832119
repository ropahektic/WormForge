import shutil
import struct
import subprocess
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PACK = ROOT / "mods" / "examples" / "wormcraft" / "sprites"
SRC = ROOT / "Resources" / "Fantasy Spells"

GLYPHS = {
    "W": [
        "10001",
        "10001",
        "10101",
        "10101",
        "01010",
        "01010",
        "01010",
    ],
    "o": [
        "00000",
        "01110",
        "10001",
        "10001",
        "10001",
        "01110",
        "00000",
    ],
    "r": [
        "00000",
        "11110",
        "10001",
        "10000",
        "10000",
        "10000",
        "00000",
    ],
    "m": [
        "00000",
        "11011",
        "10101",
        "10101",
        "10001",
        "10001",
        "00000",
    ],
    "C": [
        "01110",
        "10001",
        "10000",
        "10000",
        "10000",
        "10001",
        "01110",
    ],
    "a": [
        "00000",
        "01110",
        "00001",
        "01111",
        "10001",
        "01111",
        "00000",
    ],
    "f": [
        "00111",
        "01000",
        "11100",
        "01000",
        "01000",
        "01000",
        "00000",
    ],
    "t": [
        "01000",
        "01000",
        "11110",
        "01000",
        "01000",
        "00111",
        "00000",
    ],
}


def png_rgba(w: int, h: int, rgba: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    raw = b"".join(b"\x00" + rgba[y * w * 4 : (y + 1) * w * 4] for y in range(h))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def write_glyph(name: str, rows: list[str], scale: int = 10) -> None:
    gh, gw = len(rows), len(rows[0])
    w, h = gw * scale, gh * scale
    pix = bytearray(w * h * 4)
    r, g, b, a = 255, 220, 64, 255
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != "1":
                continue
            for dy in range(scale):
                for dx in range(scale):
                    i = ((y * scale + dy) * w + x * scale + dx) * 4
                    pix[i : i + 4] = bytes((r, g, b, a))
    PACK.mkdir(parents=True, exist_ok=True)
    (PACK / f"{name}.png").write_bytes(png_rgba(w, h, bytes(pix)))


def copy_frames(src: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for p in dest.glob("*.png"):
        p.unlink()
    for p in sorted(src.glob("frame*.png")):
        shutil.copy2(p, dest / p.name)


def copy_wav(name: str, mp3_name: str) -> None:
    wav_dir = PACK.parent / "sounds"
    wav_dir.mkdir(parents=True, exist_ok=True)
    wav = wav_dir / name
    mp3 = ROOT / "Resources" / mp3_name
    if not mp3.is_file():
        return
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(mp3),
            "-ar",
            "22050",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(wav),
        ],
        check=True,
    )


def write_cutin() -> None:
    from PIL import Image

    res = ROOT / "Resources"
    cut = Image.open(res / "animecutout.png").convert("RGBA")
    cut = cut.resize((800, 400), Image.Resampling.BILINEAR)
    PACK.mkdir(parents=True, exist_ok=True)
    cut.save(PACK / "cutout.png")

    gif = Image.open(res / "shader.gif")
    dest = PACK / "shader"
    dest.mkdir(parents=True, exist_ok=True)
    for p in dest.glob("*.png"):
        p.unlink()
    n = getattr(gif, "n_frames", 1)
    for i in range(n):
        gif.seek(i)
        frame = gif.convert("RGBA").resize((800, 464), Image.Resampling.BILINEAR)
        frame.save(dest / f"frame{i:04d}.png")


def main() -> None:
    PACK.mkdir(parents=True, exist_ok=True)
    for name, rows in GLYPHS.items():
        write_glyph(name, rows)
    copy_frames(
        SRC / "spell_absorb_001" / "spell_absorb_001_small_violet",
        PACK / "absorb",
    )
    copy_frames(
        SRC / "spell_attack_up_001" / "spell_attack_up_001_small_red",
        PACK / "burst",
    )
    copy_frames(
        SRC / "spell_death_001" / "spell_death_001_small_red",
        PACK / "death",
    )
    copy_frames(
        SRC / "spell_haste_001" / "spell_haste_001_small_green",
        PACK / "haste",
    )
    copy_frames(
        SRC / "spell_heal_001" / "spell_heal_001_small_red",
        PACK / "heal",
    )
    write_cutin()
    copy_wav("emotional-damage.wav", "emotional-damage-meme.mp3")
    copy_wav("cutout.wav", "cutout.mp3")
    print("wrote", PACK)


if __name__ == "__main__":
    main()
