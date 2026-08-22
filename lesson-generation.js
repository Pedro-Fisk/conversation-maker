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

/* ÂNCORA CEFR EM TODO NÍVEL — acrescentada em 04/08/2026.
 *
 * Antes, só Real Beginners e Teens diziam a faixa do Quadro Europeu; os
 * três níveis adultos traziam apenas o nome. E "Advanced", sozinho, tem um
 * significado universal que o modelo aplica: C1/C2. Só que o "Avançado" da
 * FISK é Fluency 1/2 e In Focus — na prática B1 indo a B2, não C1. O
 * resultado eram aulas escritas para um aluno que não existe nesta escola.
 *
 * Nome de nível é rótulo interno da escola; CEFR é a única régua que o
 * modelo interpreta igual todas as vezes. Por isso todo nível agora declara
 * a sua faixa E o seu teto. Ao criar nível novo, declare os dois. */
const LEVEL_GUIDANCE = {
  // Real Beginners e Teens compartilham a MESMA faixa linguística — pré-A1/A1 do
  // Quadro Europeu Comum. O que os separa é o enquadramento (adulto iniciante x
  // pré-adolescente), não a dificuldade do inglês. Ambos ficam sem livro
  // marcável no formulário: o Real Beginners porque a turma ainda não viu
  // nenhum, o Teens porque o curso tem apostila própria, que ainda não está
  // catalogada aqui — daí a âncora ser o descritor CEFR, e não um estágio.
  real_beginners: {
    label: "Real Beginners",
    prompt:
      "Real Beginners level: absolute beginners studying English for the very first time. Target CEFR pre-A1 (A0) moving into A1, never above A1. Stay inside pre-A1 can-do statements: greet and introduce yourself, say where you are from, numbers, colors, days, family, classroom and everyday objects, express basic likes and needs. Grammar limited to present simple at its simplest ('I am', 'I have', 'I like', 'this is'), plus can for ability. Use only high-frequency words; no idioms, no phrasal verbs, no past or future tenses. Very short and direct questions, each answerable with one or two words. Model answers must almost complete the sentence, leaving only one small piece for the student to fill in.",
  },
  teens: {
    label: "Teens",
    prompt:
      "Teens level: young learners aged 10–11 (pre-teens). Linguistically this is the SAME band as Real Beginners. Target CEFR pre-A1/A1, leaning A1, and never above A1. What changes is the framing, not the difficulty: topics, examples and names must feel relevant to a pre-teen (school, friends, games, sports, family, animals, food, routines) instead of adult or workplace contexts. Grammar limited to present simple, present continuous, can, and the most common past of 'be'/regular verbs; high-frequency vocabulary only, no idioms or phrasal verbs. Questions should be short and concrete. Model answers guide the student clearly, leaving the key content word(s) for them to supply. The Teens course uses its own coursebooks, so never reference the adult-track books (Essentials, Transitions, Fluency, In Focus).",
  },
  basic: {
    label: "Basic",
    prompt:
      "Basic level (FISK Essentials 1-2). Target CEFR A1 moving into A2, never above A2. Simple present and past tenses, short common-word vocabulary, short and direct conversation questions. No idioms, no phrasal verbs beyond the most frequent, no conditionals beyond the simplest.",
  },
  intermediate: {
    label: "Intermediate",
    prompt:
      "Intermediate level (FISK Transitions 1-2). Target CEFR A2 moving into B1, never above B1. A wider range of tenses and everyday vocabulary, conversation questions that invite a short opinion or explanation. Some very common idioms and phrasal verbs are fine; avoid low-frequency or literary vocabulary.",
  },
  advanced: {
    /* Reescrito em 04/08/2026 depois de professores relatarem que as aulas
       de Avançado ficavam boas demais em ABSTRAÇÃO para turmas de 13-14
       anos. A queixa não era o inglês — era a estrutura das perguntas, que
       exigia um raciocínio filosófico que o aluno não tem por idade, não
       por nível.
       A causa estava aqui: o prompt pedia explicitamente "critical thinking
       e raciocínio hipotético", ou seja, soldava DIFICULDADE LINGUÍSTICA e
       EXIGÊNCIA COGNITIVA num botão só. Agora "Avançado" descreve só o
       INGLÊS; a profundidade do raciocínio é decidida pela faixa etária
       (ver AGE_GUIDANCE), que é o eixo certo para isso. */
    label: "Advanced",
    prompt:
      "Advanced level (FISK Fluency 1-2 and In Focus). Target CEFR B1 moving into B2 — NEVER C1 or above. This is the top of THIS school's track, not the top of the CEFR scale: these are confident, fluent-sounding learners, not near-native ones. Use a wide range of tenses and structures, common idiomatic phrasing and everyday phrasal verbs, and vocabulary that is richer than Intermediate but still high-to-mid frequency. Do NOT use rare, literary, academic or abstract-noun-heavy vocabulary, and do not write sentences whose length or subordination would tax a B2 reader. " +
      "This level describes the ENGLISH, not the abstraction of the thinking. Questions may ask for opinion, comparison, justification and narration at length. How ABSTRACT the reasoning should be is decided by the student age group below, not by this level: an advanced teenager still deserves advanced English about concrete, lived experience.",
  },
  spanish_basic: {
    label: "Básico",
    prompt:
      "Spanish Básico level (Inmediato 1, FISK course). Target CEFR A1 moving into A2, never above A2. Write the topic content, objectives, vocabulary words, conversation questions, language game items and evaluation questions ALL IN SPANISH (not English). Vocabulary translations must be in Brazilian Portuguese (the students are Brazilian). Simple vocabulary and tenses: presente de indicativo, ser/estar, common phrases. Natural, simple conversational Spanish appropriate for Inmediato 1 learners.",
  },
  spanish_intermediate: {
    label: "Intermediário",
    prompt:
      "Spanish Intermediário level (Inmediato 2, FISK course). Target CEFR A2 moving into B1, never above B1. Write the topic content, objectives, vocabulary words, conversation questions, language game items and evaluation questions ALL IN SPANISH (not English). Vocabulary translations must be in Brazilian Portuguese (the students are Brazilian). A wider range of vocabulary and tenses: presente, pretérito indefinido, futuro próximo, common reflexive verbs. Natural conversational Spanish appropriate for Inmediato 2 learners.",
  },
  spanish_advanced: {
    label: "Avançado",
    prompt:
      "Spanish Avançado level (Inmediato 3, FISK course). Target CEFR B1 moving into B2 — NEVER C1 or above; this is the top of THIS school's track, not of the CEFR scale. Write the topic content, objectives, vocabulary words, conversation questions, language game items and evaluation questions ALL IN SPANISH (not English). Vocabulary translations must be in Brazilian Portuguese (the students are Brazilian). More complex vocabulary and structures: multiple tenses including subjuntivo, condicional, idiomatic expressions, questions that invite nuanced opinions. Fluent, natural Spanish appropriate for Inmediato 3 learners.",
  },
};

