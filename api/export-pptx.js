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

const { waitUntil } = require("@vercel/functions");
const { buildPptxBuffer } = require("../pptx-builder");
const { uploadPptxToCanva } = require("../canva-lib");

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

    // Nome do arquivo no padrão "AC - [Título] - [Nível].pptx". Mantém o
    // título legível (espaços e maiúsculas), removendo apenas acentos (o
    // header HTTP não aceita caracteres fora de latin1 com segurança) e
    // caracteres proibidos em nomes de arquivo.
    const cleanPart = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[\\/:*?"<>|]+/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const fileName = `AC - ${cleanPart(lesson.coverTitle) || "Atividade"} - ${
      cleanPart(lesson.coverLevel) || "Nivel"
    }.pptx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.status(200).send(buffer);

    // Cópia automática para o Canva (pasta "Uploads - Conversation Maker"),
    // DEPOIS de responder: waitUntil mantém a função viva sem atrasar o
    // download do professor. Falhas aqui só vão para o log, nunca para o
    // usuário.
    const designTitle = `AC - ${cleanPart(lesson.coverTitle) || "Atividade"} - ${cleanPart(lesson.coverLevel) || "Nivel"}`;
    waitUntil(
      uploadPptxToCanva(buffer, designTitle).catch((err) => console.error("[canva] upload falhou:", err.message))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Falha ao gerar o arquivo .pptx." });
  }
};
