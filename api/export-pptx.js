/*
 * Vercel serverless function: POST /api/export-pptx
 *
 * Body: { lesson, slidePlan }  — exactly what the browser already has after
 * calling /api/generate-lesson and running window.ConversationMaker.buildSlidePlan.
 * No AI call happens here, so this never spends API credits — it just turns
 * already-generated content into a real .pptx file, using pptx-builder.js.
 *
 * Returns the binary .pptx as the response body with the right headers for
 * a browser download.
 */

const { buildPptxBuffer } = require("../pptx-builder");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { lesson, slidePlan } = req.body || {};

  if (!lesson || !slidePlan || !Array.isArray(slidePlan)) {
    res.status(400).json({ error: "Faltam 'lesson' e 'slidePlan' no corpo da requisição." });
    return;
  }

  try {
    const buffer = await buildPptxBuffer(lesson, slidePlan);
    const safeName = (lesson.coverTitle || "conversation-maker")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName || "roteiro"}.pptx"`);
    res.status(200).send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Falha ao gerar o arquivo .pptx." });
  }
};
