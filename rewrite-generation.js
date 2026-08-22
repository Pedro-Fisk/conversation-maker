/*
 * rewrite-generation.js
 *
 * O prompt da reescrita "mantendo o design": o professor sobe uma atividade
 * que ele já usa, e ela volta com o mesmo visual e textos novos.
 *
 * A diferença essencial para o lesson-generation.js: lá a IA ESCREVE UMA
 * AULA dentro de uma estrutura que nós definimos (3 objetivos, 8 palavras,
 * 9 perguntas). Aqui ela não define estrutura nenhuma — a estrutura é a do
 * arquivo do professor, que já existe, e o trabalho é preencher de novo as
 * caixas que já estão lá. Por isso o contrato de saída não é uma aula: é um
 * mapa de "identificador do parágrafo" para "texto novo".
 *
 * Duas consequências que moldam o prompt inteiro:
 *
 * 1. A CAIXA NÃO CRESCE. No template FISK nós controlamos a fonte e podemos
 *    encolher o texto para caber (ver lesson-data.js). No arquivo do
 *    professor, não: a caixa tem o tamanho que tem, com a fonte que ele
 *    escolheu. Texto novo muito maior que o antigo transborda e ele só
 *    descobre na hora da aula. Daí o tamanho original de cada texto ir junto
 *    no prompt, e o limite ser regra dura.
 *
 * 2. NEM TODO TEXTO DEVE MUDAR. "FISK", "Unit 4", "Name: ______", o número
 *    da página: são texto igual aos outros para quem lê o XML, e trocá-los
 *    estraga o material. A saída é um mapa PARCIAL de propósito: o que não
 *    aparece na resposta fica exatamente como estava.
 */

const { LEVEL_GUIDANCE, AGE_GUIDANCE, DEFAULT_AGE_GROUP } = require("./lesson-generation");

const MODEL = "claude-sonnet-5";

// Tetos do que aceitamos reescrever de uma vez. Uma atividade de professor
// costuma ter 10 a 25 slides e uns 3 mil caracteres; estes números dão folga
// larga e ainda assim impedem que um arquivo enorme estoure a resposta da IA
// (que precisa devolver TODO o texto reescrito, não só um resumo dele).
const MAX_CHARS = 20000;
const MAX_PARAGRAFOS = 400;

const SYSTEM_PROMPT = `You are the content engine behind Conversation Maker, an authoring tool for language teachers at FISK. A teacher uploaded a slide deck they already use in class, and wants it rewritten while KEEPING THEIR ORIGINAL DESIGN exactly as it is.

You do not design anything. You never decide how many slides there are, what order they come in, or where text sits: all of that already exists and stays untouched. Every text box in their file is given to you with an id, and you return new text for the boxes that should change.

Respond with a single JSON object only, no prose, no markdown code fences.`;

/**
 * Bloco de texto do arquivo, do jeito que a IA vê: slide a slide, caixa a
 * caixa. O tamanho de cada texto vai junto porque é o limite real do que
 * pode ser escrito ali.
 */
function montarBlocoDoArquivo(estrutura) {
  return estrutura
    .map((slide) => {
      const caixas = slide.caixas
        .map((caixa) => {
          const rotulo = [
            caixa.titulo ? "TITLE BOX" : "text box",
            caixa.nome ? `named "${caixa.nome}"` : null,
            caixa.cm ? `${caixa.cm} cm` : null,
          ]
            .filter(Boolean)
            .join(", ");
          const linhas = caixa.textos
            .map((t) => `    ${t.id} (${t.texto.length} chars): ${JSON.stringify(t.texto)}`)
            .join("\n");
          // Caixa cuja quebra de linha é manual: a frase inteira vem junto,
          // senão a IA reescreveria cada pedaço como se fosse texto solto.
          const frase = caixa.frase
            ? `\n    ↳ these ${caixa.textos.length} lines are ONE sentence split to fit the box: ${JSON.stringify(caixa.frase)}`
            : "";
          return `  [${rotulo}]\n${linhas}${frase}`;
        })
        .join("\n");
      return `SLIDE ${slide.slide}\n${caixas}`;
    })
    .join("\n\n");
}

