/*
 * lesson-generation.js
 *
 * Motor de geração compartilhado por api/generate-lesson.js (aula
 * completa) e api/regenerate-section.js (regenerar só uma seção da aula
 * já gerada, ex.: só o Language Game). Antes esse motor vivia inteiro
 * dentro de api/generate-lesson.js; foi extraído para cá para que os dois
 * endpoints reaproveitem exatamente as mesmas regras de nível, respostas-
 * modelo, fontes gramaticais do Language Game etc., em vez de duplicar (ou
 * pior, deixar dessincronizar) esse texto entre dois arquivos.
 *
 * generateFullLesson({...})  -> objeto `lesson` completo (mesmo contrato
 *                                de sempre, documentado em render-slides-html.js)
 * generateSection({...})     -> só o campo pedido, ex.: { languageGame: [...] },
 *                                pronto para substituir dentro de um `lesson`
 *                                já existente sem tocar no resto.
 */

const LEVEL_GUIDANCE = {
  basic: {
    label: "Basic",
    prompt:
      "Basic level: simple present/past tense, short common-word vocabulary, short direct conversation questions.",
  },
  intermediate: {
    label: "Intermediate",
    prompt:
      "Intermediate level: a wider range of tenses and everyday vocabulary, conversation questions that invite a short opinion or explanation.",
  },
  advanced: {
    label: "Advanced",
    prompt:
      "Advanced level: nuanced/less common vocabulary, questions that invite critical thinking, comparison or hypothetical reasoning, fluent and idiomatic phrasing.",
  },
  spanish_basic: {
    label: "Spanish B1",
    prompt:
      "Spanish B1 level (CEFR — Common European Framework of Reference for Languages). Write the topic content, objectives, vocabulary words, conversation questions, language game items and evaluation questions ALL IN SPANISH (not English). Vocabulary translations must be in Brazilian Portuguese (the students are Brazilian). B1 = intermediate: everyday vocabulary, common tenses (presente, pretérito, futuro próximo), natural conversational Spanish a B1 student could both understand and answer.",
  },
  spanish_advanced: {
    label: "Spanish C1",
    prompt:
      "Spanish C1 level (CEFR — Common European Framework of Reference for Languages). Write the topic content, objectives, vocabulary words, conversation questions, language game items and evaluation questions ALL IN SPANISH (not English). Vocabulary translations must be in Brazilian Portuguese (the students are Brazilian). C1 = advanced/proficient: sophisticated and less frequent vocabulary, idiomatic expressions, complex grammatical structures (subjuntivo across multiple tenses, conditional, passive voice, elaborate subordinate clauses), questions that invite nuanced argumentation, critical analysis and hypothetical/counterfactual reasoning — fluent, idiomatic and stylistically varied, close to a proficient near-native register.",
  },
};

// Estilo dos "modelAnswers" por nível — reformulado a partir de apostilas
// reais do FISK. O padrão real da escola é bem mais aberto do que um
// modelo padrão: raramente dá a resposta pronta, prefere um começo de
// frase para o aluno completar, e em vários casos não dá modelo nenhum.
const ANSWER_STYLE_TIER = {
  basic: "basic",
  intermediate: "intermediate",
  advanced: "advanced",
  spanish_basic: "basic",
  spanish_advanced: "advanced",
};

// Esta orientação vale só para "conversation" e "evaluation" (perguntas
// abertas de conversação). O "languageGame" tem seu próprio formato de
// múltipla escolha — ver LANGUAGE_GAME_GUIDANCE mais abaixo.
const ANSWER_GUIDANCE = {
  basic: `MODEL ANSWERS (conversation + evaluation questions only) — keep them minimal and open-ended, never a fully spelled-out answer:
- For most questions (opinions, personal experience, open topics), give AT MOST ONE model answer, and make it an INCOMPLETE sentence starter ending in "..." (e.g. "My favorite player is...", "I'm grateful for...") — never a finished sentence with the content already filled in. The student completes it.
- It's fine, and encouraged, for a simple/direct question to have NO model answer at all (empty array) — not every question needs scaffolding.
- ONLY for clearly binary yes/no or true/false questions, you may give up to two short, complete model answers, one for each side (e.g. "Yes, I do." / "No, I don't.").
- Never give two complete, fully-elaborated example answers for the same open question — that removes the reason for the student to think.`,
  intermediate: `MODEL ANSWERS (conversation + evaluation questions only) — be sparing, most questions get none:
- Across the questions, give a model answer to only about 40% of them — leave the rest with an empty modelAnswers array entirely.
- When you do include one, it must be a single OPEN sentence starter (e.g. "I think that... because...", "In my opinion..."), never a complete, fully-elaborated answer. At most one model answer per question — never two.
- Choose which questions get a starter based on which ones are harder to begin (more abstract/complex), not randomly.`,
  advanced: `MODEL ANSWERS (conversation + evaluation questions only) — do not provide any (leave modelAnswers as an empty array for every conversation and evaluation question); students at this level answer fully unprompted.`,
};

