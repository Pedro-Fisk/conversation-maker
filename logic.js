/*
 * Conversation Maker — content generation logic (browser port).
 *
 * This is a JavaScript port of the Python prototype in fisk-hub's
 * conversation_maker/ package (models.py, level_rules.py, pagination.py,
 * generator.py, workflow.py), calibrated against 15 real production decks
 * (not the original abstract spec). See that package's README for the
 * full reasoning.
 *
 * generateMock() stands in for the real Claude API call, which isn't wired
 * up yet. When the API is ready, only generateMock() needs to be replaced
 * with a real fetch() to a backend endpoint — everything else (level
 * rules, pagination, the shared-objectives/vocabulary logic) stays the
 * same, because a static GitHub Pages site cannot safely call the
 * Anthropic API directly (that would expose the API key).
 */

const LEVEL_CONFIGS = {
  basic: {
    minQuestions: 6,
    maxQuestions: 8,
    includeScaffold: true,
    includeLanguageGame: true,
    maxQuestionsPerSlide: 2,
    description: "Scaffolded questions (sentence starters / answer options).",
  },
  intermediate: {
    minQuestions: 6,
    maxQuestions: 9,
    includeScaffold: true,
    includeLanguageGame: true,
    maxQuestionsPerSlide: 2,
    description: "Same scaffolding style as Basic, slightly more questions.",
  },
  advanced: {
    minQuestions: 10,
    maxQuestions: 12,
    includeScaffold: false,
    includeLanguageGame: false,
    maxQuestionsPerSlide: 4,
    description: "Fully open questions, no scaffolding, no language game.",
  },
  spanish_b1: {
    minQuestions: 6,
    maxQuestions: 8,
    includeScaffold: true,
    includeLanguageGame: true,
    maxQuestionsPerSlide: 2,
    description: "Single communicative version, Basic/Intermediate style.",
  },
};

const ENGLISH_LEVELS = ["basic", "intermediate", "advanced"];
const DEFAULT_DURATION_MINUTES = 20;
const VOCAB_WORDS_PER_SLIDE = 3;
const GAME_QUESTIONS_PER_SLIDE = 1;

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out.length ? out : [[]];
}

