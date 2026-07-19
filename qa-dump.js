// Dumps resolved field boxes + text for a mock lesson to JSON, so a Python
// script (no headless browser available in this sandbox) can approximate-
// render each slide and flag any text that would overflow its box at the
// new, larger font sizes.
const fs = require("fs");
const path = require("path");
const { LAYOUTS, CANVAS_W, CANVAS_H } = require("./slide-layouts");
const { getQaItems, buildDynamicValue } = require("./lesson-data");

const lesson = require("./test-render-lesson.js");

const pages = LAYOUTS.map((layout) => {
  const fields = layout.fields.map((f) => {
    const base = {
      kind: f.kind,
      top: f.top,
      left: f.left,
      width: f.width,
      height: f.height,
      font: f.font,
      fontSize: f.fontSize,
      fontWeight: f.fontWeight,
      lineHeight: f.lineHeight || 1.3,
      align: f.align,
    };
    if (f.kind === "static" || f.kind === "badge") {
      return { ...base, text: f.value };
    }
    if (f.kind === "qaBlock") {
      const items = getQaItems(lesson, f.group, f.startIndex, f.count);
      return {
        ...base,
        qaBlock: true,
        questionFontSize: f.questionFontSize,
        answerFontSize: f.answerFontSize,
        blockSpacing: f.blockSpacing,
        items,
      };
    }
    const value = buildDynamicValue(lesson, f.key);
    if (f.list) {
      return { ...base, list: true, grid: !!f.grid, itemSpacing: f.itemSpacing, items: value };
    }
    return { ...base, text: value };
  });
  return { page: layout.page, role: layout.role, fields };
});

fs.writeFileSync(
  path.join(__dirname, "qa-dump.json"),
  JSON.stringify({ CANVAS_W, CANVAS_H, pages }, null, 2)
);
console.log("wrote qa-dump.json");
