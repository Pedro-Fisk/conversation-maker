/*
 * Vercel serverless function: POST /api/rewrite-pptx
 *
 * Reescreve os textos de uma atividade que o professor já usa, MANTENDO o
 * design do arquivo dele. É o par servidor do pptx-rewriter.js, que roda no
 * navegador.
 *
 * Body: { profToken, estrutura, instrucao, language, level, ageGroup }
 *   - "estrutura" é o texto do arquivo já extraído NO NAVEGADOR
 *     (PptxRewriter.paraPrompt): slides, caixas e parágrafos com um id cada.
 * Returns: { textos: { id: "texto novo" }, resumo, ignorados, creditos }
 *
 * O ARQUIVO NUNCA CHEGA AQUI. Sobe só o texto, alguns KB, e o .pptx novo é
 * montado de volta no navegador do professor. Isso não é detalhe de
 * eficiência: um .pptx com imagens passa fácil dos 4,5 MB que a Vercel
 * aceita no corpo da requisição, e o material dele não precisa transitar por
 * servidor nenhum para o trabalho ser feito.
 *
 * Créditos: 1 por reescrita, cobrado antes da chamada à IA e devolvido se
 * ela falhar — mesmo mecanismo de tíquete do generate-lesson.js.
 */

const { waitUntil } = require("@vercel/functions");
const { appendActivityLog } = require("../activity-log");
const { verifyProfToken, logCmEvent, consumirCreditosCM, estornarCreditosCM } = require("../fisk-auth");
const { LEVEL_GUIDANCE, AGE_GUIDANCE, DEFAULT_AGE_GROUP } = require("../lesson-generation");
const { reescreverAtividade, medirEstrutura, MAX_CHARS, MAX_PARAGRAFOS } = require("../rewrite-generation");

/**
 * A estrutura vem do navegador, então o formato tem de ser conferido aqui:
 * quem manda o corpo é o cliente, e um objeto fora do esperado viraria erro
 * no meio da montagem do prompt.
 */
