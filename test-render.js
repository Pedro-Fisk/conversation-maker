const fs = require("fs");
const path = require("path");
const { buildSlidesHtml } = require("./render-slides-html");

const lesson = require("./test-render-lesson.js");

const html = buildSlidesHtml(lesson);
const outPath = path.join(__dirname, "preview.html");
fs.writeFileSync(outPath, html);
console.log("Written to", outPath, html.length, "bytes");
