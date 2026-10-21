"""Parses "SCIENCE F2/F2 Science Objective by Chapter (EN-BM).docx" into JSON.

The document is laid out question by question, by chapter:

  CHAPTER 1: BIODIVERSITY            (and the BM heading, in italics)
  [Module I - Model Paper Set 1, Q1] (italic: where the question came from)
  1<tab>English stem line
  BM stem line                       (italic)
  [picture]
  ...
  | A<tab>English<i>BM</i> | B<tab>English<i>BM</i> |   (the options, 2x2)
  | C ...                 | D ...                 |

English and BM sit side by side throughout, BM always in italics, which is
what tells them apart - in a paragraph pair, inside an option cell, and
inside a table cell. Some questions put the options in a table with column
headings ( | P | Q, then rows A to D ); a few have a data table in the stem.

The portal stores bilingual text Malay first (see src/lib/bilingual.ts):
each stem paragraph "BM\\nEN", each option "BM / EN", each table cell
"BM / EN". The output is in that form.

Usage: python scripts/parse-science-f2-bychapter.py <docx> <out.json> <imageDir>
"""

import json
import re
import sys
import zipfile
from pathlib import Path

LETTERS = "ABCD"


def run_parts(fragment: str) -> list[tuple[str, bool, bool]]:
    """(text, italic, is_image) for each run, tabs and breaks kept."""
    out = []
    for r in re.findall(r"<w:r[ >].*?</w:r>", fragment, flags=re.S):
        img = "r:embed" in r
        pieces = []
        for m in re.finditer(r"<w:t(?: [^>]*)?>([^<]*)</w:t>|<w:tab/>|<w:br/>", r):
            g = m.group(0)
            pieces.append("\t" if g == "<w:tab/>" else "\n" if g == "<w:br/>" else m.group(1))
        t = (
            "".join(pieces)
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", '"')
            .replace("&apos;", "'")
        )
        italic = bool(re.search(r"<w:i/>|<w:i w:val=\"(1|true|on)\"/>", r))
        if img:
            out.append(("", False, True))
        if t:
            out.append((t, italic, False))
    return out


def split_en_bm(parts) -> tuple[str, str]:
    """English is upright, BM italic - wherever they share a paragraph or cell."""
    en = "".join(t for t, i, img in parts if not img and not i)
    bm = "".join(t for t, i, img in parts if not img and i)
    return en.strip(), bm.strip()


def tidy(s: str) -> str:
    # A " / " inside the text would be read as the BM/English divider.
    return re.sub(r"\s+/\s+", "/", re.sub(r"[ \t]+", " ", s)).strip()


def pair(bm: str, en: str) -> str:
    """One cell or option, "BM / EN" - or once, where the two are the same."""
    bm, en = tidy(bm), tidy(en)
    if not bm or bm == en:
        return en
    if not en:
        return bm
    return f"{bm} / {en}"