// Estilo dos "modelAnswers" por nível — reformulado a partir de apostilas
// reais do FISK. O padrão real da escola é bem mais aberto do que um
// modelo padrão: raramente dá a resposta pronta, prefere um começo de
// frase para o aluno completar, e em vários casos não dá modelo nenhum.
const ANSWER_STYLE_TIER = {
  real_beginners: "real_beginners",
  teens: "teens",
  basic: "basic",
  intermediate: "intermediate",
  advanced: "advanced",
  spanish_basic: "basic",
  spanish_intermediate: "intermediate",
  spanish_advanced: "advanced",
};

// Esta orientação vale só para "conversation" e "evaluation" (perguntas
// abertas de conversação). O "languageGame" tem seu próprio formato de
// múltipla escolha — ver LANGUAGE_GAME_GUIDANCE mais abaixo.
const ANSWER_GUIDANCE = {
  real_beginners: `MODEL ANSWERS (conversation + evaluation questions only) — Real Beginners need maximum support:
- Give a model answer to EVERY question, no exceptions.
- For yes/no or binary questions: give TWO near-complete starters, one for each side (e.g. "Yes, I ___." / "No, I ___.") — leave only the final verb or content word blank.
- For open questions: give ONE nearly-complete sentence starter that leaves only ONE word or very short expression for the student to fill in (e.g. "My name is ___.", "I like ___ because it is ___."). The student supplies only the blank.`,
  teens: `MODEL ANSWERS (conversation + evaluation questions only) — Teens need clear scaffolding:
- Give a model answer to every question.
- For yes/no or binary questions: give TWO short complete answers, one for each side (e.g. "Yes, I do." / "No, I don't.").
- For open questions: give ONE sentence starter ending in "..." that clearly guides the structure and leaves the content for the student (e.g. "My favorite subject is... because..."). Make the starter fairly complete.`,
  basic: `MODEL ANSWERS (conversation + evaluation questions only) — Basic students benefit from varied scaffolding:
- For yes/no or binary questions: give TWO complete model answers, one for each side (e.g. "Yes, I did." / "No, I didn't."). Keep them short and natural.
- For open questions (opinions, experiences, preferences): give ONE model answer, mixing styles across the activity — roughly half of the open questions get a COMPLETE sentence showing the expected structure and vocabulary (e.g. "My favorite hero is Iron Man because he is very smart."), and the other half get an INCOMPLETE sentence starter ending in "..." (e.g. "My favorite hero is... because..."). Choose whichever best helps that specific question.
- It is acceptable for a very simple question to have no model answer (empty array) when the expected response is self-evident.`,
  intermediate: `MODEL ANSWERS (conversation + evaluation questions only) — be sparing, most questions get none:
- Across the questions, give a model answer to only about 40% of them — leave the rest with an empty modelAnswers array entirely.
- When you do include one, it must be a single OPEN sentence starter (e.g. "I think that... because...", "In my opinion..."), never a complete, fully-elaborated answer. At most one model answer per question — never two.
- Choose which questions get a starter based on which ones are harder to begin (more abstract/complex), not randomly.`,
  advanced: `MODEL ANSWERS (conversation + evaluation questions only). Do not provide any (leave modelAnswers as an empty array for every conversation and evaluation question); students at this level answer fully unprompted.`,
};

