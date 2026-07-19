/*
 * Vercel serverless function: POST /api/export-pptx
 *
 * Body: { lesson } — the same canonical lesson object /api/export-pdf takes
 * (see contract documented at the top of render-slides-html.js). No AI call
 * happens here — it just turns already-generated content into a real .pptx
 * file using pptx-builder.js, which draws on the real Canva template
 * background PNGs and the exact coordinate map shared with the PDF export.
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

  const { lesson } = req.body || {};

  if (!lesson) {
    res.status(400).json({ error: "Falta 'lesson' no corpo da requisição." });
    return;
  }

  try {
    const buffer = await buildPptxBuffer(lesson);
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
