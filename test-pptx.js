// Local test: build a .pptx from the shared mock lesson (test-render-lesson.js,
// the same one used to QA the HTML/PDF renderer) using the real Canva
// template backgrounds + slide-layouts.js coordinate map.
const fs = require("fs");
const path = require("path");
const { buildPptxBuffer } = require("./pptx-builder.js");

const lesson = require("./test-render-lesson.js");

buildPptxBuffer(lesson).then((buffer) => {
  const outPath = path.join(__dirname, "test-output.pptx");
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
});
