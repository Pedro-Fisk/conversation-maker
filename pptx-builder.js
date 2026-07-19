/*
 * Conversation Maker — .pptx builder.
 *
 * Turns a { lesson, slidePlan } pair (the same shape rendered on-screen by
 * app.js's renderDeck/renderSlideBody) into a real .pptx file, using
 * pptxgenjs. One call = one deck (one level). "Todos os níveis" means the
 * frontend calls this three times, once per level, and downloads three
 * files (never merged), matching the site-wide rule that levels are never
 * combined into a single deck.
 *
 * Visual language: FISK brand tokens (see ../style.css) — red/black/white —
 * applied consistently across every generated topic, rather than trying to
 * replicate the bespoke per-unit photography and color palettes used in the
 * hand-made curriculum decks (those vary unit to unit and rely on curated
 * stock photos we don't have for an arbitrary AI-generated topic). The
 * *structure* (banner bars top/bottom, big title panels, accent color for
 * key vocabulary/scaffolds, fixed section order) mirrors the real decks.
 */

const pptxgen = require("pptxgenjs");

const RED = "D81F26";
const RED_DARK = "A5151A";
const BLACK = "161414";
const WHITE = "FFFFFF";
const GRAY = "6F6A6A";
const GRAY_LIGHT = "ECECEC";

const W = 13.333;
const H = 7.5;
const BAR = 0.28;

function baseSlide(pres, { bg = BLACK, bars = true, barColor = RED } = {}) {
  const slide = pres.addSlide();
  slide.background = { color: bg };
  if (bars) {
    slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: W, h: BAR, fill: { color: barColor }, line: { type: "none" } });
    slide.addShape(pres.ShapeType.rect, { x: 0, y: H - BAR, w: W, h: BAR, fill: { color: barColor }, line: { type: "none" } });
  }
  return slide;
}

function addFooter(slide, label) {
  slide.addText(label.toUpperCase(), {
    x: 0, y: H - 0.55, w: W, h: 0.35,
    align: "center", fontSize: 10, color: GRAY, fontFace: "Arial", charSpacing: 2,
  });
}

function slideCover(pres, content) {
  const c = content || {};
  const slide = baseSlide(pres, { bg: BLACK });
  slide.addShape(pres.ShapeType.ellipse, {
    x: W / 2 - 2.6, y: H / 2 - 2.6, w: 5.2, h: 5.2,
    fill: { color: RED, transparency: 88 }, line: { type: "none" },
  });
  slide.addText(c.title || "", {
    x: 0.8, y: H / 2 - 1.35, w: W - 1.6, h: 1.5,
    align: "center", valign: "bottom", fontSize: 40, bold: true, color: WHITE, fontFace: "Arial",
  });
  slide.addText(c.subtitle || "", {
    x: 0.8, y: H / 2 + 0.2, w: W - 1.6, h: 0.7,
    align: "center", valign: "top", fontSize: 18, color: RED, fontFace: "Arial", bold: true,
  });
  slide.addText("FISK", {
    x: W - 2.2, y: H - 0.9, w: 1.8, h: 0.5,
    align: "right", fontSize: 12, bold: true, color: GRAY, fontFace: "Arial", charSpacing: 3,
  });
  return slide;
}

function slideMaterial(pres, content) {
  const slide = baseSlide(pres);
  slide.addShape(pres.ShapeType.rect, {
    x: W / 2 - 3.5, y: 1.6, w: 7, h: 1.1,
    fill: { color: RED }, line: { type: "none" },
  });
  slide.addText("MATERIAL NEEDED", {
    x: W / 2 - 3.5, y: 1.6, w: 7, h: 1.1,
    align: "center", valign: "middle", fontSize: 26, bold: true, color: WHITE, fontFace: "Arial",
  });
  const minutes = content && content.durationMinutes;
  const activity = (content && content.activity) || "";
  slide.addText(
    [
      { text: activity, options: { color: WHITE, fontSize: 22 } },
      { text: minutes ? `\nDuração: ${minutes} minutos` : "", options: { color: RED, fontSize: 16, bold: true, breakLine: true } },
    ],
    { x: 1, y: 3.1, w: W - 2, h: 1.8, align: "center", fontFace: "Arial" }
  );
  return slide;
}

