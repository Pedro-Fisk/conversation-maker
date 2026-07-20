/*
 * slide-layouts.js
 *
 * Exact layout map for the 18-page "Conversation Maker" Canva Brand
 * Template (design DAHPwZYsMkA / brand template EAHP3MbB56Y). Positions
 * were captured directly from the template's own elements (in Canva's
 * native 1920x1080 page coordinate space) via the Canva MCP editing
 * transaction, so a text box placed at these coordinates lines up exactly
 * where the real Canva text elements used to be.
 *
 * Backgrounds live in assets/bg/ — these are real PNG exports of the
 * template with all text removed (provided by Pedro directly from Canva,
 * not a lossy screenshot), at 2880x1620 (1.5x the 1920x1080 base), so they
 * stay crisp when rendered at native size or larger.
 *
 * Every text field below was stripped from the background, including the
 * decorative brush-marker section titles (OBJETIVO, VOCABULARY, etc.) and
 * the small red "CONVERSATION" cover badge — those are re-drawn here too,
 * not just the AI-generated dynamic content.
 *
 * Coordinates are expressed as % of the 1920x1080 canvas (top/left/width/
 * height), so the same layout map drives both the HTML/CSS renderer (any
 * pixel size, aspect ratio locked at 16:9) and the pptx builder (scaled to
 * inches at render time).
 *
 * FISK brand tokens (shared with style.css):
 *   red        #D81F26
 *   red-dark   #A5151A
 *   black      #161414
 *   gray       #6F6A6A
 *
 * Fonts: brush-marker headings approximate Canva's handwritten font with
 * "Permanent Marker" (Google Fonts). Body copy uses "Poppins" to match the
 * clean sans-serif used for the real content in the template.
 */

const CANVAS_W = 1920;
const CANVAS_H = 1080;

function pct(px, base) {
  return +((px / base) * 100).toFixed(4);
}

function box(top, left, width, height) {
  return {
    top: pct(top, CANVAS_H),
    left: pct(left, CANVAS_W),
    width: pct(width, CANVAS_W),
    height: pct(height, CANVAS_H),
  };
}

const FONT_MARKER = "'Permanent Marker', cursive";
const FONT_BODY = "'Poppins', sans-serif";

const RED = "#D81F26";
const BLACK = "#161414";
const GRAY = "#6F6A6A";

/*
 * field.kind:
 *   "static"   — fixed label, same on every generated deck (value given here)
 *   "dynamic"  — filled from the generated lesson content at render time
 *   "badge"    — static label drawn with a solid pill/background behind it
 */

