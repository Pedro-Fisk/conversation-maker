/*
 * pptx-builder.js
 *
 * Builds a real .pptx using the same real Canva template background PNGs
 * (assets/bg/*.png) and the same exact coordinate map (slide-layouts.js)
 * that drives the HTML/PDF renderer (render-slides-html.js) — so the two
 * exports stay visually consistent and both stay faithful to the original
 * Canva template. This replaces the old generic-shapes pptxgenjs approach
 * (banner bars, plain ellipses) that didn't match the real template.
 *
 * Coordinate system: slide-layouts.js expresses every box as a % of the
 * 1920x1080 canvas. The pptx slide is set to the same 16:9 aspect ratio at
 * 13.333in x 7.5in (a standard PowerPoint widescreen size), so:
 *   inches = (percent / 100) * slideDimensionInInches
 * Since 1920px maps to 13.333in, 1px == 1/144in, so a font declared as
 * `Npx` in slide-layouts.js becomes `N * 0.5` points (px/144in * 72pt/in).
 */

const path = require("path");
const pptxgen = require("pptxgenjs");
const { LAYOUTS, FONT_MARKER } = require("./slide-layouts");
const { getQaItems, buildDynamicValue } = require("./lesson-data");

const SLIDE_W_IN = 13.333;
const SLIDE_H_IN = 7.5;
const PT_PER_PX = 0.5; // see header comment

const xIn = (pct) => (pct / 100) * SLIDE_W_IN;
const yIn = (pct) => (pct / 100) * SLIDE_H_IN;
const wIn = (pct) => (pct / 100) * SLIDE_W_IN;
const hIn = (pct) => (pct / 100) * SLIDE_H_IN;
const pt = (px) => Math.round(px * PT_PER_PX * 10) / 10;
const hex = (c) => String(c || "").replace("#", "");
const faceFor = (cssFont) => (cssFont === FONT_MARKER ? "Aptos" : "Poppins");

function addStatic(slide, field) {
  slide.addText(field.value, {
    x: xIn(field.left),
    y: yIn(field.top),
    w: wIn(field.width),
    h: hIn(field.height),
    fontFace: faceFor(field.font),
    fontSize: pt(field.fontSize),
    bold: field.fontWeight >= 600,
    color: hex(field.color),
    align: field.align || "left",
    valign: "middle",
    lineSpacingMultiple: field.lineHeight || 1.3,
    wrap: true,
  });
}

function addBadge(slide, field, pptx) {
  slide.addText(field.value, {
    shape: pptx.ShapeType.roundRect,
    rectRadius: hIn(field.height) / 2,
    fill: { color: hex(field.background) },
    line: { type: "none" },
    x: xIn(field.left),
    y: yIn(field.top),
    w: wIn(field.width),
    h: hIn(field.height),
    fontFace: faceFor(field.font),
    fontSize: pt(field.fontSize),
    bold: field.fontWeight >= 600,
    color: hex(field.color),
    align: "center",
    valign: "middle",
    charSpacing: field.letterSpacing || 0,
  });
}

function addSimpleDynamic(slide, field, value) {
  slide.addText(String(value || ""), {
    x: xIn(field.left),
    y: yIn(field.top),
    w: wIn(field.width),
    h: hIn(field.height),
    fontFace: faceFor(field.font),
    fontSize: pt(field.fontSize),
    bold: field.fontWeight >= 600,
    color: hex(field.color),
    align: field.align || "left",
    valign: "middle",
    lineSpacingMultiple: field.lineHeight || 1.3,
    wrap: true,
  });
}

function addBulletList(slide, field, items) {
  const runs = (items || []).map((text, i) => ({
    text,
    options: {
      bullet: { code: "2022" },
      breakLine: i < items.length - 1,
      fontFace: faceFor(field.font),
      fontSize: pt(field.fontSize),
      bold: field.fontWeight >= 600,
      color: hex(field.color),
      paraSpaceAfter: pt(field.fontSize) * 0.5,
    },
  }));
  slide.addText(runs, {
    x: xIn(field.left),
    y: yIn(field.top),
    w: wIn(field.width),
    h: hIn(field.height),
    valign: "top",
    align: field.align || "left",
    lineSpacingMultiple: field.lineHeight || 1.3,
    wrap: true,
  });
}

