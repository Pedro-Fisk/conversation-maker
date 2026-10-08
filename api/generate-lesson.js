/*
 * Vercel serverless function: POST /api/generate-lesson
 *
 * Body: { accessCode, language, topic, levelChoice, ageGroup, useWebSearch,
 *         teacherName }
 * Returns: { lessons: [ ...Lesson ] }  (1 lesson, or several for "all_levels")
 *
 * Requires two environment variables set in the Vercel project dashboard
 * (Settings -> Environment Variables) — never committed to the repo:
 *   ANTHROPIC_API_KEY  — from console.anthropic.com
 *   ACCESS_CODE        — shared password teachers enter in the form
 *
 * This function holds the Anthropic API key server-side. The static
 * frontend (index.html/app.js) never sees it — it only calls this
 * endpoint, which lives on the same Vercel deployment (same origin, so
 * no CORS setup needed).
 *
 * Every generated lesson follows ONE fixed shape (the "canonical lesson"
 * documented at the top of ../render-slides-html.js) because it is rendered
 * onto the SAME 18-page Canva template for every level and both languages
 * — Pedro's call: rather than a different slide structure per level, all
 * levels/languages reuse the one template, and only the *content*
 * (question depth, vocabulary difficulty, register) scales with level.
 * That means every lesson always has exactly: 3 objectives, 8 vocabulary
 * words, 1 intro paragraph, 9 conversation Q&As (3 groups of 3), 6
 * language game Q&As (2 groups of 3), 2 evaluation Q&As — regardless of
 * level or language.
 *
 * All the prompt-building/model-calling logic (level guidance, model-answer
 * style, Language Game grammar sources...) lives in ../lesson-generation.js,
 * shared with api/regenerate-section.js (regenerate just ONE section of an
 * already-generated lesson, e.g. only the Language Game) so the two
 * endpoints can never drift apart on how content gets written.
 */

const { waitUntil } = require("@vercel/functions");
const { recordTeacherActivity } = require("../canva-lib");
const { appendActivityLog } = require("../activity-log");
const { verifyProfToken, logCmEvent, consumirCreditosCM, estornarCreditosCM } = require("../fisk-auth");
const { aplicarCors } = require("../cors");
const {
  LEVEL_GUIDANCE,
  AGE_GUIDANCE,
  DEFAULT_AGE_GROUP,
  ENGLISH_LEVELS,
  SPANISH_LEVELS,
  generateFullLesson,
} = require("../lesson-generation");

/**
 * Sanea a "atividade pronta" que veio do navegador. O cliente já limita o
 * tamanho, mas quem manda o corpo é o navegador — então o limite de verdade é
 * aqui, senão um texto gigante estoura o prompt (e a conta).
 */
function sanitizarAtividadeBase(src) {
  if (!src || typeof src !== "object") return null;
  const texto = String(src.texto || "").trim();
  if (!texto) return null;
  return {
    texto: texto.slice(0, 12000),
    instrucao: String(src.instrucao || "").trim().slice(0, 600),
    arquivo: String(src.arquivo || "").trim().slice(0, 200),
  };
}

/**
 * "Estou com sorte": acha um vídeo no YouTube para o tema.
 *
 * O tópico é escrito em PORTUGUÊS pelo professor, então uma busca crua entrega
 * vídeo em português — foi o que aconteceu num teste real. Por isso a consulta
 * é montada no idioma DA AULA e a busca vai com hl/gl daquele idioma, o que
 * enviesa o ranking do YouTube para conteúdo naquela língua.
 *
 * Continua sendo heurística: é raspagem da página de resultados, sem filtro
 * oficial de idioma. Se vier algo fora do idioma, o professor remove o bloco
 * do vídeo na prévia.
 */
