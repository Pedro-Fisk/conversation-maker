import json, os, sys, textwrap
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE, "qa-dump.json")) as f:
    data = json.load(f)

W, H = data["CANVAS_W"], data["CANVAS_H"]
POPPINS = "/usr/share/fonts/truetype/google-fonts/Poppins-{}.ttf"

def font(weight, size):
    name = "Bold" if weight and weight >= 600 else "Regular"
    path = POPPINS.format(name)
    if not os.path.exists(path):
        path = POPPINS.format("Regular")
    return ImageFont.truetype(path, size)

def wrap_to_width(draw, text, fnt, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]

overflow_report = []

for page in data["pages"]:
    img = Image.new("RGB", (W, H), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    for f in page["fields"]:
        top = f["top"] / 100 * H
        left = f["left"] / 100 * W
        width = f["width"] / 100 * W
        height = f["height"] / 100 * H
        draw.rectangle([left, top, left + width, top + height], outline=(200, 200, 255))

        size = f.get("fontSize", 30)
        weight = f.get("fontWeight", 400)
        line_height = f.get("lineHeight", 1.3)
        fnt = font(weight, size)
        line_px = size * line_height

        used_h = 0
        y = top

        if f.get("qaBlock"):
            qfnt = font(700, f["questionFontSize"])
            afnt = font(400, f["answerFontSize"])
            spacing_em = float(str(f.get("blockSpacing", "1.5em")).replace("em", ""))
            spacing_px = spacing_em * 16
            for i, item in enumerate(f["items"]):
                qlines = wrap_to_width(draw, f"{i+1}. {item['question']}", qfnt, width)
                for ql in qlines:
                    draw.text((left, y), ql, font=qfnt, fill=(0, 0, 0))
                    y += f["questionFontSize"] * line_height
                for ans in item.get("modelAnswers", []):
                    alines = wrap_to_width(draw, ans, afnt, width)
                    for al in alines:
                        draw.text((left, y), al, font=afnt, fill=(120, 120, 120))
                        y += f["answerFontSize"] * line_height
                y += spacing_px
            used_h = y - top

        elif f.get("list"):
            items = f["items"]
            if f.get("grid"):
                col_gap = 32  # column-gap:2em, computed against 16px root (unset font-size context)
                col_w = (width - col_gap) / 2
                n_rows = (len(items) + 1) // 2
                row_y = top
                for row in range(n_rows):
                    row_heights = []
                    for col in range(2):
                        idx = row * 2 + col
                        if idx >= len(items):
                            continue
                        it = items[idx]
                        label = f"{it['word']} - {it.get('translation','')}"
                        lines = wrap_to_width(draw, label, fnt, col_w)
                        tx = left + col * (col_w + col_gap)
                        for li, l in enumerate(lines):
                            draw.text((tx, row_y + li * line_px), l, font=fnt, fill=(0, 0, 0))
                        row_heights.append(len(lines) * line_px)
                    row_y += max(row_heights) if row_heights else line_px
                used_h = row_y - top
            else:
                spacing_em = float(str(f.get("itemSpacing", "0.3em")).replace("em", ""))
                spacing_px = spacing_em * size
                for it in items:
                    lines = wrap_to_width(draw, f"• {it}", fnt, width)
                    for l in lines:
                        draw.text((left, y), l, font=fnt, fill=(0, 0, 0))
                        y += line_px
                    y += spacing_px
                used_h = y - top

        else:
            text = f.get("text", "")
            paragraphs = text.split("\n\n") if text else [""]
            for p in paragraphs:
                lines = wrap_to_width(draw, p, fnt, width)
                for l in lines:
                    draw.text((left, y), l, font=fnt, fill=(0, 0, 0))
                    y += line_px
            used_h = y - top

        if used_h > height + 4:
            overflow_report.append(
                f"page {page['page']} ({page['role']}): field overflow by {used_h - height:.0f}px "
                f"(box {height:.0f}px, content {used_h:.0f}px, fontSize {size})"
            )

    out = os.path.join(BASE, f"qa3-{page['page']}.png")
    img.save(out)

print("OVERFLOW REPORT:")
if overflow_report:
    for line in overflow_report:
        print(" -", line)
else:
    print(" none detected")