// Vocabulary grid: CSS grid-template-columns:1fr 1fr fills row-major
// (item0→col0row0, item1→col1row0, item2→col0row1, ...), so even indices
// go in the left text box and odd indices in the right one, in order.
function addVocabGrid(slide, field, items) {
  const colGapIn = 0.28;
  const colWIn = (wIn(field.width) - colGapIn) / 2;
  const left = (items || []).filter((_, i) => i % 2 === 0);
  const right = (items || []).filter((_, i) => i % 2 === 1);
  const toRuns = (col) =>
    col.map((it, i) => ({
      text: `${it.word}${it.translation ? " – " + it.translation : ""}`,
      options: {
        breakLine: i < col.length - 1,
        fontFace: faceFor(field.font),
        fontSize: pt(field.fontSize),
        bold: field.fontWeight >= 600,
        color: hex(field.color),
        paraSpaceAfter: pt(field.fontSize) * 0.4,
      },
    }));
  const baseOpts = {
    y: yIn(field.top),
    w: colWIn,
    h: hIn(field.height),
    valign: "top",
    align: "left",
    lineSpacingMultiple: field.lineHeight || 1.3,
    wrap: true,
  };
  slide.addText(toRuns(left), { ...baseOpts, x: xIn(field.left) });
  slide.addText(toRuns(right), { ...baseOpts, x: xIn(field.left) + colWIn + colGapIn });
}

function addIntroText(slide, field, value) {
  const paragraphs = String(value || "").split(/\n{2,}/);
  const runs = paragraphs.map((p, i) => ({
    text: p,
    options: {
      breakLine: true,
      fontFace: faceFor(field.font),
      fontSize: pt(field.fontSize),
      bold: field.fontWeight >= 600,
      color: hex(field.color),
      paraSpaceAfter: i < paragraphs.length - 1 ? pt(field.fontSize) * 0.6 : 0,
    },
  }));
  slide.addText(runs, {
    x: xIn(field.left),
    y: yIn(field.top),
    w: wIn(field.width),
    h: hIn(field.height),
    valign: "top",
    align: field.align || "left",
    lineSpacingMultiple: field.lineHeight || 1.3,
    wrap: true,
  });
}

function addQaBlock(slide, field, lesson) {
  const items = getQaItems(lesson, field.group, field.startIndex, field.count);
  const runs = [];
  items.forEach((item, i) => {
    runs.push({
      text: `${field.startIndex + i + 1}. ${item.question}`,
      options: {
        breakLine: true,
        bold: field.questionWeight >= 600,
        fontFace: faceFor(field.questionFont),
        fontSize: pt(field.questionFontSize),
        color: hex(field.color),
      },
    });
    (item.modelAnswers || []).forEach((ans, j) => {
      const isLast = j === item.modelAnswers.length - 1;
      runs.push({
        text: ans,
        options: {
          breakLine: true,
          italic: true,
          fontFace: faceFor(field.answerFont),
          fontSize: pt(field.answerFontSize),
          color: hex(field.answerColor),
          paraSpaceAfter: isLast ? pt(field.questionFontSize) * 0.8 : 0,
        },
      });
    });
  });
  if (runs.length) runs[runs.length - 1].options.breakLine = false;

  slide.addText(runs, {
    x: xIn(field.left),
    y: yIn(field.top),
    w: wIn(field.width),
    h: hIn(field.height),
    valign: "top",
    align: field.align || "left",
    lineSpacingMultiple: field.lineHeight || 1.3,
    wrap: true,
  });
}

// Language game é múltipla escolha (3 opções, 1 certa) em vez de
// modelAnswers abertas — mesma caixa/posição do template. Cada grupo de
// perguntas tem DOIS slides com o mesmo fundo: um com field.revealAnswer
// false (opções neutras) e outro com true (a certa ganha bolinha verde) —
// passar de slide já funciona como a "revelação" da resposta. (Tentamos
// animação clique-a-clique de verdade primeiro, mas não funcionou de forma
// confiável no PowerPoint, então Pedro optou por este caminho mais simples.)
const CORRECT_OPTION_COLOR = "1F9D55";
const OPTION_LETTERS = ["A", "B", "C"];