function slideObjectives(pres, content) {
  const slide = baseSlide(pres);
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: H, fill: { color: RED }, line: { type: "none" } });
  slide.addText("OBJECTIVES", {
    x: 1, y: 0.85, w: W - 2, h: 0.9, fontSize: 30, bold: true, color: RED, fontFace: "Arial",
  });
  const items = (content && content.objectives) || [];
  slide.addText(
    items.map((o) => ({ text: o, options: { bullet: { code: "2022", indent: 20 }, breakLine: true, paraSpaceAfter: 14 } })),
    { x: 1.1, y: 2.0, w: W - 2.4, h: H - 3, fontSize: 20, color: WHITE, fontFace: "Arial", valign: "top" }
  );
  return slide;
}

function slideVocabulary(pres, content) {
  const slide = baseSlide(pres, { bg: WHITE, barColor: RED });
  slide.addText("VOCABULARY", {
    x: 0.8, y: 0.55, w: W - 1.6, h: 0.7, fontSize: 22, bold: true, color: RED, fontFace: "Arial",
  });
  const words = (content && content.words) || [];
  const cols = 2;
  const rows = Math.ceil(words.length / cols);
  const colW = (W - 1.8) / cols;
  const rowH = 0.85;
  const contentTop = 1.65;
  const available = H - BAR - 0.3 - contentTop;
  const totalH = rowH * rows;
  const startY = contentTop + Math.max(0, (available - totalH) / 2);
  words.forEach((w, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.9 + col * colW;
    const y = startY + row * rowH;
    const parts = [{ text: w.word || "", options: { bold: true, italic: true, color: RED } }];
    if (w.translation) parts.push({ text: `  —  ${w.translation}`, options: { color: BLACK } });
    slide.addText(parts, { x, y, w: colW - 0.3, h: rowH - 0.1, fontSize: 16, fontFace: "Arial", valign: "middle" });
  });
  return slide;
}

function slideGrammar(pres, content) {
  const slide = baseSlide(pres);
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0.85, w: W, h: 1.0, fill: { color: RED }, line: { type: "none" },
  });
  slide.addText("GRAMMAR POINT", {
    x: 0, y: 0.85, w: W, h: 1.0, align: "center", valign: "middle", fontSize: 26, bold: true, color: WHITE, fontFace: "Arial",
  });
  const c = content || {};
  const blocks = [];
  if (c.teacherInstruction) blocks.push({ text: c.teacherInstruction, options: { italic: true, color: RED, breakLine: true, paraSpaceAfter: 12 } });
  if (c.explanation) blocks.push({ text: c.explanation, options: { color: WHITE, breakLine: true, paraSpaceAfter: 12 } });
  if (c.example) blocks.push({ text: c.example, options: { color: GRAY_LIGHT, italic: true } });
  slide.addText(blocks, { x: 1.1, y: 2.3, w: W - 2.2, h: H - 3.2, fontSize: 18, fontFace: "Arial", valign: "top" });
  return slide;
}

function slideIntroTitle(pres, content) {
  const slide = baseSlide(pres);
  slide.addText((content && content.title) || "", {
    x: 1, y: H / 2 - 0.9, w: W - 2, h: 1.8,
    align: "center", valign: "middle", fontSize: 34, bold: true, color: WHITE, fontFace: "Arial",
  });
  return slide;
}

function slideIntroText(pres, content) {
  const slide = baseSlide(pres);
  slide.addText((content && content.text) || "", {
    x: 1.3, y: H / 2 - 1.2, w: W - 2.6, h: 2.4,
    align: "center", valign: "middle", fontSize: 20, color: WHITE, fontFace: "Arial",
  });
  return slide;
}

function slideVideo(pres, content) {
  const slide = baseSlide(pres);
  slide.addShape(pres.ShapeType.ellipse, {
    x: W / 2 - 0.55, y: H / 2 - 1.15, w: 1.1, h: 1.1, fill: { color: RED }, line: { type: "none" },
  });
  slide.addText("▶", { x: W / 2 - 0.55, y: H / 2 - 1.15, w: 1.1, h: 1.1, align: "center", valign: "middle", fontSize: 28, color: WHITE, fontFace: "Arial" });
  slide.addText((content && content.title) || "Vídeo", {
    x: 1, y: H / 2 + 0.1, w: W - 2, h: 0.8, align: "center", fontSize: 20, bold: true, color: WHITE, fontFace: "Arial",
  });
  return slide;
}

