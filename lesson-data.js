/*
 * lesson-data.js
 *
 * Small shared helpers for pulling values out of the canonical `lesson`
 * object (see the contract documented at the top of render-slides-html.js).
 * Used by both the local HTML preview renderer and the PPTX builder so
 * the two outputs never drift out of sync on how a field key maps to
 * lesson data.
 *
 * Três responsabilidades vivem aqui, e todas pelo mesmo motivo: se ficassem
 * em cada renderizador, o .pptx e a prévia sairiam diferentes.
 *   1. valor de cada campo (buildDynamicValue / textoEstatico)
 *   2. IDIOMA dos textos fixos do template (ver abaixo)
 *   3. tamanho de fonte que CABE na caixa (maiorFonteQueCabe)
 */

/* ─────────────────────────────────────────────────────────────────────
   IDIOMA DOS TEXTOS FIXOS  (21/08/2026)

   O template tem textos que não vêm da IA: o selo CONVERSATION da capa, os
   divisores de seção, a agenda, o "See you next class!". Eles nasceram
   escritos em inglês direto no slide-layouts.js, então uma aula de ESPANHOL
   saía com esses pedaços em inglês e o professor corrigia na mão toda vez.

   A tradução mora junto da posição (campo `valueEs` no slide-layouts.js) em
   vez de num dicionário à parte de propósito: quem cria um texto fixo novo
   vê o par ali na mesma linha e não tem como esquecer metade.
   ──────────────────────────────────────────────────────────────────── */

function ehEspanhol(lesson) {
  return Boolean(lesson && lesson.language === "spanish");
}

/** Texto de um campo `static`/`badge`, no idioma da aula. */
function textoEstatico(field, lesson) {
  if (ehEspanhol(lesson) && field.valueEs) return field.valueEs;
  return field.value;
}

// O rótulo do nível é interno da escola e viaja em português (é ele que
// nomeia o arquivo e as linhas de log, então NÃO muda no objeto `lesson`).
// Só a CAPA, que o aluno vê, sai no idioma da aula.
const NIVEL_EM_ESPANHOL = {
  "Básico": "Básico",
  "Intermediário": "Intermedio",
  "Avançado": "Avanzado",
};

/* ─────────────────────────────────────────────────────────────────────
   EMOJI DO TEMA  (21/08/2026)

   A IA devolve `coverEmoji` (um emoji do tema da aula) e `sectionEmojis`
   (um por seção). Ficam em campos PRÓPRIOS, e não embutidos no título,
   porque assim nós decidimos onde eles aparecem — e, principalmente, o
   nome do arquivo baixado continua limpo (ele é montado a partir de
   lesson.coverTitle).
   ──────────────────────────────────────────────────────────────────── */

/** Prefixo "🗾 " para o título de uma seção, ou "" se a aula não tem emoji. */
function emojiDaSecao(lesson, chave) {
  if (!lesson) return "";
  const mapa = lesson.sectionEmojis || {};
  const emoji = mapa[chave] || lesson.coverEmoji || "";
  return emoji ? emoji + " " : "";
}

function getQaItems(lesson, group, startIndex, count) {
  const source = lesson[group] || [];
  return source.slice(startIndex, startIndex + count);
}

function buildDynamicValue(lesson, key) {
  const es = ehEspanhol(lesson);
  switch (key) {
    case "coverTitle":
      return (lesson.coverEmoji ? lesson.coverEmoji + " " : "") + (lesson.coverTitle || "");
    case "coverLevel": {
      const rotulo = lesson.coverLevel || "";
      return es ? (NIVEL_EM_ESPANHOL[rotulo] || rotulo) : rotulo;
    }
    case "agendaTopicLine": {
      const tema = lesson.topic || lesson.coverTitle || "";
      return es ? `Conversación sobre ${tema}` : `Conversation about ${tema}`;
    }
    case "introTitle":
      return emojiDaSecao(lesson, "intro") + (es ? "INTRODUCCIÓN" : "INTRODUCTION");
    case "objectivesDividerTitle":
      return emojiDaSecao(lesson, "objectives") + (es ? "OBJETIVOS" : "GOALS");
    case "objectivesTitle":
      return es ? "OBJETIVOS DE LA ACTIVIDAD" : "GOALS OF THE ACTIVITY";
    case "objectives":
      return lesson.objectives || [];
    case "vocabulary":
      return lesson.vocabulary || [];
    case "introText":
      return lesson.introText || "";
    default:
      return "";
  }
}