// O language game NÃO usa modelAnswers — é sempre múltipla escolha (3
// opções, 1 certa). Vale para todo nível; quem escala com o nível é a
// sutileza das distrações (ver LEVEL_GUIDANCE).
const LANGUAGE_GAME_GUIDANCE = `LANGUAGE GAME — always multiple choice, never open model answers:
- Each item is a short language-focused prompt (fill-in-the-blank, choose the correct word/tense/preposition, etc.) testing the vocabulary/grammar just covered.
- Provide exactly 3 answer options ("options"). Exactly ONE must be unambiguously correct ("correctIndex", 0-based). The other two must be CLEARLY wrong to anyone who knows the target grammar/vocabulary — not just a different-but-also-acceptable phrasing. Avoid near-duplicate options where two could both pass as correct.
- Make the two wrong options plausible distractors (a common mistake a learner would make: wrong verb tense, wrong preposition, confusable word) rather than random or absurd — they should require real knowledge to rule out, not be obviously silly.
- Keep each option short (a word, a short phrase, or a short full-sentence version of the prompt with the blank filled in — pick whichever reads naturally for that question).`;

// Perfil da turma escolhido pelo professor. Entra no prompt apenas como
// contexto leve: a IA NÃO deve trocar os temas nem infantilizar o conteúdo
// por causa da idade — o tópico do professor manda.
const AGE_GUIDANCE = {
  preteens: { label: "pre-teens" },
  teens: { label: "teenagers" },
  adults: { label: "adults" },
};
const DEFAULT_AGE_GROUP = "adults";

const { BOOK_CATALOG, LEVEL_DEFAULT_BOOKS } = require("./content-catalog");

const ENGLISH_LEVELS = ["basic", "intermediate", "advanced"];
const SPANISH_LEVELS = ["spanish_basic", "spanish_advanced"];
const MODEL = "claude-sonnet-5";

// Teto de buscas na web POR GERAÇÃO quando o professor marca o checkbox
// "Pesquisar na internet". Cada busca custa ~US$0,01 + tokens; 3 cobre
// pesquisa inicial + refinamento sem deixar o custo nem o tempo crescerem.
const MAX_WEB_SEARCHES = 3;

// Rótulos em pt-BR das seções regeneráveis — usado tanto para validar o
// parâmetro "section" recebido por api/regenerate-section.js quanto para
// compor o texto do log de atividade.
const SECTION_LABELS = {
  objectives: "Objetivos",
  vocabulary: "Vocabulário",
  introText: "Introdução",
  conversation: "Conversação",
  languageGame: "Language Game",
  evaluation: "Avaliação",
};

const SYSTEM_PROMPT = `You are the content engine behind Conversation Maker, an authoring tool for language teachers at FISK. You generate ONLY lesson content as structured JSON — a fixed, already-designed 18-page slide template (built in Canva) handles all layout and visuals downstream. Your only job is to fill in the text.

The template has a FIXED structure that never changes, so your output must always contain exactly:
- 3 objectives
- 8 vocabulary words (each with a Portuguese translation, since the students are Brazilian)
- 1 introductory paragraph (a single flowing paragraph, not a list, not multiple paragraphs)
- 9 conversation questions, organized as 3 natural subtopics of 3 questions each (do not label the subtopics in the output, just order the 9 questions so subtopics of 3 flow naturally back to back)
- 6 language game items (short language-focused challenges: fill-in-the-blank, choose the correct word/tense, etc. — testing the vocabulary/grammar just covered)
- 2 evaluation/reflection questions

Each conversation and evaluation question has a "modelAnswers" array of 0 to 2 short strings. This is NOT always 2 — how many (if any), and whether they're open sentence starters or complete answers, is dictated by the MODEL ANSWERS guidance in the user message. Follow it precisely: real FISK classroom material is deliberately sparing with model answers, leaning on open sentence starters (ending in "...") rather than fully-written answers, so students have to produce their own language instead of just reading a ready-made sentence.

Each language game item is DIFFERENT: it's multiple choice, with an "options" array of exactly 3 strings and a "correctIndex" (0, 1, or 2) marking the single correct one — see the LANGUAGE GAME guidance in the user message for how to write good distractors.

Respond with a single JSON object only, no prose, no markdown code fences, matching exactly the schema described in the user message (camelCase keys). Never add or remove array items in the top-level lists — always exactly the counts specified above (modelAnswers arrays are the one exception, and vary in length per the guidance; language game "options" is always exactly 3).`;