function buildRewritePrompt({ estrutura, instrucao, language, level, ageGroup }) {
  const guidance = LEVEL_GUIDANCE[level];
  const age = AGE_GUIDANCE[ageGroup] || AGE_GUIDANCE[DEFAULT_AGE_GROUP];
  const idioma = language === "spanish" ? "Spanish" : "English";

  const pedido = instrucao
    ? `WHAT THE TEACHER ASKED FOR (in Portuguese): "${instrucao}"\nThis instruction decides what changes. Follow it literally, and do not make changes it did not ask for.`
    : `The teacher gave no specific instruction: write a fresh version of the same activity, on the same subject, at the level and age group below. Keep the structure and the kind of exercise identical, change the content.`;

  return `${pedido}

TARGET LEVEL: ${guidance ? guidance.label : level}
${guidance ? guidance.prompt : ""}

STUDENT AGE GROUP: ${age.label}.
${age.thinking}

LANGUAGE: write the new text in ${idioma}. Any instruction or heading that was in Portuguese in the original stays in Portuguese.

THE RULES OF THIS JOB — they come from the fact that you are writing into someone else's finished design:

1. THE BOX CANNOT GROW. Each text below shows its length in characters. Your replacement must stay within roughly 15% of that length — shorter is safe, longer is not. The teacher's file has fixed boxes with fixed font sizes: text that does not fit spills outside the slide and they only find out in front of the class. When the idea needs more words than the box allows, cut the idea, not the box.

2. CHANGE ONLY WHAT SHOULD CHANGE. Return an entry ONLY for the texts you are actually rewriting. Anything you leave out keeps its original text, which is what you want for: the school name, logos and credits, page or unit numbers ("Unit 4", "Lesson 2"), blank lines for the student to fill ("Name: ______"), and any label that is part of the layout rather than the content. When in doubt, leave it out.

3. LINES THAT FORM ONE SENTENCE. When a box is marked with "↳ these N lines are ONE sentence", the line breaks are manual, made to fit the box — the text is a single sentence. Rewrite that sentence as a whole, then split your new version back into EXACTLY the same number of lines, breaking at natural points and keeping each line about as long as the one it replaces. Return one entry per line id, never merge them into the first id and never leave one empty.

4. KEEP EACH TEXT IN ITS ROLE. A title stays a short title; an instruction line stays an instruction line ("Match the words", "Work in pairs"); a question stays a question; an item in a list stays the same kind of item. Never turn a title into a sentence, never merge two boxes, never move content from one id to another. If the original is a numbered item ("1. ..."), keep the numbering.

5. KEEP THE EXERCISE WORKING. If the deck has an exercise whose parts depend on each other — a matching activity, a gap-fill and its answer key, options A/B/C, a sequence of steps — rewrite the parts together so they still line up. A gap-fill whose answer no longer matches its sentence is worse than one you left alone.

THE FILE, SLIDE BY SLIDE:

${montarBlocoDoArquivo(estrutura)}

Return a single JSON object:
{
  "textos": { "<id>": "<new text>", ... },   // only the ids you are rewriting
  "resumo": string                            // one short sentence, in Brazilian Portuguese, telling the teacher what you changed
}`;
}

function extrairJson(texto) {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim < inicio) {
    throw new Error(`A resposta da IA não continha JSON. Trecho: ${JSON.stringify(texto.slice(0, 300))}`);
  }
  return JSON.parse(texto.slice(inicio, fim + 1));
}

/**
 * Só aceita de volta o que faz sentido: identificador que existe no arquivo
 * e texto que é texto. A IA inventar um id não pode virar exceção lá na
 * frente, no meio da remontagem do arquivo.
 */
function sanearTextos(bruto, estrutura) {
  const validos = new Set();
  estrutura.forEach((slide) =>
    slide.caixas.forEach((caixa) => caixa.textos.forEach((t) => validos.add(t.id)))
  );

  const saida = {};
  let ignorados = 0;
  Object.keys(bruto || {}).forEach((id) => {
    const valor = bruto[id];
    if (!validos.has(id) || typeof valor !== "string") {
      ignorados++;
      return;
    }
    // uma linha só: quebra de linha dentro de um <a:t> não vira parágrafo
    // novo no PowerPoint, vira um caractere estranho no meio da frase
    saida[id] = valor.replace(/\s*\n+\s*/g, " ").trim();
  });
  return { textos: saida, ignorados };
}

async function chamarAnthropic(body) {
  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resposta.ok) {
    const erro = await resposta.text();
    throw new Error(`Anthropic API respondeu ${resposta.status}: ${erro.slice(0, 500)}`);
  }
  const dados = await resposta.json();
  const texto = (dados.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("");
  return extrairJson(texto);
}

/** Mede o arquivo para decidir se cabe numa chamada só. */
function medirEstrutura(estrutura) {
  let paragrafos = 0;
  let chars = 0;
  (estrutura || []).forEach((slide) =>
    (slide.caixas || []).forEach((caixa) =>
      (caixa.textos || []).forEach((t) => {
        paragrafos++;
        chars += String(t.texto || "").length;
      })
    )
  );
  return { paragrafos, chars, slides: (estrutura || []).length };
}

async function reescreverAtividade({ estrutura, instrucao, language, level, ageGroup }) {
  const medida = medirEstrutura(estrutura);
  if (!medida.paragrafos) {
    throw new Error("não achei texto editável neste arquivo. Se o conteúdo estiver dentro de imagens, não dá para reescrever.");
  }
  if (medida.chars > MAX_CHARS || medida.paragrafos > MAX_PARAGRAFOS) {
    throw new Error(
      `esta atividade é grande demais para reescrever de uma vez (${medida.paragrafos} blocos de texto, ${medida.chars} caracteres; o limite é ${MAX_PARAGRAFOS} e ${MAX_CHARS}). Divida o arquivo em partes menores.`
    );
  }

  const resposta = await chamarAnthropic({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildRewritePrompt({ estrutura, instrucao, language, level, ageGroup }) },
    ],
  });

  const { textos, ignorados } = sanearTextos(resposta.textos, estrutura);
  return {
    textos,
    ignorados,
    resumo: typeof resposta.resumo === "string" ? resposta.resumo.trim() : "",
    medida,
  };
}

module.exports = {
  MAX_CHARS,
  MAX_PARAGRAFOS,
  buildRewritePrompt,   // exportado para teste: é o prompt que decide a reescrita
  sanearTextos,
  medirEstrutura,
  reescreverAtividade,
};