/* ─────────────────────────────────────────────────────────────────────
   AJUSTE DE FONTE  (21/08/2026)

   O template tem caixa de tamanho FIXO e conteúdo de tamanho VARIÁVEL —
   receita pronta para estouro. Medido na prévia antes desta mudança: o
   slide de vocabulário pedia 977px numa caixa de 793px (184px para fora),
   e isso com palavras curtas. Com "cherry blossom – flor de cerejeira" a
   linha quebrava e a coluna transbordava para fora do slide.

   A saída NÃO é diminuir a fonte no template (aí todo slide fica pequeno,
   inclusive os que cabiam): é escolher, a cada aula, a maior fonte em que
   aquele texto cabe naquela caixa. Texto curto continua grande; texto
   longo encolhe só o necessário.

   Por que a conta é estimada e não medida: quem monta o .pptx é o Node,
   sem navegador para medir texto, e o PowerPoint só recalcula "encolher
   ao transbordar" quando o usuário edita a caixa — ou seja, na primeira
   abertura o texto sairia estourado do mesmo jeito. Então estimamos, com
   a largura média de caractere medida na PRÓPRIA Poppins (0,50 a 0,53 do
   tamanho da fonte, conforme peso e idioma; o espanhol é o mais largo).
   RAZAO_CHAR usa 0,55 de propósito: erra para o lado de encolher, que é
   o erro que não estraga slide.
   ──────────────────────────────────────────────────────────────────── */

const RAZAO_CHAR = 0.55;

/** Quantas linhas `texto` ocupa numa caixa de `largura` px nesse tamanho. */
function linhasDeTexto(texto, largura, tamanho) {
  const limite = Math.max(4, Math.floor(largura / (tamanho * RAZAO_CHAR)));
  const palavras = String(texto || "").split(/\s+/).filter(Boolean);
  if (!palavras.length) return 0;
  let linhas = 1;
  let atual = 0;
  palavras.forEach((palavra) => {
    const custo = palavra.length + (atual ? 1 : 0);
    if (atual && atual + custo > limite) {
      linhas++;
      atual = palavra.length;
    } else {
      atual += custo;
    }
  });
  return linhas;
}

/** Altura em px que `texto` ocupa numa caixa de `largura`, nesse tamanho. */
function alturaDeTexto(texto, largura, tamanho, entreLinhas) {
  return linhasDeTexto(texto, largura, tamanho) * tamanho * (entreLinhas || 1.3);
}

/**
 * Maior tamanho (px do canvas 1920x1080) em que o conteúdo cabe na altura
 * disponível. `alturaPara(tamanho)` é fornecida por quem chama, porque cada
 * slide empilha as coisas de um jeito (parágrafo, lista, pergunta+respostas).
 */
function maiorFonteQueCabe(alturaPara, { max, min, altura }) {
  const teto = Math.max(max, min);
  for (let t = teto; t > min; t -= 1) {
    if (alturaPara(t) <= altura) return t;
  }
  return min;
}

/**
 * Tamanho de fonte de um campo simples (um texto só na caixa). Respeita
 * `field.fit = { max, min }`; sem isso, devolve o tamanho fixo do template
 * (comportamento antigo, para os campos que nunca deram problema).
 */
function fonteDoCampo(field, texto, larguraPx, alturaPx) {
  if (!field.fit) return field.fontSize;
  const entreLinhas = field.lineHeight || 1.3;
  return maiorFonteQueCabe(
    (t) => alturaDeTexto(texto, larguraPx, t, entreLinhas),
    { max: field.fit.max || field.fontSize, min: field.fit.min || 20, altura: alturaPx }
  );
}

/**
 * Tamanho de fonte de uma lista com marcador (os objetivos). Cada item começa
 * numa linha nova, então somar item a item é diferente de medir o texto todo
 * emendado — daí não dar para reaproveitar o fonteDoCampo aqui.
 */