function addMultipleChoiceBlock(slide, field, lesson) {
  const items = getQaItems(lesson, field.group, field.startIndex, field.count);
  const runs = [];
  items.forEach((item, i) => {
    runs.push({
      text: `${field.startIndex + i + 1}. ${item.question}`,
      options: {
        breakLine: true,
        bold: field.questionWeight >= 600,
        fontFace: faceFor(field.questionFont),
        fontSize: pt(field.questionFontSize),
        color: hex(field.color),
      },
    });
    const options = item.options || [];
    options.forEach((opt, oi) => {
      const isCorrect = field.revealAnswer && oi === item.correctIndex;
      const isLast = oi === options.length - 1;
      const marker = isCorrect ? "● " : "";
      runs.push({
        text: `${marker}${OPTION_LETTERS[oi] || oi + 1}) ${opt}`,
        options: {
          breakLine: true,
          italic: !isCorrect,
          bold: isCorrect,
          fontFace: faceFor(field.answerFont),
          fontSize: pt(field.answerFontSize),
          color: isCorrect ? CORRECT_OPTION_COLOR : hex(field.answerColor),
          paraSpaceAfter: isLast ? pt(field.questionFontSize) * 0.8 : 0,
        },
      });
    });
  });
  if (runs.length) runs[runs.length - 1].options.breakLine = false;

  slide.addText(runs, {
    x: xIn(field.left),
    y: yIn(field.top),
    w: wIn(field.width),
    h: hIn(field.height),
    valign: "top",
    align: field.align || "left",
    lineSpacingMultiple: field.lineHeight || 1.3,
    wrap: true,
  });
}

// Rodapé com a fonte (livro + lição) de cada pergunta do Language Game —
// mesma lógica do render-slides-html.js (item.source vem de
// attachLanguageGameSources em api/generate-lesson.js; fica vazio para
// aulas sem estágio/mapeamento, ex.: espanhol, e o texto some sozinho).
function addLanguageGameSources(slide, field, lesson) {
  const items = getQaItems(lesson, field.group, field.startIndex, field.count);
  const parts = items
    .map((item, i) => (item.source ? `${field.startIndex + i + 1}) ${item.source}` : null))
    .filter(Boolean);
  if (!parts.length) return;

  slide.addText(parts.join("     "), {
    x: xIn(field.left),
    y: yIn(field.top),
    w: wIn(field.width),
    h: hIn(field.height),
    fontFace: faceFor(field.font),
    fontSize: pt(field.fontSize),
    italic: true,
    color: hex(field.color),
    align: field.align || "left",
    valign: "middle",
    wrap: true,
  });
}

function renderField(slide, field, lesson, pptx) {
  if (field.kind === "badge") return addBadge(slide, field, pptx);
  if (field.kind === "static") return addStatic(slide, field);
  if (field.kind === "qaBlock" && field.group === "languageGame") {
    return addMultipleChoiceBlock(slide, field, lesson);
  }
  if (field.kind === "qaBlock") return addQaBlock(slide, field, lesson);
  if (field.kind === "languageGameSources") return addLanguageGameSources(slide, field, lesson);

  // dynamic
  const value = buildDynamicValue(lesson, field.key);
  if (field.key === "introText") return addIntroText(slide, field, value);
  if (field.list && field.grid) return addVocabGrid(slide, field, value);
  if (field.list) return addBulletList(slide, field, value);
  return addSimpleDynamic(slide, field, value);
}

function buildPptx(lesson) {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: "FISK_16x9", width: SLIDE_W_IN, height: SLIDE_H_IN });
  pptx.layout = "FISK_16x9";
  pptx.author = "FISK — Conversation Maker";
  pptx.title = lesson.coverTitle || "Conversation Maker";

  const videoId = lesson._videoId || null;

  LAYOUTS.forEach((layout) => {
    const slide = pptx.addSlide();
    const bgPath = path.join(__dirname, layout.bg);
    slide.addImage({ path: bgPath, x: 0, y: 0, w: SLIDE_W_IN, h: SLIDE_H_IN });
    layout.fields.forEach((field) => renderField(slide, field, lesson, pptx));

    if (layout.role === "intro" && videoId) {
      const videoSlide = pptx.addSlide();
      videoSlide.background = { color: "000000" };
      videoSlide.addMedia({
        type: "online",
        link: `https://www.youtube.com/embed/${videoId}`,
        x: 0.9,
        y: 0.5,
        w: 11.5,
        h: 6.47,
      });
    }
  });

  return pptx;
}

/**
 * Build a .pptx for a single lesson and return it as a Buffer (Node) ready
 * to be sent as an HTTP response body. slidePlan is no longer needed — the
 * fixed 18-page layout (slide-layouts.js) and the lesson object are enough.
 */
async function buildPptxBuffer(lesson) {
  const pptx = buildPptx(lesson);
  return pptx.write({ outputType: "nodebuffer" });
}

module.exports = { buildPptx, buildPptxBuffer };
