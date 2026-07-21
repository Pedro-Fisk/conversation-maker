/*
 * slide-layouts.js
 *
 * Exact layout map for the "Conversation Maker" Canva Brand Template
 * (design DAHPwZYsMkA / brand template EAHP3MbB56Y) — 20 pages, after the
 * language game grew from 2 to 4 pages (unrevealed/revealed pairs; see the
 * comment above those entries below). Positions
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
 * Fonts: section headings use "Aptos" bold (ships with modern Microsoft
 * Office, so the .pptx renders correctly on teachers' machines), falling
 * back to "Poppins" ExtraBold in the HTML/PDF renderer (visually very
 * close). Body copy uses "Poppins" to match the clean sans-serif used for
 * the real content in the template. ("Permanent Marker" was dropped: most
 * machines don't have it and PowerPoint silently fell back to Calibri.)
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

const FONT_MARKER = "'Aptos', 'Poppins', sans-serif";
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
        fontSize: 90,
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
        fontSize: 96,
        fontWeight: 800,
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
        kind: "dynamic",
        key: "objectivesDividerTitle",
        ...box(341, 167, 1526, 299),
        font: FONT_MARKER,
        fontSize: 150,
        fontWeight: 800,
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
        kind: "dynamic",
        key: "objectivesTitle",
        ...box(87.8, 273.6, 1568.4, 100),
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
        fontSize: 150,
        fontWeight: 800,
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
        fontSize: 140,
        fontWeight: 800,
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
        fontSize: 46,
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
        fontSize: 150,
        fontWeight: 800,
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
        fontSize: 130,
        fontWeight: 800,
        color: BLACK,
        align: "center",
      },
    ],
  },
  // Language game agora são 4 páginas em vez de 2: cada grupo de 3
  // perguntas aparece primeiro SEM a resposta marcada (o professor projeta
  // e a turma discute/decide) e depois um slide idêntico (mesmo fundo) só
  // que COM a bolinha verde na opção certa — passar de slide já funciona
  // como a "revelação" da resposta, sem precisar de animação de verdade
  // (que não funcionou de forma confiável no PowerPoint). Pedro pediu essa
  // troca depois de testar a versão animada.
  {
    page: 14,
    role: "languageGame",
    bg: "assets/bg/14-language-game-q1-3.png",
    fields: [qaBlockField("languageGame", 0, 3, false), languageGameSourceField(0, 3)],
  },
  {
    page: 15,
    role: "languageGame",
    bg: "assets/bg/14-language-game-q1-3.png",
    fields: [qaBlockField("languageGame", 0, 3, true), languageGameSourceField(0, 3)],
  },
  {
    page: 16,
    role: "languageGame",
    bg: "assets/bg/15-language-game-q4-6.png",
    fields: [qaBlockField("languageGame", 3, 3, false), languageGameSourceField(3, 3)],
  },
  {
    page: 17,
    role: "languageGame",
    bg: "assets/bg/15-language-game-q4-6.png",
    fields: [qaBlockField("languageGame", 3, 3, true), languageGameSourceField(3, 3)],
  },
  {
    page: 18,
    role: "divider",
    bg: "assets/bg/16-divider-evaluation.png",
    fields: [
      {
        kind: "static",
        ...box(595, 170.6, 1526, 299),
        value: "EVALUATION",
        font: FONT_MARKER,
        fontSize: 150,
        fontWeight: 800,
        color: BLACK,
        align: "center",
      },
    ],
  },
  {
    page: 19,
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
    page: 20,
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
// which all reuse the same text frame position in the template. Language
// game blocks pack a lot more text per question now (question + 3 full
// options, vs. conversation's question + 0-2 short answers), so they use
// smaller type and tighter spacing to fit the same 3-per-slide box without
// overflowing.
function qaBlockField(group, startIndex, count, revealAnswer) {
  const isLanguageGame = group === "languageGame";
  return {
    kind: "qaBlock",
    group,
    startIndex,
    count,
    // Só importa para languageGame: controla se a opção certa aparece
    // marcada (bolinha verde) ou se todas as opções ficam neutras — o par
    // de slides "sem resposta" / "com resposta" reusa o mesmo fundo.
    revealAnswer,
    ...box(64.8, 95.4, 1423.9, 894.5),
    questionFont: FONT_BODY,
    questionFontSize: isLanguageGame ? 46 : 60,
    questionWeight: 700,
    answerFont: FONT_BODY,
    answerFontSize: isLanguageGame ? 36 : 46,
    answerWeight: 400,
    color: BLACK,
    answerColor: GRAY,
    align: "left",
    lineHeight: isLanguageGame ? 1.2 : 1.35,
    blockSpacing: isLanguageGame ? "0.6em" : "1.5em",
  };
}

// Rodapé com a fonte (livro + lição) de cada pergunta do Language Game —
// só existe conteúdo aqui quando o professor gerou a aula com estágios do
// curso marcados (ou o mapeamento padrão por nível), ver content-catalog.js
// e api/generate-lesson.js. Fica dentro da faixa vermelha na parte de baixo
// do slide, à esquerda do selo "FISK" (que ocupa o canto inferior direito),
// em branco para contrastar com o fundo vermelho.
function languageGameSourceField(startIndex, count) {
  return {
    kind: "languageGameSources",
    group: "languageGame",
    startIndex,
    count,
    ...box(1008, 95.4, 1450, 46),
    font: FONT_BODY,
    fontSize: 26,
    fontWeight: 500,
    color: "#FFFFFF",
    align: "left",
    lineHeight: 1.2,
  };
}

module.exports = { LAYOUTS, CANVAS_W, CANVAS_H, FONT_MARKER, FONT_BODY, RED, BLACK, GRAY };
