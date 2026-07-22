/*
 * Vercel serverless function: POST /api/generate-lesson
 *
 * Body: { accessCode, language, topic, levelChoice, ageGroup, useWebSearch,
 *         teacherName, stages }
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
const {
  LEVEL_GUIDANCE,
  AGE_GUIDANCE,
  DEFAULT_AGE_GROUP,
  ENGLISH_LEVELS,
  SPANISH_LEVELS,
  generateFullLesson,
} = require("../lesson-generation");

async function searchYouTubeVideo(topic) {
  try {
    const query = encodeURIComponent(`${topic} english conversation lesson`);
    const res = await fetch(`https://www.youtube.com/results?search_query=${query}`, {
      headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0" },
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

async function fetchYouTubeTranscript(videoId) {
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
    const track =
      captionTracks.find((t) => t.languageCode === "en") || captionTracks[0];
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
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { accessCode, language, topic, levelChoice, ageGroup, useWebSearch, teacherName, stages, videoId, videoSearch, extraActivity } = req.body || {};
  const resolvedAgeGroup = AGE_GUIDANCE[ageGroup] ? ageGroup : DEFAULT_AGE_GROUP;
  const searchEnabled = useWebSearch === true;

  if (!process.env.ACCESS_CODE || accessCode !== process.env.ACCESS_CODE) {
    res.status(401).json({ error: "Código de acesso inválido." });
    return;
  }

  if (!language || !topic || !topic.trim()) {
    res.status(400).json({ error: "Preencha idioma e tópico." });
    return;
  }

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

  try {
    let resolvedVideoId = videoId || null;
    if (videoSearch && !resolvedVideoId) {
      resolvedVideoId = await searchYouTubeVideo(topic);
    }
    const transcript = resolvedVideoId ? await fetchYouTubeTranscript(resolvedVideoId) : null;

    // As chamadas rodam em PARALELO (antes eram sequenciais): com três
    // níveis, o tempo total caía fora do maxDuration e o Vercel devolvia
    // 504. Em paralelo, o tempo total é o da chamada mais lenta.
    const lessons = await Promise.all(
      levels.map((level) =>
        generateFullLesson({ language, topic, level, ageGroup: resolvedAgeGroup, useWebSearch: searchEnabled, stages, transcript, extraActivity: extraActivity || null })
      )
    );

    // Keep objectives + vocabulary consistent across the whole "todos os
    // níveis" batch for one topic, so the three decks describe the same
    // lesson at different depths rather than drifting apart.
    for (let i = 1; i < lessons.length; i++) {
      lessons[i].objectives = lessons[0].objectives;
      lessons[i].vocabulary = lessons[0].vocabulary;
    }

    res.status(200).json({ lessons, resolvedVideoId: resolvedVideoId || null });

    // Contabiliza a atividade por professor (apenas estatística interna;
    // o nome não entra na aula nem no arquivo). Roda após a resposta.
    waitUntil(
      recordTeacherActivity(teacherName, lessons.length).catch((err) =>
        console.error("[stats] falha ao registrar:", err.message)
      )
    );

    // Log persistente (GitHub): quem gerou o quê e quando.
    waitUntil(
      appendActivityLog({
        teacherName,
        language: language === "spanish" ? "espanhol" : "inglês",
        levels: levels.map((lv) => LEVEL_GUIDANCE[lv].label),
        topic,
      }).catch((err) => console.error("[log] falha ao gravar:", err.message))
    );
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Falha ao gerar a aula. Tente novamente em instantes." });
  }
};
