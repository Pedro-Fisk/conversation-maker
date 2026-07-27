/*
 * fisk-auth.js
 *
 * Autenticação do professor via fisk-hub-backend (Google Apps Script).
 * O professor loga no frontend com o MESMO usuário/senha do Fisk Hub
 * (profLogin, que emite um token de sessão de 6h); cada chamada de API
 * aqui no Vercel manda esse token, e nós o validamos server-side com
 * profCheck — que também devolve o nome CANÔNICO do professor (o que
 * elimina nome digitado errado no log de produção do diretor).
 *
 * A URL é a mesma implantação do Web App usada pelo frontend do fisk-hub
 * (é pública por natureza; o segredo é a senha de cada professor).
 */

const FISK_HUB_API =
  "https://script.google.com/macros/s/AKfycbw13tpIVD3Ji9XhWW1VwDSw8qAZOmtMGPV0FI1rlHpEQ7HABumVpi_aMWQXfo7dwkd1/exec";

// Valida um token de sessão de professor. Devolve o objeto `prof`
// ({ name, escolas, fullName, cargo }) ou null se a sessão for inválida/
// expirada (ou se o Apps Script estiver fora do ar — falha fechada).
async function verifyProfToken(token) {
  if (!token) return null;
  try {
    const res = await fetch(FISK_HUB_API, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "profCheck", token: String(token) }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && data.ok && data.prof ? data.prof : null;
  } catch (err) {
    console.error("[auth] profCheck falhou:", err.message);
    return null;
  }
}

// Registra um evento do Conversation Maker (geração/recriação) na aba
// cm_eventos do fisk-hub-backend — a fonte estruturada dos indicadores e
// alertas do Painel da Direção. O evento de download é registrado pelo
// próprio salvarPptx no backend, junto do backup no Drive.
async function logCmEvent({ profToken, event, topic, language, level, ageLabel, detail }) {
  const res = await fetch(FISK_HUB_API, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "cmLogEvent",
      token: profToken,
      event,
      topic,
      language,
      level,
      ageLabel,
      detail: detail || "",
    }),
  });
  const data = await res.json().catch(() => null);
  if (!data || !data.ok) throw new Error((data && data.error) || "cmLogEvent falhou");
}

/**
 * Debita créditos do Conversation Maker (1 por aula gerada). O débito é
 * SERVER-SIDE de propósito: se ficasse na tela, bastaria o console aberto para
 * gerar à vontade — e cada geração é uma chamada paga.
 *
 * Devolve { ok:true, creditos } ou { ok:false, code:'sem_creditos', error }.
 * Falha de rede devolve ok:false: melhor recusar do que gerar de graça.
 */
async function consumirCreditosCM(profToken, quantidade) {
  try {
    const res = await fetch(FISK_HUB_API, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "cmConsumir", token: profToken, quantidade }),
    });
    if (!res.ok) return { ok: false, error: "Não deu para verificar seus créditos. Tente de novo." };
    const data = await res.json().catch(() => null);
    return data || { ok: false, error: "Resposta inválida ao verificar créditos." };
  } catch (err) {
    console.error("[creditos] falha:", err.message);
    return { ok: false, error: "Não deu para verificar seus créditos. Tente de novo." };
  }
}

module.exports = { verifyProfToken, logCmEvent, consumirCreditosCM, FISK_HUB_API };
