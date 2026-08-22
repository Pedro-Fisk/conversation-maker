/*
 * pptx-builder.js
 *
 * Builds a real .pptx using the same real Canva template background PNGs
 * (assets/bg/*.png) and the same exact coordinate map (slide-layouts.js)
 * that drives the local HTML preview (render-slides-html.js) — so the two
 * outputs stay visually consistent and both stay faithful to the original
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
const {
  getQaItems,
  buildDynamicValue,
  textoEstatico,
  emojiDaSecao,
  fonteDoCampo,
  fonteDaLista,
  fonteDoBlocoQa,
  fonteDoVocabulario,
  colunasDoVocabulario,
  VOCAB_GAP,
} = require("./lesson-data");

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

// Caixa do campo em px do canvas 1920x1080 (a unidade em que lesson-data.js
// calcula quantas linhas o texto ocupa).
const caixaEmPx = (field) => ({
  largura: (field.width / 100) * 1920,
  altura: (field.height / 100) * 1080,
});

function addStatic(slide, field, lesson) {
  // Texto no idioma da aula, com o emoji da seção na frente quando esta caixa
  // é um título de seção (ver lesson-data.js).
  const prefixo = field.emojiKey ? emojiDaSecao(lesson, field.emojiKey) : "";
  const texto = prefixo + textoEstatico(field, lesson);
  const caixa = caixaEmPx(field);
  slide.addText(texto, {
    x: xIn(field.left),
    y: yIn(field.top),
    w: wIn(field.width),
    h: hIn(field.height),
    fontFace: faceFor(field.font),
    fontSize: pt(fonteDoCampo(field, texto, caixa.largura, caixa.altura)),
    bold: field.fontWeight >= 600,
    color: hex(field.color),
    align: field.align || "left",
    valign: "middle",
    lineSpacingMultiple: field.lineHeight || 1.3,
    wrap: true,
  });
}

function addBadge(slide, field, pptx, lesson) {
  slide.addText(textoEstatico(field, lesson), {
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
  const caixa = caixaEmPx(field);
  slide.addText(String(value || ""), {
    x: xIn(field.left),
    y: yIn(field.top),
    w: wIn(field.width),
    h: hIn(field.height),
    fontFace: faceFor(field.font),
    fontSize: pt(fonteDoCampo(field, String(value || ""), caixa.largura, caixa.altura)),
    bold: field.fontWeight >= 600,
    color: hex(field.color),
    align: field.align || "left",
    valign: "middle",
    lineSpacingMultiple: field.lineHeight || 1.3,
    wrap: true,
  });
}

function addBulletList(slide, field, items) {
  const caixa = caixaEmPx(field);
  const tamanho = fonteDaLista(field, items, caixa.largura, caixa.altura);
  const runs = (items || []).map((text, i) => ({
    text,
    options: {
      bullet: { code: "2022" },
      breakLine: i < items.length - 1,
      fontFace: faceFor(field.font),
      fontSize: pt(tamanho),
      bold: field.fontWeight >= 600,
      color: hex(field.color),
      paraSpaceAfter: pt(tamanho) * 0.5,
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

// Vocabulário: duas colunas preenchidas por linha (item 0 à esquerda, item 1
// à direita, item 2 à esquerda...), e cada item ocupa DUAS linhas — palavra em
// cima, tradução embaixo em cinza. Antes as duas vinham na mesma linha e um
// par comprido estourava a coluna para fora do slide.
function addVocabGrid(slide, field, items) {
  const caixa = caixaEmPx(field);
  const tamanho = fonteDoVocabulario(field, items, caixa.largura, caixa.altura);
  const tamanhoTraducao = tamanho * (field.translationScale || 0.62);
  const colGapIn = wIn(field.width) * VOCAB_GAP;
  const colWIn = (wIn(field.width) - colGapIn) / 2;
  const [left, right] = colunasDoVocabulario(items);

  const toRuns = (col) => {
    const runs = [];
    col.forEach((it, i) => {
      const ultimo = i === col.length - 1;
      runs.push({
        text: it.word || "",
        options: {
          breakLine: true,
          fontFace: faceFor(field.font),
          fontSize: pt(tamanho),
          bold: field.fontWeight >= 600,
          color: hex(field.color),
        },
      });
      if (it.translation) {
        runs.push({
          text: it.translation,
          options: {
            breakLine: !ultimo,
            fontFace: faceFor(field.font),
            fontSize: pt(tamanhoTraducao),
            bold: false,
            color: hex(field.translationColor || "#6F6A6A"),
            paraSpaceAfter: ultimo ? 0 : pt(tamanho) * (field.itemSpacing || 0.42),
          },
        });
      }
    });
    return runs;
  };

  const baseOpts = {
    y: yIn(field.top),
    w: colWIn,
    h: hIn(field.height),
    valign: "top",
    align: "left",
    lineSpacingMultiple: field.lineHeight || 1.15,
    wrap: true,
  };
  slide.addText(toRuns(left), { ...baseOpts, x: xIn(field.left) });
  slide.addText(toRuns(right), { ...baseOpts, x: xIn(field.left) + colWIn + colGapIn });
}

function addIntroText(slide, field, value) {
  const caixa = caixaEmPx(field);
  const tamanho = fonteDoCampo(field, value, caixa.largura, caixa.altura);
  const paragraphs = String(value || "").split(/\n{2,}/);
  const runs = paragraphs.map((p, i) => ({
    text: p,
    options: {
      breakLine: true,
      fontFace: faceFor(field.font),
      fontSize: pt(tamanho),
      bold: field.fontWeight >= 600,
      color: hex(field.color),
      paraSpaceAfter: i < paragraphs.length - 1 ? pt(tamanho) * 0.6 : 0,
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
  const caixa = caixaEmPx(field);
  // Pergunta comprida saía por fora da caixa; agora o bloco inteiro é medido
  // antes e a fonte cai só o necessário (as respostas acompanham a proporção).
  const tamanhoQ = fonteDoBlocoQa(field, items, caixa.largura, caixa.altura);
  const tamanhoA = tamanhoQ * (field.answerFontSize / field.questionFontSize);
  const runs = [];
  items.forEach((item, i) => {
    const respostas = item.modelAnswers || [];
    runs.push({
      text: `${field.startIndex + i + 1}. ${item.question}`,
      options: {
        breakLine: true,
        bold: field.questionWeight >= 600,
        fontFace: faceFor(field.questionFont),
        fontSize: pt(tamanhoQ),
        color: hex(field.color),
        // pergunta sem resposta-modelo (comum do Intermediário para cima)
        // precisa do respiro aqui, senão gruda na pergunta seguinte
        paraSpaceAfter: respostas.length ? 0 : pt(tamanhoQ) * 0.8,
      },
    });
    respostas.forEach((ans, j) => {
      const isLast = j === respostas.length - 1;
      runs.push({
        text: ans,
        options: {
          breakLine: true,
          italic: true,
          fontFace: faceFor(field.answerFont),
          fontSize: pt(tamanhoA),
          color: hex(field.answerColor),
          paraSpaceAfter: isLast ? pt(tamanhoQ) * 0.8 : 0,
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
  const caixa = caixaEmPx(field);
  const tamanhoQ = fonteDoBlocoQa(field, items, caixa.largura, caixa.altura);
  const tamanhoA = tamanhoQ * (field.answerFontSize / field.questionFontSize);
  const runs = [];
  items.forEach((item, i) => {
    runs.push({
      text: `${field.startIndex + i + 1}. ${item.question}`,
      options: {
        breakLine: true,
        bold: field.questionWeight >= 600,
        fontFace: faceFor(field.questionFont),
        fontSize: pt(tamanhoQ),
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
          fontSize: pt(tamanhoA),
          color: isCorrect ? CORRECT_OPTION_COLOR : hex(field.answerColor),
          paraSpaceAfter: isLast ? pt(tamanhoQ) * 0.8 : 0,
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
  if (field.kind === "badge") return addBadge(slide, field, pptx, lesson);
  if (field.kind === "static") return addStatic(slide, field, lesson);
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

// Tenta buscar a thumbnail do YouTube como base64 (maxres → hq como fallback).
// Retorna null se falhar — o slide de vídeo ainda é criado, só sem imagem.
async function fetchYoutubeThumbnail(videoId) {
  const candidates = [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      return "image/jpeg;base64," + buf.toString("base64");
    } catch (_) {}
  }
  return null;
}

/**
 * Slide do vídeo: thumbnail ocupando o slide + faixa escura na base com o link.
 *
 * O rótulo sai no idioma DA AULA — um slide em inglês com "Assistir no YouTube"
 * quebra a imersão que a atividade inteira tenta manter.
 *
 * A THUMBNAIL também recebe o hyperlink, não só o texto: no PowerPoint, um link
 * de texto em modo de edição só abre com Ctrl+clique, e o professor clica na
 * imagem. Com o link na imagem, o clique funciona na apresentação e a área
 * clicável passa a ser o slide todo, não uma linha de texto.
 */
