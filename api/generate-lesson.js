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

// Perfil da turma escolhido pelo professor. Ajusta tom, contextos e o
// estilo do language game — sem mudar a estrutura fixa do template.
const AGE_GUIDANCE = {
  preteens: {
    label: "Pré-adolescentes",
    prompt:
      "Audience: pre-teens (roughly ages 10-13). Keep everything playful, light and fun. Use concrete, familiar contexts from a kid's world (school, games, animals, cartoons, sports, family outings, hobbies). Avoid heavy, abstract, corporate or adult themes. The language game especially must feel like an enjoyable game — clever, engaging and rewarding to play, not a dry grammar drill. Keep sentences short and friendly.",
  },
  teens: {
    label: "Jovens",
    prompt:
      "Audience: teenagers. Use themes that genuinely interest adolescents: friendships and social life, music, social media and technology, sports, movies and series, school life, dreams and future plans, identity and self-expression. Keep the register current and relatable without being childish.",
  },
  adults: {
    label: "Adultos",
    prompt:
      "Audience: adults. Focus on adult-relevant contexts: work and careers, business and the corporate world, professional situations (meetings, negotiations, networking), family and household life, travel, personal finance and everyday adult responsibilities. Keep the register mature and practical.",
  },
};
const DEFAULT_AGE_GROUP = "adults";

const ENGLISH_LEVELS = ["basic", "intermediate", "advanced"];
const MODEL = "claude-sonnet-5";

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

function buildUserPrompt({ language, topic, level, ageGroup }) {
  const guidance = LEVEL_GUIDANCE[level];
  const age = AGE_GUIDANCE[ageGroup] || AGE_GUIDANCE[DEFAULT_AGE_GROUP];

  return `Topic: ${topic}
Level: ${guidance.label}
${guidance.prompt}

Student audience: ${age.label}
${age.prompt}
Adapt the topic treatment, vocabulary choices, conversation questions, the language game and the model answers so they fit this audience naturally. Keep the fixed structure and counts unchanged.

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

async function callClaude({ language, topic, level, ageGroup }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt({ language, topic, level, ageGroup }) }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API respondeu ${response.status}: ${errText.slice(0, 500)}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  const text = (textBlock && textBlock.text) || "";
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

  const { accessCode, language, topic, levelChoice, ageGroup } = req.body || {};
  const resolvedAgeGroup = AGE_GUIDANCE[ageGroup] ? ageGroup : DEFAULT_AGE_GROUP;

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
    const lessons = [];
    let sharedObjectives = null;
    let sharedVocabulary = null;

    for (const level of levels) {
      const lesson = await callClaude({ language, topic, level, ageGroup: resolvedAgeGroup });

      // Keep objectives + vocabulary consistent across the whole "todos os
      // níveis" batch for one topic, so the three decks describe the same
      // lesson at different depths rather than drifting apart.
      if (sharedObjectives === null) {
        sharedObjectives = lesson.objectives;
        sharedVocabulary = lesson.vocabulary;
      } else {
        lesson.objectives = sharedObjectives;
        lesson.vocabulary = sharedVocabulary;
      }

      lessons.push(lesson);
    }

    res.status(200).json({ lessons });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Falha ao gerar a aula. Tente novamente em instantes." });
  }
};