// O language game NÃO usa modelAnswers — é sempre múltipla escolha (3
// opções, 1 certa). Vale para todo nível; quem escala com o nível é a
// sutileza das distrações (ver LEVEL_GUIDANCE).
const LANGUAGE_GAME_GUIDANCE = `LANGUAGE GAME — always multiple choice, never open model answers:
- Each item is a short language-focused prompt (fill-in-the-blank, choose the correct word/tense/preposition, etc.) testing the vocabulary/grammar just covered.
- Provide exactly 3 answer options ("options"). Exactly ONE must be unambiguously correct ("correctIndex", 0-based). The other two must be CLEARLY wrong to anyone who knows the target grammar/vocabulary — not just a different-but-also-acceptable phrasing. Avoid near-duplicate options where two could both pass as correct.
- Make the two wrong options plausible distractors (a common mistake a learner would make: wrong verb tense, wrong preposition, confusable word) rather than random or absurd — they should require real knowledge to rule out, not be obviously silly.
- Keep each option short (a word, a short phrase, or a short full-sentence version of the prompt with the blank filled in — pick whichever reads naturally for that question).`;

/* EMOJI DO TEMA (21/08/2026)
 *
 * Pedido do Pedro: o título da aula ganha um emoji que converse com o tema, e
 * cada divisor de seção também. Os emojis vêm em campos PRÓPRIOS, nunca
 * embutidos no título — é isso que mantém limpo o nome do arquivo baixado, que
 * é montado a partir de `coverTitle`.
 *
 * As chaves de seção são as mesmas que o slide-layouts.js/lesson-data.js
 * procuram; mudar um nome aqui sem mudar lá faz o emoji sumir em silêncio. */
const EMOJI_GUIDANCE = `EMOJIS — pick emojis that a teacher would recognise as connected to THIS lesson's topic:
- "coverEmoji": ONE single emoji that best represents the lesson topic as a whole (e.g. a lesson about Japan could use a Japanese landmark or food emoji).
- "sectionEmojis": ONE emoji for each of the six section titles, using these exact keys: objectives, vocabulary, intro, conversation, languageGame, evaluation. Each should suggest what that section does, tinted by the lesson topic when a natural connection exists; when it does not, a clean generic icon for that section is better than a forced one.
- Exactly ONE emoji per field, no text, no numbers, no repeated emoji across the six sections, and nothing that could read as violent, political or inappropriate for a classroom of any age.`;