function addVideoSlide(pptx, videoId, thumbnailData, language) {
  const slide = pptx.addSlide();
  slide.background = { color: "000000" };

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const espanhol = language === "spanish";
  const rotulo = espanhol ? "▶  Ver en YouTube" : "▶  Watch on YouTube";
  const dica = espanhol ? "Abrir el video en YouTube" : "Open the video on YouTube";

  if (thumbnailData) {
    slide.addImage({
      data: thumbnailData, x: 0, y: 0, w: SLIDE_W_IN, h: SLIDE_H_IN,
      hyperlink: { url, tooltip: dica },
    });
  }

  // Barra escura na base para o texto do link ser legível sobre qualquer thumbnail
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: SLIDE_H_IN - 1.6,
    w: SLIDE_W_IN,
    h: 1.6,
    fill: { color: "000000", transparency: 20 },
    line: { type: "none" },
  });

  slide.addText(
    [{ text: rotulo, options: { hyperlink: { url, tooltip: dica } } }],
    {
      x: 1,
      y: SLIDE_H_IN - 1.5,
      w: 11.333,
      h: 1.4,
      align: "center",
      valign: "middle",
      fontFace: "Poppins",
      fontSize: 32,
      bold: true,
      color: "FFFFFF",
    }
  );
}

function addExtraActivitySlide(pptx, lesson) {
  const slide = pptx.addSlide();
  const bgPath = path.join(__dirname, "assets/bg/08-intro.png");
  slide.addImage({ path: bgPath, x: 0, y: 0, w: SLIDE_W_IN, h: SLIDE_H_IN });

  slide.addText(lesson.extraActivityTitle || "", {
    x: xIn(5),
    y: yIn(8),
    w: xIn(90),
    h: yIn(18),
    align: "center",
    valign: "middle",
    fontFace: "Poppins",
    fontSize: 48,
    bold: true,
    color: "D81F26",
    wrap: true,
  });

  slide.addText(lesson.extraActivityInstructions || "", {
    x: xIn(8),
    y: yIn(28),
    w: xIn(84),
    h: yIn(55),
    align: "center",
    valign: "top",
    fontFace: "Poppins",
    fontSize: 28,
    bold: false,
    color: "161414",
    lineSpacingMultiple: 1.4,
    wrap: true,
  });
}