function titleCase(s) {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

/* ---------- mock content generation (stand-in for the Claude API) ---------- */

function generateMock({ language, topic, level, grammarPoint }) {
  const cfg = LEVEL_CONFIGS[level];
  const subtopics = ["Subtopic A", "Subtopic B", "Subtopic C"];
  const nQuestions = cfg.minQuestions;

  const groups = [];
  const perGroup = Math.max(1, Math.floor(nQuestions / subtopics.length));
  let counter = 1;
  let remaining = nQuestions;

  subtopics.forEach((subtopic, i) => {
    const take = i < subtopics.length - 1 ? perGroup : remaining;
    const questions = [];
    for (let q = 0; q < take; q++) {
      questions.push({
        number: counter,
        question: `[MOCK] ${level} question ${counter} about ${topic} (${subtopic})?`,
        answerScaffold: cfg.includeScaffold ? `[MOCK] I ... (${subtopic.toLowerCase()})` : null,
      });
      counter++;
    }
    remaining -= take;
    groups.push({ subtopic, questions });
  });

  const languageGame = cfg.includeLanguageGame
    ? [0, 1, 2].map((i) => ({
        prompt: `[MOCK] Choose the correct option for ${topic} #${i + 1}`,
        options: ["[MOCK] a", "[MOCK] b", "[MOCK] c"],
        correctAnswer: "[MOCK] a",
      }))
    : [];

  const grammarAside = grammarPoint
    ? {
        teacherInstruction: `[MOCK] Explain '${grammarPoint}' on the whiteboard.`,
        explanation: `[MOCK] short explanation of ${grammarPoint}.`,
        example: `[MOCK] example sentence using ${grammarPoint}.`,
      }
    : null;

  return {
    language,
    topic,
    level,
    coverTitle: `${titleCase(topic)} — Conversation Lesson`,
    coverSubtitle: `${titleCase(level.replace("_", " "))} level`,
    material: { activity: "Powerpoint Activity", durationMinutes: DEFAULT_DURATION_MINUTES },
    objectives: [
      `Talking about ${topic}.`,
      "Expanding vocabulary.",
      "Learning new expressions.",
    ],
    vocabulary: [1, 2, 3, 4, 5, 6].map((i) => ({
      word: `[MOCK] word${i}`,
      translation: cfg.includeScaffold ? `[MOCK] tradução${i}` : null,
      contrastWith: null,
    })),
    grammarAside,
    introTitle: `[MOCK] Introducing ${topic}`,
    introText: `[MOCK] Short intro paragraph about ${topic} for a ${level} class.`,
    videoTitle: null,
    conversationGroups: groups,
    languageGame,
    evaluation: [`[MOCK] Did you enjoy talking about ${topic}?`],
  };
}

/* ---------- pagination: LessonContent -> ordered slide plan ---------- */

function paginateVocabulary(vocabulary) {
  return chunk(vocabulary, VOCAB_WORDS_PER_SLIDE)
    .filter((c) => c.length)
    .map((words) => ({ layout: "Vocabulary", content: { words } }));
}

function paginateConversation(groups, level) {
  const maxPerSlide = LEVEL_CONFIGS[level].maxQuestionsPerSlide;
  const slides = [];
  groups.forEach((group) => {
    chunk(group.questions, maxPerSlide)
      .filter((c) => c.length)
      .forEach((qs) => {
        slides.push({ layout: "Conversation", content: { subtopic: group.subtopic, questions: qs } });
      });
  });
  return slides;
}

function paginateLanguageGame(gameQuestions) {
  return chunk(gameQuestions, GAME_QUESTIONS_PER_SLIDE)
    .filter((c) => c.length)
    .map((qs) => ({ layout: "Language Game", content: { questions: qs } }));
}

function buildSlidePlan(lesson) {
  const plan = [];

  plan.push({ layout: "Cover", content: { title: lesson.coverTitle, subtitle: lesson.coverSubtitle } });
  plan.push({ layout: "Material Needed", content: lesson.material });
  plan.push({ layout: "Objectives", content: { objectives: lesson.objectives } });
  plan.push(...paginateVocabulary(lesson.vocabulary));

  if (lesson.grammarAside) {
    plan.push({ layout: "Grammar Point", content: lesson.grammarAside });
  }

  plan.push({ layout: "Introduction Title", content: { title: lesson.introTitle } });
  plan.push({ layout: "Introduction Text", content: { text: lesson.introText } });

  if (lesson.videoTitle) {
    plan.push({ layout: "Video", content: { title: lesson.videoTitle } });
  }

  plan.push(...paginateConversation(lesson.conversationGroups, lesson.level));

  if (lesson.languageGame.length) {
    plan.push(...paginateLanguageGame(lesson.languageGame));
  }

  plan.push({ layout: "Evaluation", content: { questions: lesson.evaluation } });
  plan.push({ layout: "Closing", content: { title: lesson.coverTitle } });

  return plan;
}

/* ---------- wizard: one teacher request -> 1 or 3 lesson outputs ---------- */

function runRequest({ language, topic, levelChoice, grammarPoint }) {
  let levels;
  if (language === "spanish") {
    levels = ["spanish_b1"];
  } else {
    if (!levelChoice) throw new Error("English requests must specify a levelChoice.");
    levels = levelChoice === "all_levels" ? ENGLISH_LEVELS.slice() : [levelChoice];
  }

  const outputs = [];
  let sharedObjectives = null;
  let sharedVocabulary = null;

  levels.forEach((level) => {
    let lesson = generateMock({ language, topic, level, grammarPoint });

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

    const slidePlan = buildSlidePlan(lesson);
    outputs.push({ lesson, slidePlan });
  });

  return outputs;
}

window.ConversationMaker = { runRequest, buildSlidePlan, LEVEL_CONFIGS };
