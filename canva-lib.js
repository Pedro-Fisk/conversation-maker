/*
 * canva-lib.js
 *
 * Integração server-side com o Canva Connect API + armazenamento de tokens
 * e estatísticas num Upstash Redis (REST).
 *
 * Fluxo do upload automático (chamado por api/export-pptx.js após o
 * download): renova o access token se preciso → garante que a pasta
 * CANVA_FOLDER_NAME existe → cria um design import job com o .pptx →
 * espera o job concluir → move o(s) design(s) para a pasta.
 *
 * Env vars necessárias (Vercel → Settings → Environment Variables):
 *   CANVA_CLIENT_ID / CANVA_CLIENT_SECRET  — da integração no
 *     portal de desenvolvedor do Canva (www.canva.com/developers)
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — banco KV
 *     usado para os tokens OAuth (que rotacionam a cada refresh, então
 *     não podem viver em env var) e para as estatísticas de professores.
 *   CANVA_FOLDER_NAME (opcional) — default "Uploads - Conversation Maker"
 *
 * Se qualquer env var faltar, tudo aqui falha de forma silenciosa e
 * logada: o download do professor nunca é bloqueado por causa do Canva.
 */

const FOLDER_NAME = process.env.CANVA_FOLDER_NAME || "Uploads - Conversation Maker";

const KV_TOKENS_KEY = "cm:canva:tokens";
const KV_FOLDER_KEY = "cm:canva:folder-id";
const KV_VERIFIER_KEY = "cm:canva:oauth-verifier";
const KV_STATS_KEY = "cm:stats:teachers";

// ---------- Upstash Redis (REST) ----------

function kvConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function kvCommand(commandArr) {
  const res = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(commandArr),
  });
  if (!res.ok) throw new Error(`Upstash respondeu ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.result;
}

const kvGet = (key) => kvCommand(["GET", key]);
const kvSet = (key, value) => kvCommand(["SET", key, value]);
const kvDel = (key) => kvCommand(["DEL", key]);
const kvHIncrBy = (key, field, n) => kvCommand(["HINCRBY", key, field, String(n)]);
const kvHGetAll = (key) => kvCommand(["HGETALL", key]);

// ---------- OAuth ----------

function canvaConfigured() {
  return Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET && kvConfigured());
}

function basicAuthHeader() {
  const creds = Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString("base64");
  return `Basic ${creds}`;
}

async function tokenRequest(params) {
  const res = await fetch("https://api.canva.com/rest/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Canva token endpoint ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

async function storeTokens(data) {
  const record = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    // margem de 60s para nunca usar um token no limite da expiração
    expires_at: Date.now() + (data.expires_in || 3600) * 1000 - 60000,
  };
  await kvSet(KV_TOKENS_KEY, JSON.stringify(record));
  return record;
}

async function exchangeAuthCode(code, codeVerifier, redirectUri) {
  const data = await tokenRequest({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });
  return storeTokens(data);
}

async function getAccessToken() {
  const raw = await kvGet(KV_TOKENS_KEY);
  if (!raw) throw new Error("Canva não autorizado ainda: visite /api/canva-auth para conectar a conta.");
  let tokens = JSON.parse(raw);
  if (Date.now() >= tokens.expires_at) {
    // Refresh tokens do Canva rotacionam: o novo par substitui o antigo no KV.
    const data = await tokenRequest({ grant_type: "refresh_token", refresh_token: tokens.refresh_token });
    tokens = await storeTokens(data);
  }
  return tokens.access_token;
}

// ---------- Canva REST helpers ----------

async function canvaFetch(accessToken, path, options = {}) {
  const res = await fetch(`https://api.canva.com/rest/v1${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Canva ${path} respondeu ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

// Encontra (ou cria) a pasta de destino e memoriza o ID no KV.
async function ensureFolder(accessToken) {
  const cached = await kvGet(KV_FOLDER_KEY);
  if (cached) return cached;

  let continuation = null;
  do {
    const qs = new URLSearchParams({ item_types: "folder" });
    if (continuation) qs.set("continuation", continuation);
    const page = await canvaFetch(accessToken, `/folders/root/items?${qs.toString()}`);
    for (const item of page.items || []) {
      const folder = item.folder || item;
      if (folder && folder.name === FOLDER_NAME && folder.id) {
        await kvSet(KV_FOLDER_KEY, folder.id);
        return folder.id;
      }
    }
    continuation = page.continuation || null;
  } while (continuation);

  const created = await canvaFetch(accessToken, "/folders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, parent_folder_id: "root" }),
  });
  const id = created.folder && created.folder.id;
  if (!id) throw new Error("Não consegui criar a pasta no Canva.");
  await kvSet(KV_FOLDER_KEY, id);
  return id;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * Importa o buffer .pptx como design no Canva e move para a pasta.
 * `title` vira o nome do design (máx. 50 chars no Canva).
 */
async function uploadPptxToCanva(buffer, title) {
  if (!canvaConfigured()) {
    console.log("[canva] env vars ausentes; upload ignorado.");
    return;
  }
  const accessToken = await getAccessToken();
  const folderId = await ensureFolder(accessToken);

  const job = await canvaFetch(accessToken, "/imports", {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
      "Import-Metadata": JSON.stringify({
        title_base64: Buffer.from(String(title).slice(0, 50), "utf8").toString("base64"),
        mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    },
    body: buffer,
  });

  // Espera o job concluir (o import de um deck de 18 páginas leva alguns
  // segundos). Tenta por até ~60s.
  let status = job.job;
  for (let i = 0; i < 30 && status.status === "in_progress"; i++) {
    await sleep(2000);
    const check = await canvaFetch(accessToken, `/imports/${status.id}`);
    status = check.job;
  }

  if (status.status !== "success") {
    throw new Error(`Import do Canva não concluiu: ${JSON.stringify(status.error || status.status).slice(0, 200)}`);
  }

  for (const design of (status.result && status.result.designs) || []) {
    await canvaFetch(accessToken, "/folders/move", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to_folder_id: folderId, item_id: design.id }),
    });
  }
  console.log(`[canva] "${title}" importado e movido para "${FOLDER_NAME}".`);
}

// ---------- Estatísticas de professores ----------

async function recordTeacherActivity(teacherName, count) {
  if (!kvConfigured()) return;
  const name = String(teacherName || "").trim() || "(sem nome)";
  await kvHIncrBy(KV_STATS_KEY, name, count || 1);
}

async function getTeacherStats() {
  if (!kvConfigured()) return {};
  const flat = (await kvHGetAll(KV_STATS_KEY)) || [];
  // HGETALL via REST volta como array [campo, valor, campo, valor, ...]
  const out = {};
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = Number(flat[i + 1]);
  return out;
}

module.exports = {
  canvaConfigured,
  kvConfigured,
  kvGet,
  kvSet,
  kvDel,
  KV_VERIFIER_KEY,
  exchangeAuthCode,
  uploadPptxToCanva,
  recordTeacherActivity,
  getTeacherStats,
};
