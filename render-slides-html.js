/*
 * render-slides-html.js
 *
 * Turns a `lesson` object into a single self-contained HTML document (18
 * pages, one per Canva template slide) using slide-layouts.js for exact
 * positioning over the real exported backgrounds. This HTML is what both
 * the PDF renderer (api/export-pdf.js, via headless Chromium) and, in
 * spirit, the pptx builder (pptx-builder.js) are driven from — the layout
 * numbers are shared so the two outputs stay in sync.
 *
 * Canonical `lesson` shape this module expects (this is the contract
 * api/generate-lesson.js must produce — see task to update its prompt):
 *
 *   {
 *     coverTitle: string,               // e.g. "Discovering Japan"
 *     coverLevel: string,                // "Basic" | "Intermediate" | "Advanced" | "Spanish B1"
 *     language: string,                  // "english" | "spanish" — drives language-adaptive
 *                                         // static labels (e.g. the Introduction divider title)
 *     topic: string,                     // short topic phrase, e.g. "Japan"
 *     objectives: string[3],
 *     vocabulary: { word: string, translation: string }[8],
 *     introText: string,                 // 1 short paragraph (Basic) or 2 paragraphs
 *                                         // joined with a blank line (Intermediate/Advanced)
 *     conversation: { question: string, modelAnswers: [string, string] }[9],
 *     languageGame: { question: string, modelAnswers: [string, string] }[6],
 *     evaluation: { question: string, modelAnswers: [string, string] }[2],
 *   }
 *
 * Every AI-generated string is treated as untrusted text and HTML-escaped
 * before being inserted.
 */

const fs = require("fs");
const path = require("path");
const { LAYOUTS, CANVAS_W, CANVAS_H, FONT_MARKER, FONT_BODY } = require("./slide-layouts");
const { getQaItems, buildDynamicValue } = require("./lesson-data");

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Cache base64-encoded backgrounds across calls within the same warm
// serverless instance, so repeated exports in the same lambda don't re-read
// + re-encode 18 PNGs from disk every time.
const bgCache = new Map();

function bgDataUri(relPath) {
  if (bgCache.has(relPath)) return bgCache.get(relPath);
  const abs = path.join(__dirname, relPath);
  const buf = fs.readFileSync(abs);
  const uri = `data:image/png;base64,${buf.toString("base64")}`;
  bgCache.set(relPath, uri);
  return uri;
}

/*
 * Fonts are self-hosted (base64-embedded @font-face, no external network
 * fetch) rather than pulled from Google Fonts via @import at render time.
 * A first version used `@import url('https://fonts.googleapis.com/...')`
 * and it silently fell back to a system font (Calibri) in production —
 * headless Chromium on Vercel isn't guaranteed to finish an external font
 * fetch before the page is rasterized to PDF, so any runtime network
 * dependency for fonts is fragile. Embedding removes that dependency
 * entirely, the same fix already applied to the background images.
 *
 * Font files come from the @fontsource/* npm packages (added as real
 * dependencies in package.json) rather than being hand-copied into the
 * repo, so `npm install` on Vercel's build machine — which has normal
 * internet access, unlike this sandbox — fetches them at build time.
 * `require.resolve()` with a literal path lets Vercel's file-tracing
 * (@vercel/nft) detect and bundle these files automatically, the same way
 * it already handles any other `require()`d file.
 */
const fontCache = new Map();

function fontFaceBase64(pkgPath) {
  if (fontCache.has(pkgPath)) return fontCache.get(pkgPath);
  const abs = require.resolve(pkgPath);
  const buf = fs.readFileSync(abs);
  const b64 = buf.toString("base64");
  fontCache.set(pkgPath, b64);
  return b64;
}

function buildFontFaceCss() {
  const poppinsWeights = [400, 500, 600, 700, 800];
  const poppinsFaces = poppinsWeights
    .map((w) => {
      const b64 = fontFaceBase64(`@fontsource/poppins/files/poppins-latin-${w}-normal.woff2`);
      return `
  @font-face {
    font-family: 'Poppins';
    font-style: normal;
    font-weight: ${w};
    font-display: swap;
    src: url(data:font/woff2;base64,${b64}) format('woff2');
  }`;
    })
    .join("\n");

  const markerB64 = fontFaceBase64(
    "@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff2"
  );
  const markerFace = `
  @font-face {
    font-family: 'Permanent Marker';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url(data:font/woff2;base64,${markerB64}) format('woff2');
  }`;

  return poppinsFaces + "\n" + markerFace;
}

function fieldStyle(field) {
  return [
    `position:absolute`,
    `top:${field.top}%`,
    `left:${field.left}%`,
    `width:${field.width}%`,
    `height:${field.height}%`,
    `display:flex`,
    `flex-direction:column`,
    `justify-content:center`,
    `text-align:${field.align || "left"}`,
    `align-items:${field.align === "center" ? "center" : field.align === "right" ? "flex-end" : "flex-start"}`,
  ].join(";");
}

