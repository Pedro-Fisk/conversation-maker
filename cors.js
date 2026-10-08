/**
 * CORS para o Buddy do Fisk Hub (08/10/2026).
 *
 * As rotas de geração só eram chamadas pela própria página (mesma origem). O
 * Buddy, que mora no Hub, passou a gerar aulas pelo chat chamando
 * /api/generate-lesson e /api/export-pptx direto do navegador do professor,
 * e para isso o navegador exige estes cabeçalhos.
 *
 * Abrir a origem NÃO afrouxa a autenticação: nenhuma das duas rotas usa
 * cookie; quem entra é o profToken que vai no corpo, conferido no servidor e
 * cobrado em créditos como sempre. A lista é fechada de propósito: origem
 * que não está aqui não recebe cabeçalho nenhum.
 */
const ORIGENS_DO_HUB = ["https://pedro-fisk.github.io"];

/** Põe os cabeçalhos e responde o preflight. Devolve true quando já respondeu. */
function aplicarCors(req, res) {
  const origem = String((req.headers && req.headers.origin) || "");
  if (ORIGENS_DO_HUB.indexOf(origem) > -1) {
    res.setHeader("Access-Control-Allow-Origin", origem);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    // o nome do arquivo do .pptx vem neste cabeçalho, e sem expor o navegador não deixa ler
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

module.exports = { aplicarCors, ORIGENS_DO_HUB };
