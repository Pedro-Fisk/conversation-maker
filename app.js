/* DOM wiring for the Conversation Maker form. Content generation logic
 * lives in logic.js (window.ConversationMaker). */

(function () {
  const form = document.getElementById("form");
  const languageChoices = document.getElementById("languageChoices");
  const levelChoices = document.getElementById("levelChoices");
  const levelField = document.getElementById("levelField");
  const results = document.getElementById("results");
  const generateBtn = document.getElementById("generateBtn");
  const statusEl = document.getElementById("status");

  function setStatus(text, isError) {
    statusEl.textContent = text || "";
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  async function fetchLessons({ accessCode, language, topic, levelChoice, grammarPoint }) {
    const response = await fetch("/api/generate-lesson", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessCode, language, topic, levelChoice, grammarPoint }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Erro ${response.status} ao gerar a aula.`);
    }
    return data.lessons;
  }

  function selectedValue(container) {
    const active = container.querySelector(".choice.is-active");
    return active ? active.dataset.value : null;
  }

  function wireChoiceRow(container, onChange) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".choice");
      if (!btn) return;
      container.querySelectorAll(".choice").forEach((c) => c.classList.remove("is-active"));
      btn.classList.add("is-active");
      onChange(btn.dataset.value);
    });
  }

  function updateLevelVisibility(language) {
    levelField.classList.toggle("is-visible", language === "english");
  }

  wireChoiceRow(languageChoices, updateLevelVisibility);
  wireChoiceRow(levelChoices, () => {});
  updateLevelVisibility(selectedValue(languageChoices));

  const LAYOUT_LABELS = {
    Cover: "Capa",
    "Material Needed": "Material necessário",
    Objectives: "Objetivos",
    Vocabulary: "Vocabulário",
    "Grammar Point": "Ponto gramatical",
    "Introduction Title": "Introdução (título)",
    "Introduction Text": "Introdução (texto)",
    Video: "Vídeo",
    Conversation: "Conversação",
    "Language Game": "Language Game",
    Evaluation: "Avaliação",
    Closing: "Encerramento",
  };

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderSlideBody(slide) {
    const c = slide.content;
    switch (slide.layout) {
      case "Cover":
        return `<p><strong>${escapeHtml(c.title)}</strong></p><p>${escapeHtml(c.subtitle)}</p>`;
      case "Material Needed":
        return `<p>${escapeHtml(c.activity)} — ${c.durationMinutes} minutos</p>`;
      case "Objectives":
        return c.objectives.map((o) => `<p>• ${escapeHtml(o)}</p>`).join("");
      case "Vocabulary":
        return c.words
          .map((w) => `<p>${escapeHtml(w.word)}${w.translation ? " — " + escapeHtml(w.translation) : ""}</p>`)
          .join("");
      case "Grammar Point":
        return `<p><em>${escapeHtml(c.teacherInstruction)}</em></p><p>${escapeHtml(c.explanation)}</p>${c.example ? `<p>${escapeHtml(c.example)}</p>` : ""}`;
      case "Introduction Title":
        return `<p><strong>${escapeHtml(c.title)}</strong></p>`;
      case "Introduction Text":
        return `<p>${escapeHtml(c.text)}</p>`;
      case "Video":
        return `<p>${escapeHtml(c.title)}</p>`;
      case "Conversation":
        return (
          (c.subtopic ? `<p><strong>${escapeHtml(c.subtopic)}</strong></p>` : "") +
          c.questions
            .map(
              (q) =>
                `<div class="q">${q.number}. ${escapeHtml(q.question)}${
                  q.answerScaffold ? `<br><span class="scaffold">${escapeHtml(q.answerScaffold)}</span>` : ""
                }</div>`
            )
            .join("")
        );
      case "Language Game":
        return c.questions
          .map(
            (q) =>
              `<p>${escapeHtml(q.prompt)}<br>` +
              q.options.map((o, i) => `${"abc"[i]}. ${escapeHtml(o)}`).join(" &nbsp; ") +
              `</p>`
          )
          .join("");
      case "Evaluation":
        return c.questions.map((q) => `<p>${escapeHtml(q)}</p>`).join("");
      case "Closing":
        return `<p>${escapeHtml(c.title)}</p>`;
      default:
        return "";
    }
  }

  async function downloadPptx(output, btn) {
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Gerando .pptx...";
    try {
      const response = await fetch("/api/export-pptx", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lesson: output.lesson, slidePlan: output.slidePlan }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Erro ${response.status} ao gerar o .pptx.`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      a.download = match ? match[1] : "roteiro.pptx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "Não foi possível gerar o .pptx.");
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }

  function renderDeck(output) {
    const deck = document.createElement("div");
    deck.className = "deck";

    const head = document.createElement("div");
    head.className = "deck-head";
    head.innerHTML = `<h3>${escapeHtml(output.lesson.coverTitle)}</h3><span>${escapeHtml(
      output.lesson.coverSubtitle
    )} · ${output.slidePlan.length} slides</span>`;
    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "btn btn-download";
    downloadBtn.textContent = "Baixar .pptx";
    downloadBtn.addEventListener("click", () => downloadPptx(output, downloadBtn));
    head.appendChild(downloadBtn);
    deck.appendChild(head);

    const list = document.createElement("div");
    list.className = "slide-list";
    output.slidePlan.forEach((slide) => {
      const el = document.createElement("div");
      el.className = "slide";
      el.innerHTML = `<span class="slide-layout">${LAYOUT_LABELS[slide.layout] || slide.layout}</span>
        <div class="slide-body">${renderSlideBody(slide)}</div>`;
      list.appendChild(el);
    });
    deck.appendChild(list);

    return deck;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const accessCode = document.getElementById("accessCode").value;
    const language = selectedValue(languageChoices);
    const topic = document.getElementById("topic").value.trim();
    const grammarPoint = document.getElementById("grammarPoint").value.trim() || null;
    const levelChoice = language === "english" ? selectedValue(levelChoices) : null;

    if (!topic || !accessCode) return;

    generateBtn.disabled = true;
    setStatus("Gerando com a IA... isso pode levar alguns segundos.");
    results.classList.remove("is-visible");

    try {
      const lessons = await fetchLessons({ accessCode, language, topic, levelChoice, grammarPoint });
      const outputs = lessons.map((lesson) => ({
        lesson,
        slidePlan: window.ConversationMaker.buildSlidePlan(lesson),
      }));

      results.innerHTML = "";
      outputs.forEach((output) => results.appendChild(renderDeck(output)));
      results.classList.add("is-visible");
      results.scrollIntoView({ behavior: "smooth", block: "start" });
      setStatus("");
    } catch (err) {
      setStatus(err.message || "Não foi possível gerar a aula.", true);
    } finally {
      generateBtn.disabled = false;
    }
  });
})();
