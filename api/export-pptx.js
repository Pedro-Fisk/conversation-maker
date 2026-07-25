/*
 * Vercel serverless function: POST /api/export-pptx
 *
 * Body: { lesson, meta } — `lesson` é o objeto canônico (contrato
 * documentado no topo de render-slides-html.js). Nenhuma chamada de IA
 * acontece aqui — só transforma conteúdo já gerado num .pptx real usando
 * pptx-builder.js, que desenha sobre os PNGs de fundo do template Canva
 * real com o mesmo mapa de coordenadas do preview HTML local.
 *
 * `meta` (opcional) alimenta o log de produção do diretor: quem baixou,
 * quantas recriações a aula levou e qual versão virou a definitiva.
 *   { teacherName, event: "download", recreations, versionInfo }
 *
 * Returns the binary .pptx as the response body with the right headers for
 * a browser download.
 */

const { waitUntil } = require("@vercel/functions");
const { buildPptxBuffer } = require("../pptx-builder");
const { uploadPptxToCanva } = require("../canva-lib");
const { appendActivityLog } = require("../activity-log");
const { backupPptxToDrive } = require("../drive-backup");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { lesson, meta } = req.body || {};

  if (!lesson) {
    res.status(400).json({ error: "Falta 'lesson' no corpo da requisição." });
    return;
  }

  try {
    const buffer = await buildPptxBuffer(lesson);

    // Remove acentos (o header HTTP não aceita caracteres fora de latin1
    // com segurança) e caracteres proibidos em nomes de arquivo.
    const cleanPart = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")   // remove combining diacritics (accents)
        .replace(/[^\x20-\x7E]/g, "")      // strip any remaining non-ASCII (em-dash, curly quotes, emoji…)
        .replace(/[\\/:*?"<>|]+/g, "")     // remove filename-illegal chars
        .replace(/\s+/g, " ")
        .trim();

    // Nome do arquivo SEMPRE inclui nível e faixa etária, para não haver
    // colisão de nomes quando várias aulas do lote são baixadas juntas:
    //   Conversation_Lesson_Basico_Jovens.pptx
    // Aulas antigas (sem ageLabel) mantêm o padrão anterior
    // "AC - [Título] - [Nível].pptx".
    const compact = (s) => cleanPart(s).replace(/[^A-Za-z0-9]+/g, "");
    const fileName = lesson.ageLabel
      ? `Conversation_Lesson_${compact(lesson.coverLevel) || "Nivel"}_${compact(lesson.ageLabel) || "Faixa"}.pptx`
      : `AC - ${cleanPart(lesson.coverTitle) || "Atividade"} - ${cleanPart(lesson.coverLevel) || "Nivel"}.pptx`;

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

    // Backup automático no Drive da organização (banco central de
    // atividades + fonte do histórico do professor). Depois da resposta,
    // nunca atrasa o download; falhas só vão para o log do Vercel.
    if (meta && meta.profToken) {
      waitUntil(
        backupPptxToDrive({ buffer, fileName, profToken: meta.profToken, lesson, detail: meta.versionInfo || "" }).catch((err) =>
          console.error("[drive] backup falhou:", err.message)
        )
      );
    }

    // Log de produção: registra o download como evento próprio, com qual
    // versão virou a definitiva (após N recriações). Só a versão baixada
    // é registrada — o histórico intermediário de recriações já entrou no
    // log na hora de cada recriação.
    if (meta && meta.teacherName) {
      waitUntil(
        appendActivityLog({
          teacherName: meta.teacherName,
          language: lesson.language === "spanish" ? "espanhol" : "inglês",
          levels: [lesson.coverLevel],
          ageGroups: lesson.ageLabel ? [lesson.ageLabel] : [],
          event: "download",
          topic: lesson.topic || lesson.coverTitle,
          detail: meta.versionInfo || "",
        }).catch((err) => console.error("[log] falha ao gravar download:", err.message))
      );
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Falha ao gerar o arquivo .pptx." });
  }
};
