/*
 * Vercel serverless function: POST /api/generate-lesson
 *
 * Body: { accessCode, language, topic, levelChoice, grammarPoint }
 * Returns: { lessons: [ ...LessonContent ] }  (1 lesson, or 3 for "all_levels")
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
 * LEVEL_CONFIGS below is a duplicate of the one in ../logic.js (which
 * runs in the browser and can't easily share a module with this Node
 * function without a bundler). Keep the two in sync if the level rules
 * change.
 */

const LEVEL_CONFIGS = {
  basic: {
    minQuestions: 6,
    maxQuestions: 8,
    includeScaffold: true,
    includeLanguageGame: true,
    description: "Scaffolded questions (sentence starters / answer options).",
  },
  intermediate: {
    minQuestions: 6,
    maxQuestions: 9,
    includeScaffold: true,
    includeLanguageGame: true,
    description: "Same scaffolding style as Basic, slightly more questions.",
  },
  advanced: {
    minQuestions: 10,
    maxQuestions: 12,
    includeScaffold: false,
    includeLanguageGame: false,
    description: "Fully open questions, no scaffolding, no language game.",
  },
  spanish_b1: {
    minQuestions: 6,
    maxQuestions: 8,
    includeScaffold: true,
    includeLanguageGame: true,
    description: "Single communicative version, Basic/Intermediate style.",
  },
};

const ENGLISH_LEVELS = ["basic", "intermediate", "advanced"];
const DEFAULT_DURATION_MINUTES = 20;
const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You are the content engine behind Conversation Maker, an authoring tool for language teachers at FISK. You generate ONLY slide content as structured JSON — you never design or lay out slides, that is handled by a fixed template downstream.

Structure to fill, in this fixed order: Cover, Material Needed, Objectives (exactly 3, describing the lesson regardless of level), Vocabulary (word list, with Portuguese translations for Basic/Intermediate, without translations for Advanced), an OPTIONAL Grammar Point block (INCLUDE IT ONLY IF the teacher explicitly supplied a grammar point in the request — never invent one yourself), Introduction (title + short paragraph), Conversation (questions grouped by subtopic, e.g. FOOD, SHOPPING, TRAVEL), an OPTIONAL Language Game (multiple-choice quiz, only for Basic/Intermediate), and Evaluation (1-3 reflection questions).

Level behavior:
- Basic and Intermediate: every conversation question includes a short answerScaffold (a sentence starter or 2-3 answer options), and a Language Game section is included.
- Advanced: conversation questions are fully open, no answerScaffold, no Language Game, and roughly 10-12 questions with more depth/critical thinking than Basic/Intermediate's 6-9.

Respond with a single JSON object only, no prose, no markdown code fences, matching exactly the schema described in the user message (camelCase keys).`;

function buildUserPrompt({ language, topic, level, grammarPoint }) {
  const cfg = LEVEL_CONFIGS[level];
  const grammarLine = grammarPoint
    ? `The teacher wants a Grammar Point block on: ${grammarPoint}.`
    : "Do NOT include a Grammar Point block (return grammarAside: null).";

  return `Language: ${language}
Topic: ${topic}
Level: ${level} (${cfg.description})
${grammarLine}

Generate ${cfg.minQuestions}-${cfg.maxQuestions} conversation questions, grouped by subtopic. ${
    cfg.includeScaffold
      ? "Include answerScaffold for every question."
      : "No answerScaffold — open questions only (use null)."
  }
${cfg.includeLanguageGame ? "Include a languageGame (3-5 multiple-choice questions, 3 options each)." : "No languageGame for this level (return []) ."}

Return a single JSON object with exactly these keys:
{
  "coverTitle": string,
  "coverSubtitle": string,
  "material": { "activity": string, "durationMinutes": number },
  "objectives": [string, string, string],
  "vocabulary": [{ "word": string, "translation": string|null, "contrastWith": string|null }],
  "grammarAside": { "teacherInstruction": string, "explanation": string, "example": string|null } | null,
  "introTitle": string,
  "introText": string,
  "videoTitle": null,
  "conversationGroups": [{ "subtopic": string, "questions": [{ "number": number, "question": string, "answerScaffold": string|null }] }],
  "languageGame": [{ "prompt": string, "options": [string, string, string], "correctAnswer": string }],
  "evaluation": [string]
}`;
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("A resposta da IA não continha um JSON válido.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function callClaude({ language, topic, level, grammarPoint }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt({ language, topic, level, grammarPoint }) }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API respondeu ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = (data.content && data.content[0] && data.content[0].text) || "";
  const parsed = extractJson(text);

  // Force known fields instead of trusting the model's echo, and enforce
  // the "never invent a grammar point" rule at the code level too.
  parsed.language = language;
  parsed.topic = topic;
  parsed.level = level;
  parsed.grammarAside = grammarPoint ? parsed.grammarAside || null : null;
  parsed.material = parsed.material || { activity: "Powerpoint Activity", durationMinutes: DEFAULT_DURATION_MINUTES };
  parsed.vocabulary = parsed.vocabulary || [];
  parsed.conversationGroups = parsed.conversationGroups || [];
  parsed.languageGame = LEVEL_CONFIGS[level].includeLanguageGame ? parsed.languageGame || [] : [];
  parsed.evaluation = parsed.evaluation || [];

  return parsed;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { accessCode, language, topic, levelChoice, grammarPoint } = req.body || {};

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
      const lesson = await callClaude({ language, topic, level, grammarPoint: grammarPoint || null });

      if (sharedObjectives === null) {
        sharedObjectives = lesson.objectives;
        sharedVocabulary = lesson.vocabulary;
      } else {
        const cfg = LEVEL_CONFIGS[level];
        lesson.objectives = sharedObjectives.slice();
        lesson.vocabulary = sharedVocabulary.map((v) => ({
          ...v,
          translation: cfg.includeScaffold ? v.translation : null,
        }));
      }

      lessons.push(lesson);
    }

    res.status(200).json({ lessons });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Falha ao gerar a aula. Tente novamente em instantes." });
  }
};