function sanearEstrutura(bruta) {
  if (!Array.isArray(bruta)) return null;
  const slides = [];
  bruta.slice(0, 200).forEach((slide) => {
    if (!slide || !Array.isArray(slide.caixas)) return;
    const caixas = [];
    slide.caixas.slice(0, 60).forEach((caixa) => {
      if (!caixa || !Array.isArray(caixa.textos)) return;
      const textos = caixa.textos
        .filter((t) => t && typeof t.id === "string" && typeof t.texto === "string")
        .slice(0, 80)
        .map((t) => ({ id: t.id.slice(0, 40), texto: t.texto.slice(0, 2000) }));
      if (textos.length) {
        caixas.push({
          nome: typeof caixa.nome === "string" ? caixa.nome.slice(0, 80) : undefined,
          titulo: caixa.titulo === true || undefined,
          cm: typeof caixa.cm === "string" ? caixa.cm.slice(0, 20) : undefined,
          textos,
        });
      }
    });
    if (caixas.length) slides.push({ slide: Number(slide.slide) || slides.length + 1, caixas });
  });
  return slides.length ? slides : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { profToken, estrutura, instrucao, language, level, ageGroup, arquivo } = req.body || {};

  if (!profToken) {
    res.status(401).json({ error: "Entre pelo Fisk Hub para usar esta ferramenta." });
    return;
  }
  const prof = await verifyProfToken(profToken);
  if (!prof) {
    res.status(401).json({ error: "Sessão expirada. Entre novamente." });
    return;
  }
  const professor = prof.fullName || prof.name;

  const limpa = sanearEstrutura(estrutura);
  if (!limpa) {
    res.status(400).json({ error: "Não recebi texto para reescrever. O arquivo pode ter só imagens." });
    return;
  }

  const nivel = LEVEL_GUIDANCE[level] ? level : null;
  if (!nivel) {
    res.status(400).json({ error: "Escolha o nível da turma antes de reescrever." });
    return;
  }
  const faixa = AGE_GUIDANCE[ageGroup] ? ageGroup : DEFAULT_AGE_GROUP;

  // Aviso ANTES de cobrar: descobrir que o arquivo é grande demais depois de
  // gastar o crédito seria o pior dos dois mundos.
  const medida = medirEstrutura(limpa);
  if (medida.chars > MAX_CHARS || medida.paragrafos > MAX_PARAGRAFOS) {
    res.status(413).json({
      error: `Esta atividade é grande demais para reescrever de uma vez (${medida.paragrafos} blocos de texto e ${medida.chars} caracteres; o limite é ${MAX_PARAGRAFOS} e ${MAX_CHARS}). Divida o arquivo em partes menores.`,
    });
    return;
  }

  const cobranca = await consumirCreditosCM(profToken, 1);
  if (!cobranca.ok) {
    res.status(cobranca.code === "sem_creditos" ? 402 : 503).json({
      error: cobranca.error || "Não foi possível verificar seus créditos.",
      code: cobranca.code || null,
      creditos: typeof cobranca.creditos === "number" ? cobranca.creditos : null,
    });
    return;
  }
  const ticketEstorno = cobranca.estorno || null;

  try {
    const resultado = await reescreverAtividade({
      estrutura: limpa,
      instrucao: String(instrucao || "").trim().slice(0, 1200),
      language: language === "spanish" ? "spanish" : "english",
      level: nivel,
      ageGroup: faixa,
    });

    res.status(200).json({
      textos: resultado.textos,
      resumo: resultado.resumo,
      ignorados: resultado.ignorados,
      creditos: cobranca.creditos,
    });

    const detalhe = [
      `arquivo: ${String(arquivo || "sem nome").slice(0, 120)}`,
      `${medida.slides} slides, ${medida.paragrafos} blocos`,
      instrucao ? `instrução: ${String(instrucao).trim().slice(0, 200)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    waitUntil(
      appendActivityLog({
        teacherName: professor,
        language: language === "spanish" ? "espanhol" : "inglês",
        levels: [LEVEL_GUIDANCE[nivel].label],
        ageGroups: [(AGE_GUIDANCE[faixa] || {}).ptLabel || faixa],
        event: "reescrita",
        topic: String(arquivo || "atividade do professor").slice(0, 120),
        detail: detalhe,
      }).catch((err) => console.error("[log] falha ao gravar:", err.message))
    );

    waitUntil(
      logCmEvent({
        profToken,
        event: "reescrita",
        topic: String(arquivo || "atividade do professor").slice(0, 120),
        language: language === "spanish" ? "espanhol" : "inglês",
        level: LEVEL_GUIDANCE[nivel].label,
        ageLabel: (AGE_GUIDANCE[faixa] || {}).ptLabel || faixa,
        detail: detalhe,
      }).catch((err) => console.error("[cm_eventos] falha ao gravar:", err.message))
    );
  } catch (err) {
    console.error(err);
    // Mesma regra do generate-lesson: o crédito foi cobrado antes da IA, e
    // uma falha nossa não pode sair do bolso do professor. O estorno é
    // aguardado porque a mensagem afirma que o crédito voltou.
    const saldo = await estornarCreditosCM(profToken, ticketEstorno);
    const estornado = typeof saldo === "number";
    const motivo = String(err.message || "");
    // erro de limite é do arquivo, não nosso: vale dizer qual é
    const explicavel = /grande demais|texto editável/.test(motivo);
    res.status(502).json({
      error: explicavel
        ? `Não deu para reescrever: ${motivo}${estornado ? " Seu crédito foi devolvido." : ""}`
        : estornado
        ? "Falha ao reescrever a atividade. Seu crédito foi devolvido, pode tentar de novo."
        : "Falha ao reescrever a atividade. Tente novamente em instantes.",
      creditos: estornado ? saldo : null,
      estornado,
    });
  }
};