// System prompt mais curto para api/regenerate-section.js: só UM campo do
// mesmo esquema é pedido por vez, o resto da aula já existe e não muda.
const SECTION_SYSTEM_PROMPT = `You are the content engine behind Conversation Maker, an authoring tool for language teachers at FISK. A teacher already generated a lesson and is regenerating ONE section of it — the rest of the lesson (other sections) stays exactly as it was, unchanged. A fixed, already-designed slide template handles all layout downstream; your only job is to fill in the text for the one section requested.

Respond with a single JSON object only, no prose, no markdown code fences, containing ONLY the one key requested in the user message, with exactly the item count specified.`;

// Pool de pontos gramaticais para o Language Game, com base nos estágios
// (livros) que o professor marcou no formulário. Se ele não marcar nenhum,
// usa o mapeamento padrão por nível (LEVEL_DEFAULT_BOOKS). Só se aplica ao
// inglês — os estágios (Essentials/Transitions/Fluency/Focus) são do curso
// de inglês da FISK, sem equivalente em espanhol.
function pickGrammarSources(level, stages, count) {
  const validStages = Array.isArray(stages) ? stages.filter((key) => BOOK_CATALOG[key]) : [];
  const bookKeys = validStages.length ? validStages : LEVEL_DEFAULT_BOOKS[level] || [];
  if (!bookKeys.length) return null;

  const pool = [];
  bookKeys.forEach((key) => {
    const book = BOOK_CATALOG[key];
    if (!book) return;
    book.points.forEach((point) => {
      pool.push({
        label: `${book.label} · ${point.code}`,
        promptLabel: `${book.label} — Lesson ${point.code} (${point.title})`,
        grammar: point.grammar,
      });
    });
  });
  if (!pool.length) return null;

  // Fisher-Yates shuffle, depois repete o pool se for menor que "count"
  // (só acontece se o professor marcar um único livro pequeno).
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = [];
  for (let i = 0; i < count; i++) picked.push(shuffled[i % shuffled.length]);
  return picked;
}

function buildLanguageGameSourceBlock(sources) {
  if (!sources || !sources.length) return "";
  const lines = sources
    .map((s, i) => `${i + 1}. [${s.promptLabel}] Grammar focus: ${s.grammar}`)
    .join("\n");
  return `\nLANGUAGE GAME — GRAMMAR SOURCES (exactly ${sources.length} sources below, one per language game item, IN ORDER — item 1 must test source 1, item 2 must test source 2, and so on):
${lines}
Each language game question must specifically test the grammar focus listed for its source — do not mix sources between items, and do not invent a different grammar point. You do NOT need to mention the book or lesson in the question text itself; just write a natural language-focused multiple-choice question that exercises that exact grammar point.\n`;
}

function buildUserPrompt({ language, topic, level, ageGroup, useWebSearch, sources }) {
  const guidance = LEVEL_GUIDANCE[level];
  const age = AGE_GUIDANCE[ageGroup] || AGE_GUIDANCE[DEFAULT_AGE_GROUP];
  const answerGuidance = ANSWER_GUIDANCE[ANSWER_STYLE_TIER[level]] || ANSWER_GUIDANCE.intermediate;
  const sourceBlock = buildLanguageGameSourceBlock(sources);

  const searchNote = useWebSearch
    ? `\nBefore writing, use the web search tool (at most ${MAX_WEB_SEARCHES} searches) to gather recent, factual information about the topic — names, results, dates, current events. Base the lesson content on what you find. After searching, your final answer must still be ONLY the JSON object, with no citations, no commentary and no source list inside the JSON values.\n`
    : "";

  return `${searchNote}Topic: ${topic}
Level: ${guidance.label}
${guidance.prompt}

Student age group: ${age.label}. Use this ONLY as background context. Do NOT adapt, replace or soften the themes because of the students' age, and never make the content childish or cartoonish — develop the teacher's topic exactly as given, with full depth and a natural register.

${answerGuidance}

${LANGUAGE_GAME_GUIDANCE}
${sourceBlock}
Return a single JSON object with exactly these keys:
{
  "coverTitle": string,        // short, catchy lesson title built from the topic (e.g. "Discovering Japan")
  "coverLevel": "${guidance.label}",
  "topic": string,             // short topic phrase, e.g. "Japan"
  "objectives": [string, string, string],
  "vocabulary": [ { "word": string, "translation": string } ]  // exactly 8 items
  ,
  "introText": string,         // exactly one paragraph, no line breaks
  "conversation": [ { "question": string, "modelAnswers": string[] } ]  // exactly 9 items; modelAnswers has 0-2 items per the MODEL ANSWERS guidance above
  ,
  "languageGame": [ { "question": string, "options": [string, string, string], "correctIndex": number } ]  // exactly 6 items; options is always exactly 3, correctIndex is 0, 1 or 2 — see LANGUAGE GAME guidance above
  ,
  "evaluation": [ { "question": string, "modelAnswers": string[] } ]  // exactly 2 items; modelAnswers has 0-2 items per the MODEL ANSWERS guidance above
}`;
}

