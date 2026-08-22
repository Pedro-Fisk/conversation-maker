// Local test: build a .pptx from the shared mock lesson (test-render-lesson.js,
// the same one used to QA the HTML preview renderer) using the real Canva
// template backgrounds + slide-layouts.js coordinate map.
const fs = require("fs");
const path = require("path");
const { buildPptxBuffer } = require("./pptx-builder.js");

// node test-pptx.js --es  → monta a aula de espanhol (é ela que expõe os
// textos fixos do template, que saíam em inglês até 21/08/2026)
const espanhol = process.argv.includes("--es");
const lesson = espanhol
  ? require("./test-render-lesson-es.js")
  : require("./test-render-lesson.js");

buildPptxBuffer(lesson).then((buffer) => {
  const outPath = path.join(__dirname, espanhol ? "test-output-es.pptx" : "test-output.pptx");
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
});
