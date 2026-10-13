"""Parses "SCIENCE F2/MCQ 100.docx" into the same JSON as parse-science-f1.py.

Laid out differently from the Form 1 paper, so it has its own reader:

  - Question numbers are Word's automatic list numbering, so the digits are
    not in the text. A question starts at each list paragraph; there are
    exactly 100, all in one list, which is checked.
  - All four options share one paragraph, each starting "<letter><em space>"
    at the start of a line. Some options wrap with a line break part-way
    through ("... selari /<br/>P is a monocotyledon ..."), so options are cut
    at the letters, never at line breaks.
  - The diagram numbers in the stems follow the question numbers, which is
    used as a cross-check on the numbering.

Usage: python scripts/parse-science-f2.py <docx> <out.json> <imageDir>
"""

import json
import re
import sys
import zipfile
from pathlib import Path

OPTION_START = re.compile(r"(?:^|\n)([A-D]) ")


def run_text(xml: str) -> str:
    out = []
    for m in re.finditer(r"<w:t(?: [^>]*)?>([^<]*)</w:t>|<w:tab/>|<w:br/>", xml):
        if m.group(0) == "<w:tab/>":
            out.append("\t")
        elif m.group(0) == "<w:br/>":
            out.append("\n")
        else:
            out.append(m.group(1))
    return (
        "".join(out)
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
    )


def split_options(text: str) -> list[dict]:
    starts = list(OPTION_START.finditer(text))
    options = []
    for i, m in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(text)
        body = re.sub(r"\s*\n\s*", " ", text[m.end():end]).strip()
        options.append({"letter": m.group(1), "text": body, "images": []})
    return options


def main(docx: str, out_json: str, image_dir: str) -> None:
    z = zipfile.ZipFile(docx)
    xml = z.read("word/document.xml").decode("utf8")
    rels = z.read("word/_rels/document.xml.rels").decode("utf8")
    rid = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels))
    body = xml.split("<w:body>")[1]
    blocks = re.findall(r"<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>", body, flags=re.S)

    def images_in(fragment: str) -> list[str]:
        return [rid[r] for r in re.findall(r'r:embed="(rId\d+)"', fragment) if r in rid]

    questions: list[dict] = []
    chapter = None
    q = None
    issues: list[str] = []

    for b in blocks:
        text = run_text(b)
        imgs = images_in(b)

        if b.startswith("<w:tbl>"):
            if q:
                # A small data table inside the question. Kept as text, in
                # its place in the stem, one row per line - it reflows on a
                # phone, which a picture of a table would not.
                rows = re.findall(r"<w:tr[ >].*?</w:tr>", b, flags=re.S)
                lines = [
                    " | ".join(re.sub(r"\s+", " ", run_text(c)).strip() for c in re.findall(r"<w:tc>.*?</w:tc>", r, flags=re.S))
                    for r in rows
                ]
                q["stem"].append("\n".join(lines))
                q["stemTables"].append(len(rows))
                q["images"] += imgs
            continue

        m = re.match(r"^Bab (\d+):", text)
        if m:
            chapter = int(m.group(1))
            continue

        if "<w:numPr>" in b and text.strip():
            q = {"n": len(questions) + 1, "chapter": chapter, "stem": [text], "images": imgs, "options": [], "stemTables": []}
            questions.append(q)
            continue

        if q is None or not (text.strip() or imgs):
            continue

        if OPTION_START.match(text):
            if q["options"]:
                issues.append(f"Q{q['n']}: a second options paragraph")
            q["options"] = split_options(text)
            q["images"] += imgs
            continue

        if q["options"]:
            issues.append(f"Q{q['n']}: text after its options: {text[:60]!r}")
        q["stem"].append(text)
        q["images"] += imgs

    # ---- report ----------------------------------------------------------
    if len(questions) != 100:
        issues.append(f"expected 100 questions, found {len(questions)}")
    for x in questions:
        letters = "".join(o["letter"] for o in x["options"])
        if letters != "ABCD":
            issues.append(f"Q{x['n']}: options {letters!r}")
        if x["stemTables"]:
            issues.append(f"Q{x['n']}: table of {x['stemTables'][0]} rows kept as text in the stem")
        if len(x["images"]) > 1:
            issues.append(f"Q{x['n']}: {len(x['images'])} stem images")
        # Diagram numbers follow question numbers; a mismatch means the
        # numbering has drifted, unless the question borrows another diagram.
        refs = {int(r) for r in re.findall(r"(?:Rajah|Diagram)\s+(\d+)", " ".join(x["stem"]))}
        if x["images"] and refs and x["n"] not in refs:
            issues.append(f"Q{x['n']}: has a picture but names diagram(s) {sorted(refs)}")
        if not x["images"] and refs:
            issues.append(f"Q{x['n']}: no picture of its own; names diagram(s) {sorted(refs)} (to borrow)")

    out_dir = Path(image_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    used = {im for x in questions for im in x["images"]}
    for rel in used:
        (out_dir / Path(rel).name).write_bytes(z.read(f"word/{rel}"))

    Path(out_json).write_text(json.dumps(questions, ensure_ascii=False, indent=1), encoding="utf8")
    chapters: dict = {}
    for x in questions:
        chapters[x["chapter"]] = chapters.get(x["chapter"], 0) + 1
    print(f"{len(questions)} questions; per chapter {chapters}")
    print(f"{sum(1 for x in questions if x['images'])} with a picture; {len(used)} images written")
    print(f"{len(issues)} notes:")
    for i in issues:
        print("  " + i)


if __name__ == "__main__":
    main(*sys.argv[1:4])
