"""Parses "Sains F1 - Kertas Soalan (100 MCQ).docx" into structured questions.

The paper is bilingual: each stem and option carries Malay then English. In
the XML a question paragraph is <number><tab><Malay><br/><English>, and an
option is <letter><tab><Malay / English>, either as its own paragraph or as a
cell in a row of options.

Writes JSON (stems, options, image files per question, chapter)
for the importer, and prints anything irregular so it can be looked at
rather than imported wrongly: questions without four options, options that
are pictures, tables inside a stem, and questions carrying several images.

Usage: python scripts/parse-science-f1.py <docx> <out.json> <imageDir>
"""

import json
import re
import sys
import zipfile
from pathlib import Path

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def run_text(xml: str) -> str:
    """Text of a fragment with tabs and line breaks kept."""
    out = []
    for m in re.finditer(r"<w:t(?: [^>]*)?>([^<]*)</w:t>|<w:tab/>|<w:br/>", xml):
        if m.group(0) == "<w:tab/>":
            out.append("\t")
        elif m.group(0) == "<w:br/>":
            out.append("\n")
        else:
            out.append(m.group(1))
    text = "".join(out)
    return (
        text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
    )


def main(docx: str, out_json: str, image_dir: str) -> None:
    z = zipfile.ZipFile(docx)
    xml = z.read("word/document.xml").decode("utf8")
    rels = z.read("word/_rels/document.xml.rels").decode("utf8")
    rid = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels))

    body = xml.split("<w:body>")[1]
    blocks = re.findall(r"<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>|<w:p/>", body, flags=re.S)

    questions: list[dict] = []
    chapter = None
    q = None
    issues: list[str] = []

    def images_in(fragment: str) -> list[str]:
        return [rid[r] for r in re.findall(r'r:embed="(rId\d+)"', fragment) if r in rid]

    def add_option(letter: str, text: str, imgs: list[str]) -> None:
        if q is None:
            return
        q["options"].append({"letter": letter, "text": text.strip(), "images": imgs})

    for b in blocks:
        if b.startswith("<w:tbl>"):
            rows = re.findall(r"<w:tr[ >].*?</w:tr>", b, flags=re.S)
            cells = [c for r in rows for c in re.findall(r"<w:tc>.*?</w:tc>", r, flags=re.S)]
            texts = [run_text(c).strip() for c in cells]
            if q and texts and all(re.match(r"^[A-D]\t", t) for t in texts if t):
                for c, t in zip(cells, texts):
                    if t:
                        add_option(t[0], t[2:], images_in(c))
                continue
            if q is None:
                continue  # the front-page chapter table
            # Any other table belongs to the stem: keep it as text rows, and
            # its pictures as stem pictures.
            q["stemTables"].append([[run_text(c).strip() for c in re.findall(r"<w:tc>.*?</w:tc>", r, flags=re.S)] for r in rows])
            q["images"] += images_in(b)
            continue

        text = run_text(b)
        imgs = images_in(b)

        m = re.match(r"^Bab (\d+):", text)
        if m:
            chapter = int(m.group(1))
            continue

        m = re.match(r"^(\d{1,3})\t(.*)$", text, flags=re.S)
        if m and int(m.group(1)) == (q["n"] + 1 if q else 1):
            q = {"n": int(m.group(1)), "chapter": chapter, "stem": [m.group(2)], "images": imgs, "options": [], "stemTables": []}
            questions.append(q)
            continue

        m = re.match(r"^([A-D])\t(.*)$", text, flags=re.S)
        if m and q:
            add_option(m.group(1), m.group(2), imgs)
            continue

        if q and (text.strip() or imgs):
            if q["options"]:
                issues.append(f"Q{q['n']}: text after its options: {text[:60]!r}")
            q["stem"].append(text)
            q["images"] += imgs

    # ---- report ----------------------------------------------------------
    nums = [x["n"] for x in questions]
    if nums != list(range(1, 101)):
        issues.append(f"question numbers are not 1..100: got {len(nums)}, last {nums[-1] if nums else None}")
    for x in questions:
        letters = "".join(o["letter"] for o in x["options"])
        if letters != "ABCD":
            issues.append(f"Q{x['n']}: options {letters!r}")
        if any(o["images"] for o in x["options"]):
            issues.append(f"Q{x['n']}: picture options {[o['letter'] for o in x['options'] if o['images']]}")
        if len(x["images"]) > 1:
            issues.append(f"Q{x['n']}: {len(x['images'])} stem images")
        if x["stemTables"]:
            issues.append(f"Q{x['n']}: {len(x['stemTables'])} table(s) in the stem")

    out_dir = Path(image_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    used = {im for x in questions for im in x["images"] + [i for o in x["options"] for i in o["images"]]}
    for rel in used:
        (out_dir / Path(rel).name).write_bytes(z.read(f"word/{rel}"))

    Path(out_json).write_text(json.dumps(questions, ensure_ascii=False, indent=1), encoding="utf8")
    chapters = {}
    for x in questions:
        chapters[x["chapter"]] = chapters.get(x["chapter"], 0) + 1
    print(f"{len(questions)} questions; per chapter {chapters}")
    print(f"{sum(1 for x in questions if x['images'])} with a stem picture; {len(used)} images written")
    print(f"{len(issues)} irregularities:")
    for i in issues:
        print("  " + i)


if __name__ == "__main__":
    main(*sys.argv[1:4])