function fonteDaLista(field, itens, larguraPx, alturaPx) {
  if (!field.fit) return field.fontSize;
  const entreLinhas = field.lineHeight || 1.3;
  // itemSpacing vem como "0.35em" e vale para cima E para baixo de cada item
  const espaco = (parseFloat(field.itemSpacing) || 0.3) * 2;
  const alturaPara = (t) =>
    (itens || []).reduce(
      (soma, item, i) =>
        soma +
        alturaDeTexto("• " + item, larguraPx, t, entreLinhas) +
        (i < itens.length - 1 ? t * espaco : 0),
      0
    );
  return maiorFonteQueCabe(alturaPara, {
    max: field.fit.max || field.fontSize,
    min: field.fit.min || 24,
    altura: alturaPx,
  });
}

/**
 * Tamanho da PERGUNTA num bloco de perguntas (conversação, language game,
 * avaliação). As respostas/opções encolhem na mesma proporção que o template
 * já usa, para o contraste entre pergunta e resposta não mudar de slide para
 * slide.
 */
function fonteDoBlocoQa(field, itens, larguraPx, alturaPx) {
  if (!field.fit) return field.questionFontSize;
  const razaoResposta = field.answerFontSize / field.questionFontSize;
  const entreLinhas = field.lineHeight || 1.3;
  const espacoEntreBlocos = parseFloat(field.blockSpacing) || 1.1;   // em "em"
  const alturaPara = (t) => {
    let total = 0;
    (itens || []).forEach((item, i) => {
      // "00. " porque a numeração entra na conta da primeira linha
      total += alturaDeTexto("00. " + (item.question || ""), larguraPx, t, entreLinhas);
      const secundarias = item.options || item.modelAnswers || [];
      secundarias.forEach((linha) => {
        total += alturaDeTexto("A) " + linha, larguraPx, t * razaoResposta, entreLinhas);
      });
      if (i < itens.length - 1) total += t * espacoEntreBlocos;
    });
    return total;
  };
  return maiorFonteQueCabe(alturaPara, {
    max: field.fit.max || field.questionFontSize,
    min: field.fit.min || 28,
    altura: alturaPx,
  });
}

// A grade do vocabulário é preenchida por linha (item 0 na coluna esquerda,
// item 1 na direita, item 2 na esquerda...), então os pares vão à esquerda e
// os ímpares à direita.
const VOCAB_GAP = 0.03;   // fração da largura da caixa, igual nos dois renderizadores

function colunasDoVocabulario(itens) {
  return [
    (itens || []).filter((_, i) => i % 2 === 0),
    (itens || []).filter((_, i) => i % 2 === 1),
  ];
}

/** Tamanho da PALAVRA no slide de vocabulário (a tradução sai proporcional). */
function fonteDoVocabulario(field, itens, larguraPx, alturaPx) {
  if (!field.fit) return field.fontSize;
  const larguraColuna = (larguraPx * (1 - VOCAB_GAP)) / 2;
  const escala = field.translationScale || 0.62;
  const entreLinhas = field.lineHeight || 1.15;
  const espaco = field.itemSpacing || 0.42;
  const colunas = colunasDoVocabulario(itens);
  const alturaPara = (t) =>
    Math.max(
      ...colunas.map((coluna) =>
        coluna.reduce((soma, item, i) => {
          const palavra = alturaDeTexto(item.word, larguraColuna, t, entreLinhas);
          const traducao = item.translation
            ? alturaDeTexto(item.translation, larguraColuna, t * escala, entreLinhas)
            : 0;
          return soma + palavra + traducao + (i < coluna.length - 1 ? t * espaco : 0);
        }, 0)
      )
    );
  return maiorFonteQueCabe(alturaPara, {
    max: field.fit.max || field.fontSize,
    min: field.fit.min || 30,
    altura: alturaPx,
  });
}

module.exports = {
  getQaItems,
  buildDynamicValue,
  textoEstatico,
  emojiDaSecao,
  linhasDeTexto,
  alturaDeTexto,
  maiorFonteQueCabe,
  fonteDoCampo,
  fonteDaLista,
  fonteDoBlocoQa,
  fonteDoVocabulario,
  colunasDoVocabulario,
  VOCAB_GAP,
  RAZAO_CHAR,
};