// Prompt enxuto de UMA seção só, usado por api/regenerate-section.js.
function buildSectionUserPrompt({ section, topic, level, ageGroup, useWebSearch, sources }) {
  const guidance = LEVEL_GUIDANCE[level];
  const age = AGE_GUIDANCE[ageGroup] || AGE_GUIDANCE[DEFAULT_AGE_GROUP];
  const answerGuidance = ANSWER_GUIDANCE[ANSWER_STYLE_TIER[level]] || ANSWER_GUIDANCE.intermediate;

  const searchNote = useWebSearch
    ? `\nBefore writing, use the web search tool (at most ${MAX_WEB_SEARCHES} searches) to gather recent, factual information about the topic. Base the content on what you find. Your final answer must still be ONLY the JSON object, with no citations or commentary inside the JSON values.\n`
    : "";

  const header = `${searchNote}Topic: ${topic}
Level: ${guidance.label}
${guidance.prompt}

Student age group: ${age.label}. Use this ONLY as background context — do not adapt, replace or soften content because of the students' age.
`;

  switch (section) {
    case "objectives":
      return `${header}
Write exactly 3 lesson objectives for this topic and level.

Return JSON: { "objectives": [string, string, string] }`;

    case "vocabulary":
      return `${header}
Write exactly 8 vocabulary words for this topic and level, each with a Brazilian Portuguese translation (the students are Brazilian).

Return JSON: { "vocabulary": [ { "word": string, "translation": string } ] } // exactly 8 items`;

    case "introText":
      return `${header}
Write exactly one introductory paragraph (a single flowing paragraph, no line breaks, no list) for this topic and level.

Return JSON: { "introText": string }`;

    case "conversation":
      return `${header}
${answerGuidance}

Write exactly 9 conversation questions, organized as 3 natural subtopics of 3 questions each (do not label the subtopics, just order the 9 questions so groups of 3 flow naturally back to back).

Return JSON: { "conversation": [ { "question": string, "modelAnswers": string[] } ] } // exactly 9 items; modelAnswers has 0-2 items per the MODEL ANSWERS guidance above`;

    case "evaluation":
      return `${header}
${answerGuidance}

Write exactly 2 evaluation/reflection questions for this topic and level.

Return JSON: { "evaluation": [ { "question": string, "modelAnswers": string[] } ] } // exactly 2 items; modelAnswers has 0-2 items per the MODEL ANSWERS guidance above`;

    case "languageGame": {
      const sourceBlock = buildLanguageGameSourceBlock(sources);
      return `${header}
${LANGUAGE_GAME_GUIDANCE}
${sourceBlock}
Write exactly 6 language game items.

Return JSON: { "languageGame": [ { "question": string, "options": [string, string, string], "correctIndex": number } ] } // exactly 6 items; options is always exactly 3, correctIndex is 0, 1 or 2`;
    }

    default:
      throw new Error(`Seção desconhecida: ${section}`);
  }
}

function extractJson(text, debugInfo) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `A resposta da IA não continha um JSON válido. ${debugInfo} Trecho recebido: ${JSON.stringify(
        text.slice(0, 400)
      )}`
    );
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (parseErr) {
    throw new Error(
      `Falha ao interpretar o JSON da IA (${parseErr.message}). ${debugInfo} Trecho: ${JSON.stringify(
        text.slice(0, 400)
      )}`
    );
  }
}

function clampArray(arr, n) {
  const a = Array.isArray(arr) ? arr.slice(0, n) : [];
  while (a.length < n) a.push(a[a.length - 1] || {});
  return a;
}

