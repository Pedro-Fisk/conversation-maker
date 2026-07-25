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

module.exports = { verifyProfToken, FISK_HUB_API };