function renderTextField(field) {
  const style = [
    fieldStyle(field),
    `font-family:${field.font}`,
    `font-size:${field.fontSize}px`,
    `font-weight:${field.fontWeight}`,
    `color:${field.color}`,
    `line-height:${field.lineHeight || 1.3}`,
    field.letterSpacing ? `letter-spacing:${field.letterSpacing}px` : "",
  ]
    .filter(Boolean)
    .join(";");

  if (field.kind === "badge") {
    const badgeStyle = [
      fieldStyle(field),
      `font-family:${field.font}`,
      `font-size:${field.fontSize}px`,
      `font-weight:${field.fontWeight}`,
      `color:${field.color}`,
      `letter-spacing:${field.letterSpacing || 0}px`,
    ].join(";");
    return `<div style="${badgeStyle}"><span style="background:${field.background};border-radius:999px;padding:0.35em 1em;display:inline-block;">${escapeHtml(
      field.value
    )}</span></div>`;
  }

  if (field.kind === "static") {
    return `<div style="${style}">${escapeHtml(field.value)}</div>`;
  }

  return null; // dynamic/qaBlock handled by caller with lesson data
}

function renderList(field, items) {
  const style = fieldStyle(field);
  const innerStyle = [
    `font-family:${field.font}`,
    `font-size:${field.fontSize}px`,
    `font-weight:${field.fontWeight}`,
    `color:${field.color}`,
    `line-height:${field.lineHeight || 1.3}`,
    `width:100%`,
  ].join(";");

  if (field.grid) {
    // Vocabulary: two-column grid of word/translation pairs.
    const cells = items
      .map(
        (w) =>
          `<div style="padding:0.5em 0;"><strong>${escapeHtml(w.word)}</strong>${
            w.translation ? ` &mdash; ${escapeHtml(w.translation)}` : ""
          }</div>`
      )
      .join("");
    return `<div style="${style}"><div style="${innerStyle};display:grid;grid-template-columns:1fr 1fr;column-gap:2em;">${cells}</div></div>`;
  }

  const spacing = field.itemSpacing || "0.3em";
  const rows = items
    .map((text, i) => {
      const marker = field.numbered ? `${i + 1}.` : field.bullet || "•";
      return `<div style="padding:${spacing} 0;"><span style="margin-right:0.5em;">${marker}</span>${escapeHtml(
        text
      )}</div>`;
    })
    .join("");
  return `<div style="${style}"><div style="${innerStyle}">${rows}</div></div>`;
}

function renderQaBlock(field, items) {
  const style = fieldStyle(field);
  const blocks = items
    .map((item, i) => {
      const qStyle = [
        `font-family:${field.questionFont}`,
        `font-size:${field.questionFontSize}px`,
        `font-weight:${field.questionWeight}`,
        `color:${field.color}`,
        `line-height:${field.lineHeight || 1.3}`,
      ].join(";");
      const aStyle = [
        `font-family:${field.answerFont}`,
        `font-size:${field.answerFontSize}px`,
        `font-weight:${field.answerWeight}`,
        `color:${field.answerColor}`,
        `line-height:${field.lineHeight || 1.3}`,
        `font-style:italic`,
      ].join(";");
      const answers = (item.modelAnswers || [])
        .map((a) => `<div style="${aStyle}">${escapeHtml(a)}</div>`)
        .join("");
      return `<div style="margin-bottom:${field.blockSpacing || "1.1em"};">
        <div style="${qStyle}">${field.startIndex + i + 1}. ${escapeHtml(item.question)}</div>
        ${answers}
      </div>`;
    })
    .join("");
  return `<div style="${style}"><div style="width:100%;">${blocks}</div></div>`;
}

function renderField(field, lesson) {
  if (field.kind === "static" || field.kind === "badge") {
    return renderTextField(field);
  }
  if (field.kind === "qaBlock") {
    const items = getQaItems(lesson, field.group, field.startIndex, field.count);
    return renderQaBlock(field, items);
  }
  // dynamic
  const value = buildDynamicValue(lesson, field.key);
  if (field.list) {
    return renderList(field, value);
  }
  if (field.key === "introText") {
    const paragraphs = String(value)
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 0.7em;">${escapeHtml(p)}</p>`)
      .join("");
    const style = fieldStyle(field);
    const innerStyle = [
      `font-family:${field.font}`,
      `font-size:${field.fontSize}px`,
      `font-weight:${field.fontWeight}`,
      `color:${field.color}`,
      `line-height:${field.lineHeight || 1.3}`,
      `width:100%`,
    ].join(";");
    return `<div style="${style}"><div style="${innerStyle}">${paragraphs}</div></div>`;
  }
  const style = fieldStyle(field);
  const textStyle = [
    `font-family:${field.font}`,
    `font-size:${field.fontSize}px`,
    `font-weight:${field.fontWeight}`,
    `color:${field.color}`,
    `line-height:${field.lineHeight || 1.3}`,
  ].join(";");
  return `<div style="${style}"><div style="${textStyle}">${escapeHtml(value)}</div></div>`;
}

function renderSlide(layout, lesson) {
  const bg = bgDataUri(layout.bg);
  const fieldsHtml = layout.fields.map((f) => renderField(f, lesson)).join("\n");
  return `<section class="slide" style="background-image:url('${bg}');">
    ${fieldsHtml}
  </section>`;
}

function buildSlidesHtml(lesson) {
  const slidesHtml = LAYOUTS.map((layout) => renderSlide(layout, lesson)).join("\n");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  ${buildFontFaceCss()}
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  .slide {
    position: relative;
    width: ${CANVAS_W}px;
    height: ${CANVAS_H}px;
    background-size: cover;
    background-position: center;
    overflow: hidden;
    page-break-after: always;
  }
  .slide:last-child { page-break-after: avoid; }
</style>
</head>
<body>
${slidesHtml}
</body>
</html>`;
}

module.exports = { buildSlidesHtml, escapeHtml };
