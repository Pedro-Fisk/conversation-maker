/*
 * Vercel serverless function: POST /api/regenerate-section
 *
 * Regenera SÓ UMA seção de uma aula já gerada (ex.: só o Language Game,
 * ou só a Introdução), sem tocar no resto — pedido do Pedro depois de ver
 * que às vezes o professor gosta de tudo, exceto uma seção específica, e
 * não devia precisar gerar a aula inteira de novo (custa mais tempo e
 * tokens, e desmancha as edições manuais já feitas nas outras seções).
 *
 * Body: { accessCode, language, topic, level, ageGroup, useWebSearch,
 *         stages, section, teacherName }
 *   - "topic" aqui deve ser o texto ORIGINAL que o professor digitou (o
 *     app.js guarda isso em lesson._genTopic no momento da geração cheia,
 *     já que lesson.topic pode ter sido encurtado pela IA).
 *   - "level" é a chave crua do nível (ex.: "basic", "spanish_advanced"),
 *     não o rótulo bonito — o app.js guarda isso em lesson.levelKey.
 *   - "section" é uma das chaves de SECTION_LABELS (ver lesson-generation.js):
 *     "objectives" | "vocabulary" | "introText" | "conversation" |
 *     "languageGame" | "evaluation".
 *
 * Returns: { [section]: <novo conteúdo> } — ex.: { "languageGame": [...] }
 * — o app.js substitui só esse campo dentro do `lesson` já em tela.
 *
 * Compartilha todo o motor de geração (níveis, respostas-modelo, fontes
 * gramaticais do Language Game) com api/generate-lesson.js via
 * ../lesson-generation.js, para nunca dessincronizar as regras entre os
 * dois endpoints.
 */

const { waitUntil } = require("@vercel/functions");
const { appendActivityLog } = require("../activity-log");
const {
  LEVEL_GUIDANCE,
  AGE_GUIDANCE,
  DEFAULT_AGE_GROUP,
  SECTION_LABELS,
  generateSection,
} = require("../lesson-generation");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { accessCode, language, topic, level, ageGroup, useWebSearch, stages, section, teacherName } =
    req.body || {};
  const resolvedAgeGroup = AGE_GUIDANCE[ageGroup] ? ageGroup : DEFAULT_AGE_GROUP;
  const searchEnabled = useWebSearch === true;

  if (!process.env.ACCESS_CODE || accessCode !== process.env.ACCESS_CODE) {
    res.status(401).json({ error: "Código de acesso inválido." });
    return;
  }

  if (!language || !topic || !topic.trim()) {
    res.status(400).json({ error: "Faltam idioma e/ou tópico para regenerar a seção." });
    return;
  }

  if (!level || !LEVEL_GUIDANCE[level]) {
    res.status(400).json({ error: "Nível inválido para regenerar a seção." });
    return;
  }

  if (!section || !SECTION_LABELS[section]) {
    res.status(400).json({ error: "Seção inválida para regenerar." });
    return;
  }

  try {
    const result = await generateSection({
      section,
      language,
      topic,
      level,
      ageGroup: resolvedAgeGroup,
      useWebSearch: searchEnabled,
      stages,
    });

    res.status(200).json(result);

    // Log leve (sem contar como "aula gerada" nas estatísticas de
    // recordTeacherActivity — isso é intencional, é só uma seção).
    waitUntil(
      appendActivityLog({
        teacherName,
        language: language === "spanish" ? "espanhol" : "inglês",
        levels: [LEVEL_GUIDANCE[level].label],
        topic: `${topic} — regenerou "${SECTION_LABELS[section]}"`,
      }).catch((err) => console.error("[log] falha ao gravar:", err.message))
    );
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Falha ao regenerar a seção. Tente novamente em instantes." });
  }
};
