/*
 * drive-backup.js
 *
 * Backup automático do PPTX no Google Drive da organização (CHANGES 2.8):
 * ao baixar (individual ou "Baixar Tudo"), além do download local, o
 * arquivo vai para a pasta central via fisk-hub-backend (Apps Script,
 * ação salvarPptx) — que também registra a linha na aba `cm_atividades`,
 * a mesma fonte que alimenta o histórico do professor (2.9). Não há banco
 * de dados separado.
 *
 * Cada aula (professor + tópico + nível + faixa) mantém SÓ a versão final:
 * baixar de novo substitui o arquivo anterior no Drive (2.11).
 */

const { FISK_HUB_API } = require("./fisk-auth");

async function backupPptxToDrive({ buffer, fileName, profToken, lesson, detail }) {
  const res = await fetch(FISK_HUB_API, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "salvarPptx",
      token: profToken,
      fileName,
      base64: buffer.toString("base64"),
      topic: lesson.topic || lesson.coverTitle || "",
      language: lesson.language === "spanish" ? "espanhol" : "inglês",
      level: lesson.coverLevel || "",
      ageLabel: lesson.ageLabel || "",
      // vira o "Detalhe" do evento de download no log do diretor
      // (ex.: "versão final: 2/3 (2 recriações)")
      detail: detail || "",
    }),
  });
  if (!res.ok) throw new Error(`salvarPptx respondeu ${res.status}`);
  const data = await res.json().catch(() => null);
  if (!data || !data.ok) throw new Error((data && data.error) || "salvarPptx falhou");
  return data.fileId;
}

module.exports = { backupPptxToDrive };