/* Perfil da turma escolhido pelo professor.
 * O TEMA continua sendo do professor: nada aqui troca assunto, suaviza
 * conteúdo ou infantiliza — essa regra original vale e está repetida no
 * prompt. O que a faixa passa a governar (04/08/2026) é outra coisa: o
 * GRAU DE ABSTRAÇÃO das perguntas.
 * Antes daqui só viajava o rótulo ("teenagers"), sem instrução nenhuma, e
 * o nível Avançado pedia raciocínio hipotético para todo mundo. O resultado
 * foram aulas filosóficas demais para turmas de 13-14 anos — inglês certo,
 * pergunta impossível. Mesmo tema, mesmo inglês, ponto de entrada outro. */
const AGE_GUIDANCE = {
  preteens: {
    label: "pre-teens",
    ptLabel: "Pré-adolescentes",
    thinking:
      "These students are around 10-12. Keep every question CONCRETE and anchored in their own experience: what they did, saw, like, would choose, would do. Ask about facts, preferences, short stories from their life, and simple comparisons they can see. Do NOT ask them to define abstract concepts, weigh ethical dilemmas, argue a thesis, speculate about society, or reason about hypothetical worlds they have never lived in. A good question starts with Do/Did/Have you, What/Which/Who, or a simple Would you rather.",
  },
  teens: {
    label: "teenagers",
    ptLabel: "Jovens",
    thinking:
      "These students are around 13-16. They can give opinions, justify them and compare, but on things inside their world: school, friendship, family, sports, music, internet, money they handle, choices they actually face. Ask for opinion + reason ('Do you think... Why?'), personal experience, and concrete comparisons. AVOID philosophical abstraction: no defining concepts like justice, identity or freedom in the abstract; no ethical dilemmas of the trolley-problem kind; no questions about society at large, economic systems or 'the meaning of' anything. If the teacher's topic IS abstract, keep the topic and enter it through a concrete door — a personal example, a situation they have lived, a choice they would make.",
  },
  adults: {
    label: "adults",
    ptLabel: "Adultos",
    thinking:
      "These are adults. They can handle abstraction, hypothetical reasoning, comparison of viewpoints, and questions about society, work and ethics.",
  },
};
const DEFAULT_AGE_GROUP = "adults";

const { BOOK_CATALOG } = require("./content-catalog");

const ENGLISH_LEVELS = ["real_beginners", "teens", "basic", "intermediate", "advanced"];
const SPANISH_LEVELS = ["spanish_basic", "spanish_intermediate", "spanish_advanced"];
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
- 1 theme emoji for the cover, plus 1 emoji for each of the 6 section titles
- 3 objectives
- 8 vocabulary words (each with a Portuguese translation, since the students are Brazilian)
- 1 introductory paragraph (a single flowing paragraph, not a list, not multiple paragraphs)
- 9 conversation questions, organized as 3 natural subtopics of 3 questions each (do not label the subtopics in the output, just order the 9 questions so subtopics of 3 flow naturally back to back)
- 6 language game items (short language-focused challenges: fill-in-the-blank, choose the correct word/tense, etc. — testing the vocabulary/grammar just covered)
- 2 evaluation/reflection questions

Each conversation and evaluation question has a "modelAnswers"array of 0 to 2 short strings. This is NOT always 2. How many (if any), and whether they're open sentence starters or complete answers, is dictated by the MODEL ANSWERS guidance in the user message. Follow it precisely: real FISK classroom material is deliberately sparing with model answers, leaning on open sentence starters (ending in"...") rather than fully-written answers, so students have to produce their own language instead of just reading a ready-made sentence.

Each language game item is DIFFERENT: it's multiple choice, with an "options" array of exactly 3 strings and a "correctIndex" (0, 1, or 2) marking the single correct one — see the LANGUAGE GAME guidance in the user message for how to write good distractors.

Respond with a single JSON object only, no prose, no markdown code fences, matching exactly the schema described in the user message (camelCase keys). Never add or remove array items in the top-level lists — always exactly the counts specified above (modelAnswers arrays are the one exception, and vary in length per the guidance; language game "options" is always exactly 3).`;

// System prompt mais curto para api/regenerate-section.js: só UM campo do
// mesmo esquema é pedido por vez, o resto da aula já existe e não muda.
const SECTION_SYSTEM_PROMPT = `You are the content engine behind Conversation Maker, an authoring tool for language teachers at FISK. A teacher already generated a lesson and is regenerating ONE section of it — the rest of the lesson (other sections) stays exactly as it was, unchanged. A fixed, already-designed slide template handles all layout downstream; your only job is to fill in the text for the one section requested.

