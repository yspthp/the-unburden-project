"""Subset Noto Serif HK to the characters used in the project and embed it inline.

Re-run after editing any copy:  python tools/embed_font.py
"""
import base64
import io
import pathlib
import re

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
HTML = PROJECT_ROOT / "index.html"
CONTENT_JS = PROJECT_ROOT / "js" / "content.js"
FONTS_CSS = PROJECT_ROOT / "css" / "fonts.css"
SRC = ROOT / "NotoSerifHK.ttf"
PATTERN = re.compile(r"data:font/woff2;base64,[A-Za-z0-9+/=]*")

sources = [p.read_text(encoding="utf-8") for p in (HTML, CONTENT_JS) if p.exists()]
combined = "\n".join(PATTERN.sub("", s) for s in sources)
chars = {c for c in combined if ord(c) > 127} | {chr(i) for i in range(32, 127)}

font = TTFont(SRC)
opts = subset.Options()
opts.layout_features = ["*"]
opts.hinting = False
opts.desubroutinize = True
sub = subset.Subsetter(opts)
sub.populate(text="".join(chars))
sub.subset(font)
font = instancer.instantiateVariableFont(font, {"wght": (300, 400, 600)})

buf = io.BytesIO()
font.flavor = "woff2"
font.save(buf)
data = base64.b64encode(buf.getvalue()).decode("ascii")

target = FONTS_CSS if FONTS_CSS.exists() else HTML
target_text = target.read_text(encoding="utf-8")
updated_text = PATTERN.sub(lambda _: "data:font/woff2;base64," + data, target_text, count=1)
target.write_text(updated_text, encoding="utf-8")
print(f"{len(chars)} chars, woff2 {len(buf.getvalue()) // 1024} KB embedded into {target.relative_to(PROJECT_ROOT)}")
