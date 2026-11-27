/*
 * A PRÉVIA DA CAPA (Pedro, 27/11/2026): só a receita do visual do tema (paleta, fontes, fundo, ícones), num pedido
 * pequeno e rápido (generateDesign, em lesson-generation.js). O navegador desenha a capa com o desenhista do portal
 * (fisk-hub/assets/tema-slides.js) e a geração reaproveita a mesma receita: a prévia É o resultado.
 *
 * NÃO cobra crédito: é um pedido pequeno, e o professor pode pedir "outro visual" quantas vezes quiser. O freio é a
 * sessão do Hub (profToken conferido no servidor) e um teto por pessoa e por hora, guardado na memória da função (é
 * só para segurar um laço; a função reinicia e o teto zera, o que está bem).
 */
const { verifyProfToken } = require("../fisk-auth");
const { aplicarCors } = require("../cors");
const { generateDesign, LEVEL_GUIDANCE } = require("../lesson-generation");

const TETO_HORA = 40;
const usos = new Map();

module.exports = async function handler(req, res) {
  if (aplicarCors(req, res)) return;
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  const { profToken, topic, language, level, visual } = req.body || {};
  const prof = profToken ? await verifyProfToken(profToken) : null;
  if (!prof) { res.status(401).json({ error: "Sessão expirada. Entre novamente." }); return; }
  if (!topic || !String(topic).trim()) { res.status(400).json({ error: "Escreva o tema primeiro." }); return; }
  const quem = String(prof.fullName || prof.name || "?"), hora = Math.floor(Date.now() / 3600e3), k = quem + "|" + hora;
  const n = (usos.get(k) || 0) + 1; usos.set(k, n);
  if (n > TETO_HORA) { res.status(429).json({ error: "Muitas prévias nesta hora. Tente daqui a pouco." }); return; }
  try {
    const design = await generateDesign({
      topic: String(topic).slice(0, 600),
      language: language === "spanish" ? "spanish" : "english",
      level: LEVEL_GUIDANCE && LEVEL_GUIDANCE[level] ? level : "basic",
      visual: visual ? String(visual).slice(0, 300) : null,
    });
    res.status(200).json({ ok: true, design });
  } catch (e) {
    res.status(200).json({ ok: false, error: "Não consegui preparar a prévia agora.", detalhe: String(e && e.message || e).slice(0, 200) });
  }
};