Respond with a single JSON object only, no prose, no markdown code fences, containing ONLY the one key requested in the user message, with exactly the item count specified.`;

/**
 * Livros CANÔNICOS de cada nível — a ÚNICA fonte do Language Game.
 * Escolher o nível já garante que o jogo caia na gramática dele: não há (nem
 * deve haver) escolha de estágio pelo professor. Cada pergunta gerada cita no
 * rodapé do slide o livro e a lição de onde veio.
 *
 * Real Beginners e Teens ficam de fora de propósito: o primeiro não viu livro
 * nenhum, o segundo usa a apostila própria do curso Teens, ainda não catalogada
 * aqui. Nesses dois a âncora é o descritor CEFR pré-A1/A1 do LEVEL_GUIDANCE, e
 * o jogo sai sem citar livro (pickGrammarSources devolve null).
 *
 * Histórico, para não reabrir sem querer: um mapeamento assim existiu, foi
 * removido no commit 32506ce em favor de o professor marcar os livros, e voltou
 * em 25/07/2026 — desta vez com a marcação manual eliminada de propósito
 * (decisão do Pedro: era complicação demais para o professor). Efeito colateral
 * conhecido e aceito: o rodapé pode citar lições que a turma ainda não viu.
 */
const BOOKS_BY_LEVEL = {
  basic: ["essentials1", "essentials2"],
  intermediate: ["transitions1", "transitions2"],
  advanced: ["fluency1", "fluency2", "focus"],
};

function pickGrammarSources(level, count) {
  const bookKeys = BOOKS_BY_LEVEL[level] || [];
  if (!bookKeys.length) return null;

  const pool = [];
  bookKeys.forEach((key) => {
    const book = BOOK_CATALOG[key];
    if (!book) return;
    book.points.forEach((point) => {
      pool.push({
        label: `${book.label} · ${point.code}`,
        promptLabel: `${book.label}, Lesson ${point.code} (${point.title})`,
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

// Versão compacta de uma aula já existente, para entrar no prompt como
// referência (aula-guia do lote) ou como versão anterior (recriação com
// feedback). Só os campos de conteúdo — nada de chaves internas (_gen*).
function compactLessonForPrompt(lesson) {
  if (!lesson) return null;
  return {
    coverTitle: lesson.coverTitle,
    coverEmoji: lesson.coverEmoji || undefined,
    sectionEmojis: lesson.sectionEmojis || undefined,
    topic: lesson.topic,
    objectives: lesson.objectives,
    vocabulary: lesson.vocabulary,
    introText: lesson.introText,
    conversation: (lesson.conversation || []).map((q) => ({
      question: q.question,
      modelAnswers: q.modelAnswers,
    })),
    languageGame: (lesson.languageGame || []).map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
    })),
    evaluation: (lesson.evaluation || []).map((q) => ({
      question: q.question,
      modelAnswers: q.modelAnswers,
    })),
    extraActivityTitle: lesson.extraActivityTitle || undefined,
    extraActivityInstructions: lesson.extraActivityInstructions || undefined,
  };
}

/**
 * Atividade pronta que o professor subiu (.pptx), já reduzida a texto no
 * navegador. NÃO é um `lesson` no formato canônico — é material bruto, então
 * entra como fonte a interpretar, e a instrução do professor é quem diz o que
 * fazer com ela ("adapta para adultos", "usa o formato mas sobre viagens").
 * A saída continua sendo uma aula nova no template FISK: nada do arquivo
 * original é reaproveitado além do conteúdo.
 */
function buildSourceActivityBlock(sourceActivity) {
  if (!sourceActivity || !sourceActivity.texto) return "";
  const instrucao = String(sourceActivity.instrucao || "").trim();
  const pedido = instrucao
    ? `The teacher's instruction about what to do with it (in Portuguese): "${instrucao}". Follow this instruction. It takes precedence over your own reading of the material.`
    : `The teacher gave no specific instruction, so build a fresh lesson on the same subject as the material below, at the level and age group requested above.`;
  return `\nEXISTING ACTIVITY UPLOADED BY THE TEACHER — Below is the text extracted from a .pptx the teacher already uses (slide by slide; images, layout and formatting were not recoverable, so judge only the content). ${pedido}
Treat it as raw material, not as a finished lesson: never copy its slides one-to-one, and always produce a complete lesson in the required JSON shape, adapted to the level and age group requested above. If the material is clearly above or below that level, rewrite it at the right depth instead of reusing its sentences.

Extracted text:
${sourceActivity.texto}
`;
}

