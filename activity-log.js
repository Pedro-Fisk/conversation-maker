/*
 * activity-log.js
 *
 * Log persistente de atividades geradas, gravado num repositório GitHub
 * (recomendado: um repositório PRIVADO só para isso, ex.:
 * Pedro-Fisk/conversation-maker-logs, já que os nomes dos professores não
 * devem ficar públicos).
 *
 * Um arquivo Markdown por mês (logs/2026-07.md), uma linha por geração:
 *   | 20/07/2026 14:32 | Teacher Ana | inglês | Intermediate | Viagem ao Japão |
 *
 * Env vars (Vercel → Settings → Environment Variables):
 *   GITHUB_LOG_REPO   — ex.: "Pedro-Fisk/conversation-maker-logs"
 *   GITHUB_LOG_TOKEN  — fine-grained personal access token com permissão
 *                       "Contents: Read and write" APENAS nesse repositório
 *
 * Sem as env vars, o log persistente fica desligado e sobra só o
 * console.log (visível por pouco tempo nos logs do Vercel). Falhas aqui
 * nunca afetam a resposta ao professor.
 */

function logConfigured() {
  return Boolean(process.env.GITHUB_LOG_REPO && process.env.GITHUB_LOG_TOKEN);
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_LOG_TOKEN}`,
    Accept: "application/vnd.github+json",
    "content-type": "application/json",
    "user-agent": "conversation-maker-logger",
  };
}

function sanitizeCell(s, max) {
  return String(s || "")
    .replace(/\|/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

async function appendActivityLog({ teacherName, language, levels, topic }) {
  const now = new Date();
  const stamp = now.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const line = `| ${stamp} | ${sanitizeCell(teacherName, 60) || "(sem nome)"} | ${sanitizeCell(
    language,
    20
  )} | ${sanitizeCell((levels || []).join(", "), 60)} | ${sanitizeCell(topic, 140)} |`;

  // Sempre loga no Vercel também (efêmero, mas ajuda a depurar).
  console.log(`[atividade] ${line}`);

  if (!logConfigured()) return;

  // Um arquivo por mês, no fuso de Brasília.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(now); // "2026-07"
  const path = `logs/${parts}.md`;
  const url = `https://api.github.com/repos/${process.env.GITHUB_LOG_REPO}/contents/${path}`;

  const header = `# Atividades geradas — ${parts}\n\n| Data | Professor | Idioma | Nível | Tópico |\n|---|---|---|---|---|\n`;

  // Lê o arquivo atual (se existir), anexa a linha e grava de volta. Em
  // caso de corrida (duas gerações no mesmo segundo), o PUT falha com 409
  // e tentamos mais uma vez com o conteúdo recarregado.
  for (let attempt = 0; attempt < 2; attempt++) {
    const getRes = await fetch(url, { headers: ghHeaders() });
    let sha = null;
    let content = header;
    if (getRes.ok) {
      const file = await getRes.json();
      sha = file.sha;
      content = Buffer.from(file.content || "", "base64").toString("utf8");
      if (!content.endsWith("\n")) content += "\n";
    } else if (getRes.status !== 404) {
      throw new Error(`GitHub GET ${path} respondeu ${getRes.status}`);
    }

    const body = {
      message: `log: ${sanitizeCell(teacherName, 60) || "(sem nome)"}`,
      content: Buffer.from(content + line + "\n", "utf8").toString("base64"),
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) });
    if (putRes.ok) return;
    if (putRes.status !== 409 && putRes.status !== 422) {
      throw new Error(`GitHub PUT ${path} respondeu ${putRes.status}: ${(await putRes.text()).slice(0, 200)}`);
    }
    // 409/422: conflito de sha — tenta de novo uma vez.
  }
  throw new Error("Não consegui gravar o log após duas tentativas (conflito).");
}

module.exports = { appendActivityLog };