// O language game é múltipla escolha: garante sempre exatamente 3 opções e
// um correctIndex válido (0-2), mesmo que a IA erre a contagem.
function clampLanguageGameItem(item) {
  const options = Array.isArray(item && item.options) ? item.options.slice(0, 3) : [];
  while (options.length < 3) options.push(options[options.length - 1] || "");
  let correctIndex = Number.isInteger(item && item.correctIndex) ? item.correctIndex : 0;
  if (correctIndex < 0 || correctIndex > 2) correctIndex = 0;
  return { question: (item && item.question) || "", options, correctIndex, source: "" };
}

function clampLanguageGame(arr, n) {
  return clampArray(arr, n).map(clampLanguageGameItem);
}

// Anota, por índice, a qual fonte (livro + lição) cada pergunta do
// Language Game corresponde — não confiamos na IA para ecoar o rótulo de
// volta certinho no JSON; como NÓS escolhemos os "sources" na ordem exata
// pedida no prompt, é mais confiável carimbar aqui depois de receber a
// resposta. Sem sources (ex.: espanhol, ou nível sem mapeamento), o campo
// "source" fica como string vazia e o rodapé simplesmente não aparece.
function attachLanguageGameSources(languageGame, sources) {
  if (!sources || !sources.length) return languageGame;
  return languageGame.map((item, i) => ({
    ...item,
    source: sources[i % sources.length].label,
  }));
}

async function callAnthropicRaw(body) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API respondeu ${response.status}: ${errText.slice(0, 500)}`);
  }

  const data = await response.json();
  // Concatena TODOS os blocos de texto (não só o primeiro): com a busca na
  // web ativa, a resposta vem intercalada com blocos de tool_use e o texto
  // final pode chegar fatiado em vários blocos por causa das citações.
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("");
  const debugInfo = `model=${data.model} stop_reason=${data.stop_reason} blocks=${
    (data.content || []).map((b) => b.type).join(",")
  }.`;
  return extractJson(text, debugInfo);
}

async function generateFullLesson({ language, topic, level, ageGroup, useWebSearch, stages }) {
  const sources = language === "english" ? pickGrammarSources(level, stages, 6) : null;

  const body = {
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildUserPrompt({ language, topic, level, ageGroup, useWebSearch, sources }) },
    ],
  };
  if (useWebSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_WEB_SEARCHES }];
  }

  const parsed = await callAnthropicRaw(body);

  return {
    coverTitle: parsed.coverTitle || topic,
    coverLevel: LEVEL_GUIDANCE[level].label,
    // Chave "crua" do nível (ex.: "basic"), diferente do rótulo bonito
    // acima — precisa viajar de volta ao regenerar uma seção depois.
    levelKey: level,
    language,
    topic: parsed.topic || topic,
    objectives: clampArray(parsed.objectives, 3),
    vocabulary: clampArray(parsed.vocabulary, 8),
    introText: parsed.introText || "",
    conversation: clampArray(parsed.conversation, 9),
    languageGame: attachLanguageGameSources(clampLanguageGame(parsed.languageGame, 6), sources),
    evaluation: clampArray(parsed.evaluation, 2),
  };
}

// Regenera SÓ uma seção (usado por api/regenerate-section.js), sem tocar
// no resto da aula. Retorna só a chave pedida, ex.: { languageGame: [...] }.
async function generateSection({ section, language, topic, level, ageGroup, useWebSearch, stages }) {
  if (!SECTION_LABELS[section]) {
    throw new Error(`Seção inválida: ${section}`);
  }

  const sources = section === "languageGame" && language === "english" ? pickGrammarSources(level, stages, 6) : null;

  const body = {
    model: MODEL,
    max_tokens: 4000,
    system: SECTION_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildSectionUserPrompt({ section, topic, level, ageGroup, useWebSearch, sources }) },
    ],
  };
  if (useWebSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_WEB_SEARCHES }];
  }

  const parsed = await callAnthropicRaw(body);

  switch (section) {
    case "objectives":
      return { objectives: clampArray(parsed.objectives, 3) };
    case "vocabulary":
      return { vocabulary: clampArray(parsed.vocabulary, 8) };
    case "introText":
      return { introText: parsed.introText || "" };
    case "conversation":
      return { conversation: clampArray(parsed.conversation, 9) };
    case "evaluation":
      return { evaluation: clampArray(parsed.evaluation, 2) };
    case "languageGame":
      return { languageGame: attachLanguageGameSources(clampLanguageGame(parsed.languageGame, 6), sources) };
    default:
      throw new Error(`Seção inválida: ${section}`);
  }
}

module.exports = {
  LEVEL_GUIDANCE,
  AGE_GUIDANCE,
  DEFAULT_AGE_GROUP,
  ENGLISH_LEVELS,
  SPANISH_LEVELS,
  SECTION_LABELS,
  generateFullLesson,
  generateSection,
};