const LAYOUTS = [
  {
    page: 1,
    role: "cover",
    bg: "assets/bg/01-cover.png",
    fields: [
      {
        kind: "badge",
        ...box(185.4, 206.8, 642.3, 56),
        value: "CONVERSATION",
        font: FONT_BODY,
        fontSize: 26,
        fontWeight: 700,
        color: "#FFFFFF",
        background: RED,
        align: "center",
        letterSpacing: 1,
      },
      {
        kind: "dynamic",
        key: "coverTitle",
        ...box(285.7, 85.4, 858.7, 232.8),
        font: FONT_BODY,
        fontSize: 108,
        fontWeight: 800,
        color: BLACK,
        align: "left",
        lineHeight: 1.05,
      },
      {
        kind: "dynamic",
        key: "coverLevel",
        ...box(575.5, 98.6, 858.7, 80),
        font: FONT_BODY,
        fontSize: 50,
        fontWeight: 600,
        color: GRAY,
        align: "left",
      },
    ],
  },
  {
    page: 2,
    role: "agenda",
    bg: "assets/bg/02-agenda.png",
    fields: [
      {
        kind: "static",
        ...box(454.0, 185.6, 470.9, 142),
        value: "Vocabulary & Introduction",
        font: FONT_BODY,
        fontSize: 42,
        fontWeight: 600,
        color: BLACK,
        align: "center",
        lineHeight: 1.2,
      },
      {
        kind: "dynamic",
        key: "agendaTopicLine",
        ...box(454.0, 726.8, 565.2, 213.5),
        font: FONT_BODY,
        fontSize: 42,
        fontWeight: 600,
        color: BLACK,
        align: "center",
        lineHeight: 1.2,
      },
      {
        kind: "static",
        ...box(454.0, 1318.6, 447.2, 142.4),
        value: "Game & Evaluation",
        font: FONT_BODY,
        fontSize: 42,
        fontWeight: 600,
        color: BLACK,
        align: "center",
        lineHeight: 1.2,
      },
      {
        kind: "static",
        ...box(746.5, 154, 1526, 210),
        value: "STRUCTURE OF THE ACTIVITY",
        font: FONT_MARKER,
        fontSize: 74,
        fontWeight: 400,
        color: BLACK,
        align: "center",
      },
    ],
  },
  {
    page: 3,
    role: "divider",
    bg: "assets/bg/03-divider-objetivo.png",
    fields: [
      {
        kind: "static",
        ...box(341, 167, 1526, 299),
        value: "OBJETIVO",
        font: FONT_MARKER,
        fontSize: 94,
        fontWeight: 400,
        color: BLACK,
        align: "center",
      },
    ],
  },
  {
    page: 4,
    role: "objectives",
    bg: "assets/bg/04-objectives.png",
    fields: [
      {
        kind: "static",
        ...box(87.8, 273.6, 1568.4, 100),
        value: "OBJETIVO DA ATIVIDADE",
        font: FONT_BODY,
        fontSize: 52,
        fontWeight: 700,
        color: BLACK,
        align: "left",
      },
      {
        kind: "dynamic",
        key: "objectives",
        list: true,
        ...box(283.6, 141.8, 1207.7, 591.5),
        font: FONT_BODY,
        fontSize: 64,
        fontWeight: 600,
        color: BLACK,
        align: "left",
        lineHeight: 1.3,
        itemSpacing: "0.35em",
        bullet: "•",
      },
    ],
  },
  {
    page: 5,
    role: "divider",
    bg: "assets/bg/05-divider-vocabulary.png",
    fields: [
      {
        kind: "static",
        ...box(357.8, 68.1, 1724.7, 272.7),
        value: "VOCABULARY",
        font: FONT_MARKER,
        fontSize: 90,
        fontWeight: 400,
        color: BLACK,
        align: "center",
      },
    ],
  },
  {
    page: 6,
    role: "vocabulary",
    bg: "assets/bg/06-vocabulary.png",
    fields: [
      {
        kind: "dynamic",
        key: "vocabulary",
        list: true,
        grid: true,
        ...box(118.2, 108, 1704, 793.5),
        font: FONT_BODY,
        fontSize: 80,
        fontWeight: 600,
        color: BLACK,
        align: "left",
        lineHeight: 1.5,
      },
    ],
  },
  {
    page: 7,
    role: "divider",
    bg: "assets/bg/07-divider-introducao.png",
    fields: [
      {
        kind: "dynamic",
        key: "introTitle",
        ...box(341, 167, 1526, 299),
        font: FONT_MARKER,
        fontSize: 86,
        fontWeight: 400,
        color: BLACK,
        align: "center",
      },
    ],
  },
  {
    page: 8,
    role: "intro",
    bg: "assets/bg/08-intro.png",
    fields: [
      {
        kind: "dynamic",
        key: "introText",
        ...box(108, 108, 1144.2, 793.5),
        font: FONT_BODY,
        fontSize: 62,
        fontWeight: 400,
        color: BLACK,
        align: "left",
        lineHeight: 1.5,
      },
    ],
  },
  {
    page: 9,
    role: "divider",
    bg: "assets/bg/09-divider-conversation.png",
    fields: [
      {
        kind: "static",
        ...box(595, 170.6, 1526, 299),
        value: "CONVERSATION",
        font: FONT_MARKER,
        fontSize: 88,
        fontWeight: 400,
        color: BLACK,
        align: "center",
      },
    ],
  },
  {
    page: 10,
    role: "conversation",
    bg: "assets/bg/10-conversation-q1-3.png",
    fields: [qaBlockField("conversation", 0, 3)],
  },
  {
    page: 11,
    role: "conversation",
    bg: "assets/bg/11-conversation-q4-6.png",
    fields: [qaBlockField("conversation", 3, 3)],
  },
  {
    page: 12,
    role: "conversation",
    bg: "assets/bg/12-conversation-q7-9.png",
    fields: [qaBlockField("conversation", 6, 3)],
  },
  {
    page: 13,
    role: "divider",
    bg: "assets/bg/13-divider-language-game.png",
    fields: [
      {
        kind: "static",
        ...box(595, 170.6, 1526, 299),
        value: "LANGUAGE GAME",
        font: FONT_MARKER,
        fontSize: 74,
        fontWeight: 400,
        color: BLACK,
        align: "center",
      },
    ],
  },
  {
    page: 14,
    role: "languageGame",
    bg: "assets/bg/14-language-game-q1-3.png",
    fields: [qaBlockField("languageGame", 0, 3)],
  },
  {
    page: 15,
    role: "languageGame",
    bg: "assets/bg/15-language-game-q4-6.png",
    fields: [qaBlockField("languageGame", 3, 3)],
  },
  {
    page: 16,
    role: "divider",
    bg: "assets/bg/16-divider-evaluation.png",
    fields: [
      {
        kind: "static",
        ...box(595, 170.6, 1526, 299),
        value: "EVALUATION",
        font: FONT_MARKER,
        fontSize: 88,
        fontWeight: 400,
        color: BLACK,
        align: "center",
      },
    ],
  },
  {
    page: 17,
    role: "evaluation",
    bg: "assets/bg/17-evaluation-q1-2.png",
    fields: [
      {
        kind: "qaBlock",
        group: "evaluation",
        startIndex: 0,
        count: 2,
        ...box(108, 138.6, 1745.9, 692.7),
        questionFont: FONT_BODY,
        questionFontSize: 62,
        questionWeight: 700,
        answerFont: FONT_BODY,
        answerFontSize: 46,
        answerWeight: 400,
        color: BLACK,
        answerColor: GRAY,
        align: "left",
        lineHeight: 1.35,
        blockSpacing: "1.5em",
      },
    ],
  },
  {
    page: 18,
    role: "closing",
    bg: "assets/bg/18-closing.png",
    fields: [
      {
        kind: "static",
        ...box(292.1, 205.1, 1606.9, 268.6),
        value: "See you next class!",
        font: FONT_BODY,
        fontSize: 84,
        fontWeight: 700,
        color: BLACK,
        align: "center",
        lineHeight: 1.3,
      },
    ],
  },
];

// Shared box for the two-slide Q&A layouts (conversation + language game),
// which all reuse the same text frame position in the template.
function qaBlockField(group, startIndex, count) {
  return {
    kind: "qaBlock",
    group,
    startIndex,
    count,
    ...box(64.8, 95.4, 1423.9, 894.5),
    questionFont: FONT_BODY,
    questionFontSize: 60,
    questionWeight: 700,
    answerFont: FONT_BODY,
    answerFontSize: 46,
    answerWeight: 400,
    color: BLACK,
    answerColor: GRAY,
    align: "left",
    lineHeight: 1.35,
    blockSpacing: "1.5em",
  };
}

module.exports = { LAYOUTS, CANVAS_W, CANVAS_H, FONT_MARKER, FONT_BODY, RED, BLACK, GRAY };
