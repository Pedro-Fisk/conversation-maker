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
      "Basic level: simple present/past tense, short common-word vocabulary, short direct conversation questions, scaffolded model answers (short, simple sentences a beginner could produce).",
  },
  intermediate: {
    label: "Intermediate",
    prompt:
      "Intermediate level: a wider range of tenses and everyday vocabulary, conversation questions that invite a short opinion or explanation, model answers one notch more elaborate than Basic but still natural spoken English.",
  },
  advanced: {
    label: "Advanced",
    prompt:
      "Advanced level: nuanced/less common vocabulary, questions that invite critical thinking, comparison or hypothetical reasoning, model answers that are fluent and idiomatic, using varied sentence structure.",
  },
  spanish_b1: {
    label: "Spanish B1",
    prompt:
      "Spanish B1 level. Write the topic content, objectives, vocabulary words, conversation questions, language game items and evaluation questions ALL IN SPANISH (not English). Vocabulary translations must be in Brazilian Portuguese (the students are Brazilian). B1 = intermediate: everyday vocabulary, common tenses (presente, pretérito, futuro próximo), natural conversational Spanish a B1 student could both understand and answer.",
  },
};

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

const ENGLISH_LEVELS = ["basic", "intermediate", "advanced"];
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

Every conversation, language game, and evaluation question needs exactly 2 short "modelAnswers" — natural example answers a teacher could read aloud or a student could aim for. These are illustrative models, not a rigid script.

Respond with a single JSON object only, no prose, no markdown code fences, matching exactly the schema described in the user message (camelCase keys). Never add or remove array items — always exactly the counts specified above.`;

function buildUserPrompt({ language, topic, level, ageGroup, useWebSearch }) {
  const guidance = LEVEL_GUIDANCE[level];
  const age = AGE_GUIDANCE[ageGroup] || AGE_GUIDANCE[DEFAULT_AGE_GROUP];

  const searchNote = useWebSearch
    ? `\nBefore writing, use the web search tool (at most ${MAX_WEB_SEARCHES} searches) to gather recent, factual information about the topic — names, results, dates, current events. Base the lesson content on what you find. After searching, your final answer must still be ONLY the JSON object, with no citations, no commentary and no source list inside the JSON values.\n`
    : "";

  return `${searchNote}Topic: ${topic}
Level: ${guidance.label}
${guidance.prompt}

Student age group: ${age.label}. Use this ONLY as background context. Do NOT adapt, replace or soften the themes because of the students' age, and never make the content childish or cartoonish — develop the teacher's topic exactly as given, with full depth and a natural register.

Return a single JSON object with exactly these keys:
{
  "coverTitle": string,        // short, catchy lesson title built from the topic (e.g. "Discovering Japan")
  "coverLevel": "${guidance.label}",
  "topic": string,             // short topic phrase, e.g. "Japan"
  "objectives": [string, string, string],
  "vocabulary": [ { "word": string, "translation": string } ]  // exactly 8 items
  ,
  "introText": string,         // exactly one paragraph, no line breaks
  "conversation": [ { "question": string, "modelAnswers": [string, string] } ]  // exactly 9 items
  ,
  "languageGame": [ { "question": string, "modelAnswers": [string, string] } ]  // exactly 6 items
  ,
  "evaluation": [ { "question": string, "modelAnswers": [string, string] } ]  // exactly 2 items
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

async function callClaude({ language, topic, level, ageGroup, useWebSearch }) {
  const body = {
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildUserPrompt({ language, topic, level, ageGroup, useWebSearch }) },
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
    languageGame: clampArray(parsed.languageGame, 6),
    evaluation: clampArray(parsed.evaluation, 2),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { accessCode, language, topic, levelChoice, ageGroup, useWebSearch, teacherName } = req.body || {};
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
    levels = ["spanish_b1"];
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
        callClaude({ language, topic, level, ageGroup: resolvedAgeGroup, useWebSearch: searchEnabled })
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