function buildPptx(lesson, thumbnailData) {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: "FISK_16x9", width: SLIDE_W_IN, height: SLIDE_H_IN });
  pptx.layout = "FISK_16x9";
  pptx.author = "FISK, Conversation Maker";
  pptx.title = lesson.coverTitle || "Conversation Maker";

  const videoId = lesson._videoId || null;

  LAYOUTS.forEach((layout) => {
    const slide = pptx.addSlide();
    const bgPath = path.join(__dirname, layout.bg);
    slide.addImage({ path: bgPath, x: 0, y: 0, w: SLIDE_W_IN, h: SLIDE_H_IN });
    layout.fields.forEach((field) => renderField(slide, field, lesson, pptx));

    if (layout.role === "intro" && videoId) {
      addVideoSlide(pptx, videoId, thumbnailData || null, lesson.language);
    }
    if (layout.role === "intro" && lesson.extraActivityTitle) {
      addExtraActivitySlide(pptx, lesson);
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
  const videoId = lesson._videoId || null;
  const thumbnailData = videoId ? await fetchYoutubeThumbnail(videoId) : null;
  const pptx = buildPptx(lesson, thumbnailData);
  return pptx.write({ outputType: "nodebuffer" });
}

module.exports = { buildPptx, buildPptxBuffer };
