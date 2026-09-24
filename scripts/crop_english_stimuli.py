"""Crops the Part 1 stimulus pictures out of a scanned SPM English K1 paper.

Part 1 lays each question out in two columns: the stimulus (a poster, a chat
screenshot, a notice) on the left, the stem and options on the right. Only the
left column is wanted - the stem is transcribed as text - so the crop is found
rather than measured by hand, which would be 120 boxes across the fifteen state
papers and would have to be redone for every paper added later.

Finding it: ink is counted per row within the left column only, giving a
profile of where content sits. Rows with ink become bands; bands separated by
less than MIN_GAP are joined, because the space between a poster's title and
its body is not a question boundary; bands too short to be a stimulus are
dropped, which removes the running header, the page number and the Telegram
watermark.

Usage:
    python scripts/crop_english_stimuli.py <paper.pdf> <outDir> <page> [page...]

Pages are 1-based, as printed on the PDF. Writes <outDir>/pNN-K.png plus a
bands.json describing what it found, so a bad split is visible without opening
every crop.
"""

import json
import sys
from pathlib import Path

import numpy as np
import pymupdf

DPI = 200
# The stem starts around 52% across. A fixed cut here is a poor boundary: set
# tight enough to exclude the question number it clips the widest posters, and
# set wide enough for those it swallows the number. So the cut is deliberately
# generous and each band is then trimmed to its own content - see trim_sides.
LEFT_COLUMN_END = 0.53
LEFT_MARGIN = 0.05
# A trailing blob narrower than this, standing alone at the right of a band, is
# the question number rather than part of the stimulus.
NUMBER_MAX_WIDTH = 0.035
# Horizontal whitespace that separates one thing from another within a band.
COLUMN_GAP = 0.02
# A row counts as inked once this share of its pixels are dark, which ignores
# the speckle scanning leaves on an otherwise blank row.
INK_ROW_THRESHOLD = 0.004
DARK = 160
# Vertical whitespace that still belongs to one stimulus, as a share of page
# height. Below this, two bands are joined.
MIN_GAP = 0.035
# Anything shorter than this is page furniture, not a stimulus.
MIN_BAND = 0.06
PAD = 0.012


def find_bands(gray: np.ndarray) -> list[tuple[int, int]]:
    height, width = gray.shape
    x0 = int(width * LEFT_MARGIN)
    x1 = int(width * LEFT_COLUMN_END)

    column = gray[:, x0:x1]
    inked = (column < DARK).mean(axis=1) >= INK_ROW_THRESHOLD

    bands: list[list[int]] = []
    start = None
    for y, on in enumerate(inked):
        if on and start is None:
            start = y
        elif not on and start is not None:
            bands.append([start, y])
            start = None
    if start is not None:
        bands.append([start, height])

    merged: list[list[int]] = []
    min_gap = height * MIN_GAP
    for band in bands:
        if merged and band[0] - merged[-1][1] < min_gap:
            merged[-1][1] = band[1]
        else:
            merged.append(list(band))

    pad = round(height * PAD)
    return [
        (max(0, a - pad), min(height, b + pad))
        for a, b in merged
        if b - a >= height * MIN_BAND
    ]


def trim_sides(gray: np.ndarray, top: int, bottom: int) -> tuple[int, int]:
    """Horizontal extent of the stimulus within one band.

    Returns the x range holding the picture, with the question number dropped.
    The number is recognised by shape rather than by reading it: a narrow group
    of ink, standing clear of everything else, at the right-hand end of the
    band. Nothing else in the left column looks like that.
    """
    height, width = gray.shape
    x0 = int(width * LEFT_MARGIN)
    x1 = int(width * LEFT_COLUMN_END)

    band = gray[top:bottom, x0:x1]
    inked = (band < DARK).mean(axis=0) >= INK_ROW_THRESHOLD

    groups: list[list[int]] = []
    start = None
    for x, on in enumerate(inked):
        if on and start is None:
            start = x
        elif not on and start is not None:
            groups.append([start, x])
            start = None
    if start is not None:
        groups.append([start, len(inked)])

    if not groups:
        return x0, x1

    merged: list[list[int]] = []
    gap = width * COLUMN_GAP
    for g in groups:
        if merged and g[0] - merged[-1][1] < gap:
            merged[-1][1] = g[1]
        else:
            merged.append(list(g))

    # Drop a lone narrow group at the right - that is the question number.
    if len(merged) > 1 and merged[-1][1] - merged[-1][0] <= width * NUMBER_MAX_WIDTH:
        merged.pop()

    pad = round(width * 0.008)
    return max(x0, x0 + merged[0][0] - pad), min(x1, x0 + merged[-1][1] + pad)


def crop_page(doc, page_no: int, out_dir: Path) -> list[dict]:
    page = doc[page_no - 1]
    pix = page.get_pixmap(dpi=DPI, colorspace=pymupdf.csGRAY)
    gray = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)

    bands = find_bands(gray)
    print(f"page {page_no}: {len(bands)} band(s) " + ", ".join(f"{a}-{b}" for a, b in bands))

    scale = 72 / DPI  # pixmap pixels back to PDF points, which is what clip takes
    found = []
    for i, (top, bottom) in enumerate(bands, start=1):
        left, right = trim_sides(gray, top, bottom)
        clip = pymupdf.Rect(left * scale, top * scale, right * scale, bottom * scale)
        out = out_dir / f"p{page_no:02d}-{i}.png"
        page.get_pixmap(dpi=DPI, clip=clip).save(out)
        found.append(
            {
                "page": page_no,
                "index": i,
                "file": out.name,
                "top": top,
                "bottom": bottom,
                "left": left,
                "right": right,
            }
        )
    return found


def main() -> None:
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)

    pdf, out_dir, *pages = sys.argv[1:]
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(pdf)
    results = []
    for page_no in (int(p) for p in pages):
        results += crop_page(doc, page_no, out)

    (out / "bands.json").write_text(json.dumps(results, indent=2))
    print(f"\n{len(results)} crops written to {out}")


if __name__ == "__main__":
    main()