function buildUserPrompt({ language, topic, level, ageGroup, useWebSearch, sources, transcript, extraActivity, referenceLesson, previousLesson, feedback, sourceActivity }) {
  const guidance = LEVEL_GUIDANCE[level];
  const age = AGE_GUIDANCE[ageGroup] || AGE_GUIDANCE[DEFAULT_AGE_GROUP];
  const answerGuidance = ANSWER_GUIDANCE[ANSWER_STYLE_TIER[level]] || ANSWER_GUIDANCE.intermediate;
  const sourceBlock = buildLanguageGameSourceBlock(sources);

  const searchNote = useWebSearch
    ? `\nBefore writing, use the web search tool (at most ${MAX_WEB_SEARCHES} searches) to gather recent, factual information about the topic, names, results, dates, current events. Base the lesson content on what you find. After searching, your final answer must still be ONLY the JSON object, with no citations, no commentary and no source list inside the JSON values.\n`
    : "";

  const transcriptNote = transcript
    ? `\nYOUTUBE VIDEO TRANSCRIPT. The teacher attached a YouTube video related to this lesson's topic. Use it SPARINGLY: exactly 2 of the 9 conversation questions and exactly 2 of the 6 language game items should draw directly from specific content in the video (a detail, example, or idea from the transcript). The remaining 7 conversation questions and 4 language game items must be written normally based on the teacher's topic alone, as if no video existed. Do NOT let the video dominate or replace the topic, it is a supplementary reference only. IMPORTANT: do NOT include the video URL or any link in any text field, the URL is displayed separately on its own slide.\n\nTranscript:\n${transcript.slice(0, 8000)}\n`
    : "";

  const extraActivityNote = extraActivity
    ? `\nEXTRA ACTIVITY. The teacher wants to include a specific class activity or dynamic. Their description: "${extraActivity}". Generate a short, creative title for this activity (2–5 words) as "extraActivityTitle", and clear step-by-step instructions (3–6 sentences) as "extraActivityInstructions". Instructions should be practical and cover what both the teacher and students should do.\n`
    : "";

  const extraActivitySchema = extraActivity
    ? `,\n  "extraActivityTitle": string,         // short creative title for the activity (2–5 words)\n  "extraActivityInstructions": string   // step-by-step instructions, 3–6 sentences`
    : "";

  // Geração em lote: o professor gera primeiro UMA combinação nível×faixa,
  // revisa/edita à mão, e as demais são geradas usando essa primeira aula
  // (já editada) como referência estrutural — mesma identidade de aula,
  // profundidade adaptada ao novo nível/faixa.
  const referenceNote = referenceLesson
    ? `\nREFERENCE LESSON. The teacher already generated (and hand-edited) this SAME lesson for a different level/age group, and is now generating it for the level and age group requested above. Use the reference below as the structural and thematic guide: keep the same lesson identity, same subject angle, same flow of subtopics, and preserve the spirit of any question or content the teacher added by hand (e.g. questions about specific characters or a monthly cross-cutting theme). Adapt depth, vocabulary, grammar and register to the level and age group requested above, do NOT copy sentences verbatim when the level differs; rewrite them at the right depth.\n\nReference lesson JSON:\n${JSON.stringify(compactLessonForPrompt(referenceLesson))}\n`
    : "";

  // Recriação: o professor rejeitou a versão anterior e descreveu no modal
  // o que quer mudar. A versão anterior + o feedback entram no prompt.
  const feedbackNote = feedback && previousLesson
    ? `\nTEACHER FEEDBACK. The teacher was NOT satisfied with the previous version of this lesson and asked for a new one. Their feedback (in Portuguese): "${feedback}". Write a completely fresh version of the lesson that clearly applies this feedback, keep what the feedback doesn't complain about, change what it does.\n\nPrevious version JSON (for reference of what to change):\n${JSON.stringify(compactLessonForPrompt(previousLesson))}\n`
    : "";

  /* ESPANHOL: a instrução de escrever em espanhol vivia dentro de cada nível
     (LEVEL_GUIDANCE) e LISTAVA os campos, um a um. O que não estava na lista
     saía em inglês por omissão — era o caso do título da capa, do parágrafo de
     introdução e da dinâmica extra. Agora a regra é global e vale para todo
     campo, inclusive os que forem criados depois. */
  const espanholNote = language === "spanish"
    ? `\nLANGUAGE OF THE OUTPUT: write EVERY text field in SPANISH — including coverTitle, topic, objectives, introText, all questions, all options, all model answers and, when present, extraActivityTitle and extraActivityInstructions. The ONLY exception is the vocabulary "translation" field, which must be in BRAZILIAN PORTUGUESE, because the students are Brazilian. Do not leave any field in English.\n`
    : "";

  const sourceNote = buildSourceActivityBlock(sourceActivity);
  // Sem tópico digitado só é válido quando há atividade subida: aí o tema sai
  // dela, e dizer isso explicitamente evita a IA inventar um assunto qualquer.
  const topicLine = (topic && String(topic).trim())
    ? `Topic: ${topic}`
    : "Topic: not given, take the subject from the uploaded activity above.";

  return `${espanholNote}${searchNote}${transcriptNote}${extraActivityNote}${sourceNote}${referenceNote}${feedbackNote}${topicLine}
Level: ${guidance.label}
${guidance.prompt}

Student age group: ${age.label}.
The TOPIC is the teacher's and does not change: do NOT replace or soften the theme because of the students' age, never make the content childish or cartoonish, and keep a natural register with full depth.
What the age DOES decide is how abstract the QUESTIONS are — this is the difference between a hard question and an impossible one:
${age.thinking}

${answerGuidance}

EVALUATION QUESTIONS — exactly 2 questions total, mixing two types:
1. ONE question about the lesson topic itself (opinion, reflection, or favourite moment related to the theme).
2. ONE metacognition question where the student reflects on their OWN learning and participation in today's activity. Examples: "What new word did you learn today that you want to remember?", "From 0 to 10, how would you rate your own participation in today's conversation? Why?", "How do you feel about your pronunciation today?", "What would you like to practice more after this activity?". Write it naturally and age-appropriately; do not repeat the same metacognition question across lessons — vary the angle each time.

${LANGUAGE_GAME_GUIDANCE}

${EMOJI_GUIDANCE}
${sourceBlock}
Return a single JSON object with exactly these keys:
{
  "coverTitle": string,        // short, catchy lesson title built from the topic (e.g. "Discovering Japan") — NO emoji inside this string, the emoji goes in coverEmoji
  "coverEmoji": string,        // exactly ONE emoji representing the topic
  "sectionEmojis": { "objectives": string, "vocabulary": string, "intro": string, "conversation": string, "languageGame": string, "evaluation": string },  // exactly ONE emoji each
  "coverLevel": "${guidance.label}",
  "topic": string,             // short topic phrase, e.g. "Japan"
  "objectives": [string, string, string],
  "vocabulary": [ { "word": string, "translation": string } ]  // exactly 8 items
  ,
  "introText": string,         // exactly one paragraph, no line breaks, maximum 100 words — NEVER include URLs, links, or references to external content
  "conversation": [ { "question": string, "modelAnswers": string[] } ]  // exactly 9 items; modelAnswers has 0-2 items per the MODEL ANSWERS guidance above
  ,
  "languageGame": [ { "question": string, "options": [string, string, string], "correctIndex": number } ]  // exactly 6 items; options is always exactly 3, correctIndex is 0, 1 or 2 — see LANGUAGE GAME guidance above
  ,
  "evaluation": [ { "question": string, "modelAnswers": string[] } ]  // exactly 2 items: item 0 = topic question, item 1 = metacognition question; modelAnswers per MODEL ANSWERS guidance above${extraActivitySchema}
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

Student age group: ${age.label}.
Do not adapt, replace or soften the CONTENT because of the students' age. The age decides only how abstract the questions may be:
${age.thinking}
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

/* A IA às vezes devolve "🗾 Japan", "emoji: 🗾" ou dois emojis colados no
 * mesmo campo. Como isso vai direto para o slide, o valor é reduzido aqui ao
 * PRIMEIRO grupo de grafemas, e só se ele for mesmo um pictograma — texto solto
 * no lugar do emoji é descartado (o slide simplesmente sai sem emoji, que é
 * melhor do que sair com a palavra "emoji" no título). */
const RE_PICTOGRAMA = /\p{Extended_Pictographic}/u;

function primeiroEmoji(valor) {
  const texto = String(valor || "").trim();
  if (!texto || !RE_PICTOGRAMA.test(texto)) return "";
  try {
    // grafema, e não caractere: 🏙️ e 👩‍🏫 têm mais de um code point
    const segmentador = new Intl.Segmenter("pt", { granularity: "grapheme" });
    const primeiro = segmentador.segment(texto)[Symbol.iterator]().next().value;
    const grafema = primeiro ? primeiro.segment : "";
    return RE_PICTOGRAMA.test(grafema) ? grafema : "";
  } catch (err) {
    return Array.from(texto)[0] || "";
  }
}

const CHAVES_DE_SECAO = ["objectives", "vocabulary", "intro", "conversation", "languageGame", "evaluation"];

function sanearEmojisDeSecao(bruto) {
  const entrada = bruto && typeof bruto === "object" ? bruto : {};
  const saida = {};
  CHAVES_DE_SECAO.forEach((chave) => {
    const emoji = primeiroEmoji(entrada[chave]);
    if (emoji) saida[chave] = emoji;
  });
  return saida;
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

async function generateFullLesson({ language, topic, level, ageGroup, useWebSearch, transcript, extraActivity, referenceLesson, previousLesson, feedback, sourceActivity }) {
  const sources = language === "english" ? pickGrammarSources(level, 6) : null;

  const body = {
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildUserPrompt({ language, topic, level, ageGroup, useWebSearch, sources, transcript, extraActivity, referenceLesson, previousLesson, feedback, sourceActivity }) },
    ],
  };
  if (useWebSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_WEB_SEARCHES }];
  }

  const parsed = await callAnthropicRaw(body);

  return {
    coverTitle: parsed.coverTitle || topic,
    // campos próprios de propósito: o nome do arquivo baixado sai de
    // coverTitle, e emoji em nome de arquivo dá dor de cabeça
    coverEmoji: primeiroEmoji(parsed.coverEmoji),
    sectionEmojis: sanearEmojisDeSecao(parsed.sectionEmojis),
    coverLevel: LEVEL_GUIDANCE[level].label,
    // Chave "crua" do nível (ex.: "basic"), diferente do rótulo bonito
    // acima — precisa viajar de volta ao regenerar uma seção depois.
    levelKey: level,
    // Faixa etária: chave crua + rótulo pt-BR. O rótulo aparece no header
    // do carrossel ("BÁSICO · JOVENS") e no nome do arquivo exportado
    // (Conversation_Lesson_Basico_Jovens.pptx).
    ageKey: AGE_GUIDANCE[ageGroup] ? ageGroup : DEFAULT_AGE_GROUP,
    ageLabel: (AGE_GUIDANCE[ageGroup] || AGE_GUIDANCE[DEFAULT_AGE_GROUP]).ptLabel,
    language,
    topic: parsed.topic || topic,
    objectives: clampArray(parsed.objectives, 3),
    vocabulary: clampArray(parsed.vocabulary, 8),
    introText: parsed.introText || "",
    conversation: clampArray(parsed.conversation, 9),
    languageGame: attachLanguageGameSources(clampLanguageGame(parsed.languageGame, 6), sources),
    evaluation: clampArray(parsed.evaluation, 2),
    extraActivityTitle: extraActivity ? (parsed.extraActivityTitle || null) : null,
    extraActivityInstructions: extraActivity ? (parsed.extraActivityInstructions || null) : null,
  };
}

// Regenera SÓ uma seção (usado por api/regenerate-section.js), sem tocar
// no resto da aula. Retorna só a chave pedida, ex.: { languageGame: [...] }.
async function generateSection({ section, language, topic, level, ageGroup, useWebSearch }) {
  if (!SECTION_LABELS[section]) {
    throw new Error(`Seção inválida: ${section}`);
  }

  const sources = section === "languageGame" && language === "english" ? pickGrammarSources(level, 6) : null;

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
  BOOKS_BY_LEVEL,
  pickGrammarSources,   // exportado para teste: é o que garante a gramática do nível
  LEVEL_GUIDANCE,
  AGE_GUIDANCE,
  buildUserPrompt,      // exportado para teste: é o prompt que decide a aula
  primeiroEmoji,        // exportado para teste: é o que barra "emoji: 🗾" no slide
  DEFAULT_AGE_GROUP,
  ENGLISH_LEVELS,
  SPANISH_LEVELS,
  SECTION_LABELS,
  generateFullLesson,
  generateSection,
};