async function searchYouTubeVideo(topic, language) {
  try {
    const espanhol = language === "spanish";
    const alvo = espanhol
      ? `${topic} clase de conversación en español para estudiantes`
      : `${topic} english conversation lesson for students`;
    const hl = espanhol ? "es" : "en";
    const gl = espanhol ? "ES" : "US";
    const query = encodeURIComponent(alvo);
    const res = await fetch(`https://www.youtube.com/results?search_query=${query}&hl=${hl}&gl=${gl}`, {
      headers: {
        "Accept-Language": espanhol ? "es-ES,es;q=0.9" : "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/"videoId":"([A-Za-z0-9_-]{11})"/);
    return m ? m[1] : null;
  } catch (err) {
    console.error("[videoSearch] falha:", err.message);
    return null;
  }
}

async function fetchYouTubeTranscript(videoId, language) {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0" },
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();
    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:\s*var\s|<\/script>)/s);
    if (!match) return null;
    const playerResponse = JSON.parse(match[1]);
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks?.length) return null;
    // legenda no idioma DA AULA (antes era fixo em "en", o que pegava a
    // legenda inglesa de um vídeo espanhol quando ela existia)
    const idiomaLegenda = language === "spanish" ? "es" : "en";
    const track =
      captionTracks.find((t) => t.languageCode === idiomaLegenda) ||
      captionTracks.find((t) => String(t.languageCode || "").startsWith(idiomaLegenda)) ||
      captionTracks[0];
    const captionRes = await fetch(track.baseUrl + "&fmt=json3");
    if (!captionRes.ok) return null;
    const captionData = await captionRes.json();
    const text = (captionData.events || [])
      .filter((e) => e.segs)
      .map((e) => e.segs.map((s) => s.utf8 || "").join(""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return text || null;
  } catch (err) {
    console.error("[transcript] falha:", err.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (aplicarCors(req, res)) return;   // o Buddy do Hub chama daqui do navegador (ver cors.js)
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // referenceLesson: aula-guia do lote (a primeira, já editada à mão) —
  // as demais combinações nível×faixa são geradas a partir dela.
  // previousLesson + feedback: recriação de UMA aula que o professor
  // rejeitou, com o texto do modal descrevendo o que mudar.
  const { accessCode, profToken, language, topic, levelChoice, ageGroup, useWebSearch, teacherName, videoId, videoSearch, extraActivity, referenceLesson, previousLesson, feedback, sourceActivity } = req.body || {};
  const resolvedAgeGroup = AGE_GUIDANCE[ageGroup] ? ageGroup : DEFAULT_AGE_GROUP;
  const searchEnabled = useWebSearch === true;

  // Autenticação: sessão de professor do fisk-hub (profToken, validada
  // server-side — o nome vem das credenciais, nunca digitado). O código
  // compartilhado antigo segue aceito como fallback de transição.
  let sessionTeacher = null;
  if (profToken) {
    const prof = await verifyProfToken(profToken);
    if (!prof) {
      res.status(401).json({ error: "Sessão expirada. Entre novamente." });
      return;
    }
    sessionTeacher = prof.fullName || prof.name;
  } else if (!process.env.ACCESS_CODE || accessCode !== process.env.ACCESS_CODE) {
    res.status(401).json({ error: "Código de acesso inválido." });
    return;
  }
  const effectiveTeacher = sessionTeacher || teacherName;

  // Com uma atividade pronta subida, o tema pode vir do próprio arquivo — então
  // o tópico deixa de ser obrigatório nesse caso (e só nesse).
  const atividadeBase = sanitizarAtividadeBase(sourceActivity);
  if (!language || ((!topic || !topic.trim()) && !atividadeBase)) {
    res.status(400).json({ error: "Preencha idioma e tópico (ou suba uma atividade pronta)." });
    return;
  }

  let creditosRestantes = null;
  let ticketEstorno = null;   // devolve o crédito se a geração falhar (ver catch)
  let levels;
  if (language === "spanish") {
    // Espanhol agora também tem dois níveis (QECR): Básico B1 e Avançado
    // C1 — antes era uma única versão fixa em B1.
    if (!levelChoice) {
      res.status(400).json({ error: "Nível é obrigatório para espanhol." });
      return;
    }
    levels = levelChoice === "all_levels" ? SPANISH_LEVELS.slice() : [levelChoice];
  } else {
    if (!levelChoice) {
      res.status(400).json({ error: "Nível é obrigatório para inglês." });
      return;
    }
    levels = levelChoice === "all_levels" ? ENGLISH_LEVELS.slice() : [levelChoice];
  }

  // Créditos: 1 por aula gerada, cobrados ANTES de chamar a IA — depois seria
  // tarde, o custo já teria acontecido. Recriar não cobra (decisão do Pedro):
  // uma recriação chega com previousLesson+feedback e passa direto.
  const ehRecriacao = Boolean(previousLesson && feedback);
  if (profToken && !ehRecriacao) {
    const cobranca = await consumirCreditosCM(profToken, levels.length);
    if (!cobranca.ok) {
      res.status(cobranca.code === "sem_creditos" ? 402 : 503).json({
        error: cobranca.error || "Não foi possível verificar seus créditos.",
        code: cobranca.code || null,
        creditos: typeof cobranca.creditos === "number" ? cobranca.creditos : null,
      });
      return;
    }
    creditosRestantes = cobranca.creditos;
    // Fica só aqui no servidor: com ele em mãos o navegador devolveria
    // crédito à vontade, e o débito server-side perderia o sentido.
    ticketEstorno = cobranca.estorno || null;
  }

  try {
    let resolvedVideoId = videoId || null;
    if (videoSearch && !resolvedVideoId) {
      resolvedVideoId = await searchYouTubeVideo(topic, language);
    }
    const transcript = resolvedVideoId ? await fetchYouTubeTranscript(resolvedVideoId, language) : null;

    // As chamadas rodam em PARALELO (antes eram sequenciais): com três
    // níveis, o tempo total caía fora do maxDuration e o Vercel devolvia
    // 504. Em paralelo, o tempo total é o da chamada mais lenta.
    const lessons = await Promise.all(
      levels.map((level) =>
        generateFullLesson({
          language,
          topic,
          level,
          ageGroup: resolvedAgeGroup,
          useWebSearch: searchEnabled,
          transcript,
          extraActivity: extraActivity || null,
          referenceLesson: referenceLesson || null,
          previousLesson: previousLesson || null,
          feedback: (feedback && String(feedback).trim()) || null,
          // atividade pronta subida pelo professor: texto já extraído no
          // navegador (o arquivo em si nunca chega aqui) + o que ele pediu
          sourceActivity: atividadeBase,
        })
      )
    );

    // Keep objectives + vocabulary consistent across the whole "todos os
    // níveis" batch for one topic, so the three decks describe the same
    // lesson at different depths rather than drifting apart.
    for (let i = 1; i < lessons.length; i++) {
      lessons[i].objectives = lessons[0].objectives;
      lessons[i].vocabulary = lessons[0].vocabulary;
      // mesma aula, mesmos ícones: emoji diferente por nível daria a impressão
      // de serem atividades distintas
      lessons[i].coverEmoji = lessons[0].coverEmoji;
      lessons[i].sectionEmojis = lessons[0].sectionEmojis;
    }

    res.status(200).json({ lessons, resolvedVideoId: resolvedVideoId || null, creditos: creditosRestantes });

    // Contabiliza a atividade por professor (apenas estatística interna;
    // o nome não entra na aula nem no arquivo). Roda após a resposta.
    waitUntil(
      recordTeacherActivity(effectiveTeacher, lessons.length).catch((err) =>
        console.error("[stats] falha ao registrar:", err.message)
      )
    );

    // Log persistente (GitHub): quem gerou o quê e quando. Recriações são
    // registradas como evento próprio, com o feedback do professor no
    // campo "detalhe" — é isso que permite ao diretor ver quantas
    // recriações cada aula levou e por quê (análise de tendências).
    const isRecreation = Boolean(feedback && String(feedback).trim());
    waitUntil(
      appendActivityLog({
        teacherName: effectiveTeacher,
        language: language === "spanish" ? "espanhol" : "inglês",
        levels: levels.map((lv) => LEVEL_GUIDANCE[lv].label),
        ageGroups: [(AGE_GUIDANCE[resolvedAgeGroup] || {}).ptLabel || resolvedAgeGroup],
        event: isRecreation ? "recriação" : "geração",
        topic,
        detail: isRecreation ? `feedback: ${String(feedback).trim()}` : "",
      }).catch((err) => console.error("[log] falha ao gravar:", err.message))
    );

    // Log estruturado (aba cm_eventos): alimenta os indicadores e alertas
    // do Painel da Direção. Só com sessão SSO (o fallback de código de
    // acesso continua indo apenas ao log GitHub acima).
    if (profToken) {
      waitUntil(
        logCmEvent({
          profToken,
          event: isRecreation ? "recriação" : "geração",
          topic,
          language: language === "spanish" ? "espanhol" : "inglês",
          level: levels.map((lv) => LEVEL_GUIDANCE[lv].label).join(", "),
          ageLabel: (AGE_GUIDANCE[resolvedAgeGroup] || {}).ptLabel || resolvedAgeGroup,
          detail: isRecreation ? `feedback: ${String(feedback).trim()}` : "",
        }).catch((err) => console.error("[cm_eventos] falha ao gravar:", err.message))
      );
    }
  } catch (err) {
    console.error(err);
    /* O crédito é cobrado ANTES da IA (senão não haveria como cobrar), mas
       aqui a aula não existe — devolver é obrigatório, ou uma falha nossa
       sairia do bolso do professor. O estorno é aguardado, e não disparado
       em segundo plano, porque a mensagem de erro afirma que o crédito
       voltou: prometer sem confirmar seria pior do que não devolver. */
    const saldo = await estornarCreditosCM(profToken, ticketEstorno);
    const estornado = typeof saldo === "number";
    res.status(502).json({
      error: estornado
        ? "Falha ao gerar a aula. Seus créditos foram devolvidos — pode tentar de novo."
        : "Falha ao gerar a aula. Tente novamente em instantes.",
      creditos: estornado ? saldo : null,
      estornado,
    });
  }
};