function slideConversation(pres, content) {
  const slide = baseSlide(pres);
  const c = content || {};
  if (c.subtopic) {
    slide.addShape(pres.ShapeType.roundRect, {
      x: W / 2 - 1.8, y: 0.55, w: 3.6, h: 0.55, rectRadius: 0.27, fill: { color: RED }, line: { type: "none" },
    });
    slide.addText(c.subtopic.toUpperCase(), {
      x: W / 2 - 1.8, y: 0.55, w: 3.6, h: 0.55, align: "center", valign: "middle", fontSize: 13, bold: true, color: WHITE, fontFace: "Arial",
    });
  }
  const questions = c.questions || [];
  const contentTop = c.subtopic ? 1.7 : 1.0;
  const rowH = Math.min(1.4, (H - BAR - 0.3 - contentTop) / Math.max(questions.length, 1));
  const totalH = rowH * questions.length;
  const available = H - BAR - 0.3 - contentTop;
  const startY = contentTop + Math.max(0, (available - totalH) / 2);
  questions.forEach((q, i) => {
    const y = startY + i * rowH;
    const parts = [{ text: `${q.number}. ${q.question}`, options: { color: WHITE, breakLine: !!q.answerScaffold, paraSpaceAfter: 4 } }];
    if (q.answerScaffold) parts.push({ text: q.answerScaffold, options: { color: RED, italic: true, fontSize: 15 } });
    slide.addText(parts, { x: 1, y, w: W - 2, h: rowH, fontSize: 19, fontFace: "Arial", valign: "middle" });
  });
  return slide;
}

function slideLanguageGame(pres, content) {
  const slide = baseSlide(pres, { barColor: RED_DARK });
  const questions = (content && content.questions) || [];
  const rowH = (H - 1.6) / Math.max(questions.length, 1);
  questions.forEach((q, i) => {
    const y = 0.8 + i * rowH;
    const optionsText = (q.options || []).map((o, oi) => `${"abc"[oi]}. ${o}`).join("    ");
    slide.addText(
      [
        { text: q.prompt || "", options: { color: WHITE, bold: true, breakLine: true, paraSpaceAfter: 4 } },
        { text: optionsText, options: { color: RED, fontSize: 15 } },
      ],
      { x: 1, y, w: W - 2, h: rowH, fontSize: 18, fontFace: "Arial", valign: "middle" }
    );
  });
  return slide;
}

function slideEvaluation(pres, content) {
  const slide = baseSlide(pres);
  slide.addText("EVALUATION", {
    x: 1, y: 0.85, w: W - 2, h: 0.9, fontSize: 28, bold: true, color: RED, fontFace: "Arial",
  });
  const questions = (content && content.questions) || [];
  slide.addText(
    questions.map((q) => ({ text: q, options: { bullet: { code: "2022", indent: 20 }, breakLine: true, paraSpaceAfter: 14 } })),
    { x: 1.1, y: 2.0, w: W - 2.4, h: H - 3, fontSize: 19, color: WHITE, fontFace: "Arial", valign: "top" }
  );
  return slide;
}

function slideClosing(pres, content) {
  const slide = baseSlide(pres);
  slide.addShape(pres.ShapeType.ellipse, {
    x: W / 2 - 2.6, y: H / 2 - 2.6, w: 5.2, h: 5.2, fill: { color: RED, transparency: 88 }, line: { type: "none" },
  });
  slide.addText("Thank you!", {
    x: 0.8, y: H / 2 - 1.1, w: W - 1.6, h: 1.1, align: "center", fontSize: 32, bold: true, color: WHITE, fontFace: "Arial",
  });
  slide.addText((content && content.title) || "", {
    x: 0.8, y: H / 2 + 0.15, w: W - 1.6, h: 0.6, align: "center", fontSize: 16, color: RED, fontFace: "Arial",
  });
  return slide;
}

const BUILDERS = {
  Cover: slideCover,
  "Material Needed": slideMaterial,
  Objectives: slideObjectives,
  Vocabulary: slideVocabulary,
  "Grammar Point": slideGrammar,
  "Introduction Title": slideIntroTitle,
  "Introduction Text": slideIntroText,
  Video: slideVideo,
  Conversation: slideConversation,
  "Language Game": slideLanguageGame,
  Evaluation: slideEvaluation,
  Closing: slideClosing,
};

/**
 * Build a .pptx for a single lesson/slidePlan pair and return it as a
 * Buffer (Node) ready to be sent as an HTTP response body.
 */
async function buildPptxBuffer(lesson, slidePlan) {
  const pres = new pptxgen();
  pres.defineLayout({ name: "FISK_16x9", width: W, height: H });
  pres.layout = "FISK_16x9";
  pres.author = "FISK — Conversation Maker";
  pres.title = lesson.coverTitle || "Conversation Maker";

  slidePlan.forEach((slide) => {
    const builder = BUILDERS[slide.layout];
    if (!builder) return;
    builder(pres, slide.content);
  });

  const buffer = await pres.write({ outputType: "nodebuffer" });
  return buffer;
}

module.exports = { buildPptxBuffer };