def main(docx: str, out_json: str, image_dir: str) -> None:
    z = zipfile.ZipFile(docx)
    xml = z.read("word/document.xml").decode("utf8")
    rels = z.read("word/_rels/document.xml.rels").decode("utf8")
    rid = dict(re.findall(r'Id="(rId\w+)"[^>]*Target="([^"]+)"', rels))
    body = xml.split("<w:body>")[1]
    blocks = re.findall(r"<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>", body, flags=re.S)

    questions: list[dict] = []
    issues: list[str] = []
    chapter = None
    q = None
    pending_en = None  # an English stem line waiting for its BM partner

    def flush_pending():
        nonlocal pending_en
        if q is not None and pending_en is not None:
            q["stem"].append(pending_en)  # English with no BM line after it
            pending_en = None

    for b in blocks:
        if b.startswith("<w:tbl>"):
            if q is None:
                continue
            flush_pending()
            rows = []
            for r in re.findall(r"<w:tr[ >].*?</w:tr>", b, flags=re.S):
                rows.append([run_parts(c) for c in re.findall(r"<w:tc>.*?</w:tc>", r, flags=re.S)])
            images = [rid[m] for m in re.findall(r'r:embed="(rId\w+)"', b) if m in rid]

            def cell_text(parts):
                return "".join(t for t, i, img in parts if not img)

            first = [cell_text(row[0]).strip() for row in rows]
            # The usual options grid: cells "A<tab>English<i>BM</i>".
            grid = [cell for row in rows for cell in row]
            starts = [re.match(r"^([A-D])\t", cell_text(c)) for c in grid]
            if all(starts) and "".join(m.group(1) for m in starts) == LETTERS:
                opts = []
                for c in grid:
                    letter = cell_text(c).strip()[0]
                    en, bm = split_en_bm(c)
                    # The cell starts with its letter (upright, so on the
                    # English side) and a tab: take off exactly that, once,
                    # so an option that begins with the word "A" keeps it.
                    if en.startswith(letter):
                        en = en[1:].lstrip()
                    has_img = any(img for _, _, img in c)
                    opts.append({"letter": letter, "text": pair(bm, en), "image": has_img})
                q["options"] = opts
                q["images"] += images
                continue
            # Options as a table with headings: header row, then rows A-D.
            letters = [f for f in first]
            if letters[1:] == list(LETTERS) and len(rows) == 5:
                heads = [split_en_bm(c) for c in rows[0][1:]]
                opts = []
                for row in rows[1:]:
                    vals = [split_en_bm(c) for c in row[1:]]
                    bm = ", ".join(f"{tidy(h[1] or h[0])}: {tidy(v[1] or v[0])}" for h, v in zip(heads, vals))
                    en = ", ".join(f"{tidy(h[0])}: {tidy(v[0])}" for h, v in zip(heads, vals))
                    opts.append({"letter": cell_text(row[0]).strip(), "text": pair(bm, en), "image": False})
                q["options"] = opts
                q["optionTable"] = True
                continue
            # Otherwise a data table in the stem, kept as "cell | cell" lines.
            lines = []
            for row in rows:
                lines.append(" | ".join(pair(*reversed(split_en_bm(c))) for c in row))
            q["stem"].append("\n".join(lines))
            q["images"] += images
            q["tables"] += 1
            continue

        parts = run_parts(b)
        text = "".join(t for t, i, img in parts if not img)
        has_img = any(img for _, _, img in parts)
        images = [rid[m] for m in re.findall(r'r:embed="(rId\w+)"', b) if m in rid]
        stripped = text.strip()
        all_italic = bool(stripped) and all(i for t, i, img in parts if not img and t.strip())

        m = re.match(r"^CHAPTER (\d+):", stripped)
        if m and not all_italic:
            flush_pending()
            chapter = int(m.group(1))
            continue
        if re.match(r"^BAB \d+:", stripped):
            continue
        m = re.match(r"^\[(.+)\]$", stripped)
        if m and all_italic:
            flush_pending()
            q = {
                "chapter": chapter,
                "source": m.group(1),
                "number": None,
                "stem": [],
                "images": [],
                "options": [],
                "tables": 0,
            }
            questions.append(q)
            continue
        if q is None:
            continue
        if images:
            flush_pending()
            q["images"] += images
            if not stripped:
                continue
        if not stripped:
            continue

        if all_italic:
            # The BM partner of the English line before it.
            if pending_en is None:
                q["stem"].append(tidy_lines(stripped))
                issues.append(f"Ch{chapter} {q['source']}: BM line with no English before it: {stripped[:60]!r}")
            else:
                # A numbered statement's BM line carries no number of its own.
                roman = re.match(r"^(I|II|III|IV|V|VI)\. ", pending_en)
                bm_line = stripped
                if roman and not re.match(r"^(I|II|III|IV|V|VI)", bm_line):
                    bm_line = f"{roman.group(1)}. {bm_line}"
                q["stem"].append(join_pair(bm_line, pending_en))
                pending_en = None
            continue

        flush_pending()
        en = stripped
        if q["number"] is None:
            mm = re.match(r"^(\d+)\t\s*(.*)$", en, flags=re.S)
            if mm:
                q["number"] = int(mm.group(1))
                en = mm.group(2)
        # "I<tab>statement" - a numbered statement; its BM line follows.
        en = re.sub(r"^(I|II|III|IV|V|VI)\t", r"\1. ", en)
        pending_en = en
    flush_pending()

    # Some questions draw their four options inside the picture, labelled A to D.
    # Those get plain A-D choices; the picture says what each is.
    for x in questions:
        if not x["options"] and x["images"]:
            x["options"] = [{"letter": l, "text": l, "image": False} for l in LETTERS]
            x["optionsInPicture"] = True

    # ---- report ----------------------------------------------------------------
    for x in questions:
        tag = f"Ch{x['chapter']} Q{x['number']} [{x['source']}]"
        letters = "".join(o["letter"] for o in x["options"])
        if letters != LETTERS:
            issues.append(f"{tag}: options {letters!r}")
        if any(o["image"] for o in x["options"]):
            issues.append(f"{tag}: picture options")
        if len(x["images"]) > 1:
            issues.append(f"{tag}: {len(x['images'])} pictures")
        for o in x["options"]:
            if o["text"].count(" / ") > 1:
                issues.append(f"{tag}: option {o['letter']} has several ' / ': {o['text'][:80]!r}")
        for p in x["stem"]:
            if "\n" not in p and " | " not in p:
                issues.append(f"{tag}: one-language paragraph: {p[:70]!r}")

    out_dir = Path(image_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    used = {im for x in questions for im in x["images"]}
    for rel in used:
        (out_dir / Path(rel).name).write_bytes(z.read(f"word/{rel}"))

    # A question shows one picture in the portal. Where the paper has two - a
    # diagram, then a picture of the options - they are stacked into one.
    for x in questions:
        if len(x["images"]) > 1:
            from PIL import Image  # only needed here

            parts = [Image.open(out_dir / Path(rel).name).convert("RGB") for rel in x["images"]]
            width = max(im.width for im in parts)
            gap = 24
            sheet = Image.new("RGB", (width, sum(im.height for im in parts) + gap * (len(parts) - 1)), "white")
            y = 0
            for im in parts:
                sheet.paste(im, ((width - im.width) // 2, y))
                y += im.height + gap
            name = "+".join(Path(rel).stem for rel in x["images"]) + ".png"
            sheet.save(out_dir / name)
            x["images"] = [f"media/{name}"]

    Path(out_json).write_text(json.dumps(questions, ensure_ascii=False, indent=1), encoding="utf8")
    per = {}
    for x in questions:
        per[x["chapter"]] = per.get(x["chapter"], 0) + 1
    print(f"{len(questions)} questions; per chapter {per}")
    print(f"{sum(1 for x in questions if x['images'])} with a picture; {len(used)} pictures written")
    print(f"{len(issues)} notes:")
    for i in issues:
        print("  " + i)


def tidy_lines(s: str) -> str:
    return "\n".join(re.sub(r"[ \t]+", " ", l).strip() for l in s.split("\n"))


def join_pair(bm: str, en: str) -> str:
    """A stem paragraph, Malay first. A bulleted list pairs line by line."""
    bm_lines = [l for l in tidy_lines(bm).split("\n") if l.strip()]
    en_lines = [l for l in tidy_lines(en).split("\n") if l.strip()]
    if len(bm_lines) == len(en_lines) and len(en_lines) > 1:
        return "\n\n".join(f"{b}\n{e}" for b, e in zip(bm_lines, en_lines))
    return f"{' '.join(bm_lines)}\n{' '.join(en_lines)}"


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(*sys.argv[1:4])
