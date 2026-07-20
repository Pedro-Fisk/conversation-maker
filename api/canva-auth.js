/*
 * GET /api/canva-auth — autorização única da conta Canva do Pedro.
 *
 * Uso (só o administrador precisa fazer isso, UMA vez):
 *   1. Acesse /api/canva-auth?setup=SEU_ACCESS_CODE
 *   2. O endpoint redireciona para a tela de autorização do Canva (OAuth
 *      2.0 + PKCE). Aprove com a conta onde os designs devem ser salvos.
 *   3. O Canva redireciona de volta para cá com ?code=..., o endpoint troca
 *      o código por tokens e guarda no KV. Pronto: os próximos downloads de
 *      .pptx passam a ser enviados automaticamente para a pasta do Canva.
 *
 * O parâmetro `setup` (igual ao ACCESS_CODE, ou a env CANVA_SETUP_KEY se
 * definida) impede que um estranho autorize a própria conta e "sequestre"
 * o destino dos uploads.
 */

const crypto = require("crypto");
const { kvGet, kvSet, kvDel, KV_VERIFIER_KEY, exchangeAuthCode, canvaConfigured } = require("../canva-lib");

const SCOPES = "design:content:write folder:read folder:write";

function redirectUri(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `https://${host}/api/canva-auth`;
}

module.exports = async function handler(req, res) {
  if (!canvaConfigured()) {
    res
      .status(500)
      .send("Faltam env vars: CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN.");
    return;
  }

  const { code, state, setup } = req.query || {};

  // ---- Callback do Canva ----
  if (code) {
    try {
      const raw = await kvGet(KV_VERIFIER_KEY);
      if (!raw) {
        res.status(400).send("Sessão de autorização não encontrada. Recomece em /api/canva-auth?setup=...");
        return;
      }
      const saved = JSON.parse(raw);
      if (!state || state !== saved.state) {
        res.status(400).send("State inválido. Recomece a autorização.");
        return;
      }
      await exchangeAuthCode(code, saved.verifier, redirectUri(req));
      await kvDel(KV_VERIFIER_KEY);
      res
        .status(200)
        .send("✅ Canva conectado! Os próximos .pptx baixados serão copiados automaticamente para a pasta do Canva. Pode fechar esta aba.");
    } catch (err) {
      console.error(err);
      res.status(500).send(`Falha ao trocar o código por tokens: ${err.message}`);
    }
    return;
  }

  // ---- Início do fluxo ----
  const expectedKey = process.env.CANVA_SETUP_KEY || process.env.ACCESS_CODE;
  if (!expectedKey || setup !== expectedKey) {
    res.status(401).send("Acesso negado. Use /api/canva-auth?setup=SEU_CODIGO_DE_ACESSO");
    return;
  }

  const verifier = crypto.randomBytes(64).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const newState = crypto.randomBytes(32).toString("base64url");
  await kvSet(KV_VERIFIER_KEY, JSON.stringify({ verifier, state: newState }));

  const url =
    "https://www.canva.com/api/oauth/authorize?" +
    new URLSearchParams({
      code_challenge: challenge,
      code_challenge_method: "S256",
      scope: SCOPES,
      response_type: "code",
      client_id: process.env.CANVA_CLIENT_ID,
      state: newState,
      redirect_uri: redirectUri(req),
    }).toString();

  res.writeHead(302, { Location: url });
  res.end();
};
