/* DOM wiring for the Conversation Maker form. Content generation logic
 * lives in logic.js (window.ConversationMaker). */

(function () {
  const form = document.getElementById("form");
  const languageChoices = document.getElementById("languageChoices");
  const levelChoices = document.getElementById("levelChoices");
  const levelField = document.getElementById("levelField");
  const results = document.getElementById("results");

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

  function renderDeck(output) {
    const deck = document.createElement("div");
    deck.className = "deck";

    const head = document.createElement("div");
    head.className = "deck-head";
    head.innerHTML = `<h3>${escapeHtml(output.lesson.coverTitle)}</h3><span>${escapeHtml(
      output.lesson.coverSubtitle
    )} · ${output.slidePlan.length} slides</span>`;
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const language = selectedValue(languageChoices);
    const topic = document.getElementById("topic").value.trim();
    const grammarPoint = document.getElementById("grammarPoint").value.trim() || null;
    const levelChoice = language === "english" ? selectedValue(levelChoices) : null;

    if (!topic) return;

    const outputs = window.ConversationMaker.runRequest({
      language,
      topic,
      levelChoice,
      grammarPoint,
    });

    results.innerHTML = "";
    outputs.forEach((output) => results.appendChild(renderDeck(output)));
    results.classList.add("is-visible");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
