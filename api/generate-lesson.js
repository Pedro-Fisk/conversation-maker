/*
 * Vercel serverless function: POST /api/generate-lesson
 *
 * Body: { accessCode, language, topic, levelChoice }
 * Returns: { lessons: [ ...Lesson ] }  (1 lesson, or several for "all_levels")
 *
 * Requires two environment variables set in the Vercel project dashboard
 * (Settings -> Environment Variables) — never committed to the repo:
 *   ANTHROPIC_API_KEY  — from console.anthropic.com
 *   ACCESS_CODE        — shared password teachers enter in the form
 *
 * This function holds the Anthropic API key server-side. The static
 * frontend (index.html/app.js) never sees it — it only calls this
 * endpoint, which lives on the same Vercel deployment (same origin, so
 * no CORS setup needed).
 *
 * Every generated lesson follows ONE fixed shape (the "canonical lesson"
 * documented at the top of ../render-slides-html.js) because it is rendered
 * onto the SAME 18-page Canva template for every level and both languages
 * — Pedro's call: rather than a different slide structure per level, all
 * levels/languages reuse the one template, and only the *content*
 * (question depth, vocabulary difficulty, register) scales with level.
 * That means every lesson always has exactly: 3 objectives, 8 vocabulary
 * words, 1 intro paragraph, 9 conversation Q&As (3 groups of 3), 6
 * language game Q&As (2 groups of 3), 2 evaluation Q&As — regardless of
 * level or language.
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
// reais do FISK (Pedro mandou vários exemplos). O padrão real da escola é
// bem mais aberto do que o que a gente gerava antes: raramente dá a
// resposta pronta, prefere um começo de frase para o aluno completar, e
// em vários casos não dá modelo nenhum. Cada nível de inglês tem seu
// próprio "tier"; os dois níveis de espanhol usam o tier mais próximo em
// termos de proficiência (B1 ~ basic, C1 ~ advanced).
const ANSWER_STYLE_TIER = {
  basic: "basic",
  intermediate: "intermediate",
  advanced: "advanced",
  spanish_basic: "basic",
  spanish_advanced: "advanced",
};

// Esta orientação vale só para "conversation" e "evaluation" (perguntas
// abertas de conversação). O "languageGame" tem seu próprio formato de
// múltipla escolha — ver LANGUAGE_GAME_GUIDANCE mais abaixo, que vale para
// todos os níveis igualmente (a dificuldade das distrações escala com o
// texto de LEVEL_GUIDANCE, não com este bloco).
const ANSWER_GUIDANCE = {
  basic: `MODEL ANSWERS (conversation + evaluation questions only) — keep them minimal and open-ended, never a fully spelled-out answer:
- For most questions (opinions, personal experience, open topics), give AT MOST ONE model answer, and make it an INCOMPLETE sentence starter ending in "..." (e.g. "My favorite player is...", "I'm grateful for...") — never a finished sentence with the content already filled in. The student completes it.
- It's fine, and encouraged, for a simple/direct question to have NO model answer at all (empty array) — not every question needs scaffolding.
- ONLY for clearly binary yes/no or true/false questions, you may give up to two short, complete model answers, one for each side (e.g. "Yes, I do." / "No, I don't.").
- Never give two complete, fully-elaborated example answers for the same open question — that removes the reason for the student to think.`,
  intermediate: `MODEL ANSWERS (conversation + evaluation questions only) — be sparing, most questions get none:
- Across the 9 conversation questions, give a model answer to only about 4 of them (roughly 40%) — leave the rest with an empty modelAnswers array entirely. Apply the same rough proportion to the 2 evaluation questions (usually 0 or 1 of them gets one).
- When you do include one, it must be a single OPEN sentence starter (e.g. "I think that... because...", "In my opinion..."), never a complete, fully-elaborated answer. At most one model answer per question — never two.
- Choose which questions get a starter based on which ones are harder to begin (more abstract/complex), not randomly.`,
  advanced: `MODEL ANSWERS (conversation + evaluation questions only) — do not provide any (leave modelAnswers as an empty array for every conversation and evaluation question); students at this level answer fully unprompted.`,
};

// O language game NÃO usa modelAnswers — é sempre múltipla escolha (3
// opções, 1 certa). Motivo: o formato antigo (pergunta + respostas-modelo
// abertas) ficava fácil demais ou com opções parecidas demais (as duas
// pareciam certas). Vale para todo nível; quem escala com o nível é a
// sutileza das distrações (ver LEVEL_GUIDANCE).
const LANGUAGE_GAME_GUIDANCE = `LANGUAGE GAME — always multiple choice, never open model answers:
- Each item is a short language-focused prompt (fill-in-the-blank, choose the correct word/tense/preposition, etc.) testing the vocabulary/grammar just covered.
- Provide exactly 3 answer options ("options"). Exactly ONE must be unambiguously correct ("correctIndex", 0-based). The other two must be CLEARLY wrong to anyone who knows the target grammar/vocabulary — not just a different-but-also-acceptable phrasing. Avoid near-duplicate options where two could both pass as correct.
- Make the two wrong options plausible distractors (a common mistake a learner would make: wrong verb tense, wrong preposition, confusable word) rather than random or absurd — they should require real knowledge to rule out, not be obviously silly.
- Keep each option short (a word, a short phrase, or a short full-sentence version of the prompt with the blank filled in — pick whichever reads naturally for that question).`;

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

// Perfil da turma escolhido pelo professor. Entra no prompt apenas como
// contexto leve: a IA NÃO deve trocar os temas nem infantilizar o conteúdo
// por causa da idade — o tópico do professor manda. (Uma versão anterior
// adaptava os temas por faixa etária e o resultado ficou infantil demais.)
const AGE_GUIDANCE = {
  preteens: { label: "pre-teens" },
  teens: { label: "teenagers" },
  adults: { label: "adults" },
};
const DEFAULT_AGE_GROUP = "adults";

const { waitUntil } = require("@vercel/functions");
const { recordTeacherActivity } = require("../canva-lib");
const { appendActivityLog } = require("../activity-log");
const { BOOK_CATALOG, LEVEL_DEFAULT_BOOKS } = require("../content-catalog");

const ENGLISH_LEVELS = ["basic", "intermediate", "advanced"];
const SPANISH_LEVELS = ["spanish_basic", "spanish_advanced"];
const MODEL = "claude-sonnet-5";

// Teto de buscas na web POR GERAÇÃO quando o professor marca o checkbox
// "Pesquisar na internet". Cada busca custa ~US$0,01 + tokens; 3 cobre
// pesquisa inicial + refinamento sem deixar o custo nem o tempo crescerem.
const MAX_WEB_SEARCHES = 3;

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

async function callClaude({ language, topic, level, ageGroup, useWebSearch, stages }) {
  // Os estágios (Essentials/Transitions/Fluency/Focus) são do curso de
  // inglês da FISK — não têm equivalente em espanhol, então só sorteamos
  // fontes gramaticais quando language === "english".
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
  const parsed = extractJson(text, debugInfo);

  // Force known fields and enforce the fixed counts the template needs,
  // instead of trusting the model to always get the array lengths right.
  return {
    coverTitle: parsed.coverTitle || topic,
    coverLevel: LEVEL_GUIDANCE[level].label,
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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { accessCode, language, topic, levelChoice, ageGroup, useWebSearch, teacherName, stages } = req.body || {};
  const resolvedAgeGroup = AGE_GUIDANCE[ageGroup] ? ageGroup : DEFAULT_AGE_GROUP;
  const searchEnabled = useWebSearch === true;

  if (!process.env.ACCESS_CODE || accessCode !== process.env.ACCESS_CODE) {
    res.status(401).json({ error: "Código de acesso inválido." });
    return;
  }

  if (!language || !topic || !topic.trim()) {
    res.status(400).json({ error: "Preencha idioma e tópico." });
    return;
  }

  let levels;
  if (language === "spanish") {
    // Espanhol agora também tem dois níveis (QECR): Básico B1 e Avançado
    // C1 — antes era uma única versão fixa em B1.
    if (!levelChoice) {
      res.status(400).json({ error: "Nível é obrigatório para espanhol." });
      return;
    }
    levels = levelChoice === "all_levels" ? SPANISH_LEVELS.slice() : [levelChoice];
  } else {
    if (!levelChoice) {
      res.status(400).json({ error: "Nível é obrigatório para inglês." });
      return;
    }
    levels = levelChoice === "all_levels" ? ENGLISH_LEVELS.slice() : [levelChoice];
  }

  try {
    // As chamadas rodam em PARALELO (antes eram sequenciais): com três
    // níveis, o tempo total caía fora do maxDuration e o Vercel devolvia
    // 504. Em paralelo, o tempo total é o da chamada mais lenta.
    const lessons = await Promise.all(
      levels.map((level) =>
        callClaude({ language, topic, level, ageGroup: resolvedAgeGroup, useWebSearch: searchEnabled, stages })
      )
    );

    // Keep objectives + vocabulary consistent across the whole "todos os
    // níveis" batch for one topic, so the three decks describe the same
    // lesson at different depths rather than drifting apart.
    for (let i = 1; i < lessons.length; i++) {
      lessons[i].objectives = lessons[0].objectives;
      lessons[i].vocabulary = lessons[0].vocabulary;
    }

    res.status(200).json({ lessons });

    // Contabiliza a atividade por professor (apenas estatística interna;
    // o nome não entra na aula nem no arquivo). Roda após a resposta.
    waitUntil(
      recordTeacherActivity(teacherName, lessons.length).catch((err) =>
        console.error("[stats] falha ao registrar:", err.message)
      )
    );

    // Log persistente (GitHub): quem gerou o quê e quando.
    waitUntil(
      appendActivityLog({
        teacherName,
        language: language === "spanish" ? "espanhol" : "inglês",
        levels: levels.map((lv) => LEVEL_GUIDANCE[lv].label),
        topic,
      }).catch((err) => console.error("[log] falha ao gravar:", err.message))
    );
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Falha ao gerar a aula. Tente novamente em instantes." });
  }
};
