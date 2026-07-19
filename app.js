/* DOM wiring for the Conversation Maker form.
 *
 * /api/generate-lesson already returns the canonical `lesson` shape (see
 * the contract at the top of render-slides-html.js) — no client-side
 * pagination/slide-plan step needed anymore. Each lesson downloads as a
 * real PDF (/api/export-pdf) and/or PPTX (/api/export-pptx), rendered
 * server-side onto the real Canva template backgrounds. */

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

  async function fetchLessons({ accessCode, language, topic, levelChoice }) {
    const response = await fetch("/api/generate-lesson", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessCode, language, topic, levelChoice }),
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

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Compact read-out of the lesson content (not a slide-by-slide preview —
  // the real layout only exists in the generated PDF/PPTX, which reuses the
  // actual Canva template).
  function renderLessonPreview(lesson) {
    const sections = document.createElement("div");
    sections.className = "slide-list";

    function addSection(label, bodyHtml) {
      const el = document.createElement("div");
      el.className = "slide";
      el.innerHTML = `<span class="slide-layout">${escapeHtml(label)}</span><div class="slide-body">${bodyHtml}</div>`;
      sections.appendChild(el);
    }

    addSection("Objetivos", lesson.objectives.map((o) => `<p>• ${escapeHtml(o)}</p>`).join(""));

    addSection(
      "Vocabulário",
      lesson.vocabulary
        .map((w) => `<p>${escapeHtml(w.word)}${w.translation ? " — " + escapeHtml(w.translation) : ""}</p>`)
        .join("")
    );

    addSection("Introdução", `<p>${escapeHtml(lesson.introText)}</p>`);

    addSection(
      "Conversação",
      lesson.conversation
        .map(
          (q, i) =>
            `<div class="q">${i + 1}. ${escapeHtml(q.question)}<br><span class="scaffold">${(q.modelAnswers || [])
              .map(escapeHtml)
              .join(" / ")}</span></div>`
        )
        .join("")
    );

    addSection(
      "Language Game",
      lesson.languageGame
        .map(
          (q, i) =>
            `<div class="q">${i + 1}. ${escapeHtml(q.question)}<br><span class="scaffold">${(q.modelAnswers || [])
              .map(escapeHtml)
              .join(" / ")}</span></div>`
        )
        .join("")
    );

    addSection(
      "Avaliação",
      lesson.evaluation
        .map(
          (q, i) =>
            `<div class="q">${i + 1}. ${escapeHtml(q.question)}<br><span class="scaffold">${(q.modelAnswers || [])
              .map(escapeHtml)
              .join(" / ")}</span></div>`
        )
        .join("")
    );

    return sections;
  }

  async function downloadFile({ endpoint, lesson, extension, btn, busyLabel }) {
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = busyLabel;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lesson }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Erro ${response.status} ao gerar o .${extension}.`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      a.download = match ? match[1] : `roteiro.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || `Não foi possível gerar o .${extension}.`);
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }

  function renderDeck(lesson) {
    const deck = document.createElement("div");
    deck.className = "deck";

    const head = document.createElement("div");
    head.className = "deck-head";
    head.innerHTML = `<h3>${escapeHtml(lesson.coverTitle)}</h3><span>${escapeHtml(lesson.coverLevel)}</span>`;

    const pdfBtn = document.createElement("button");
    pdfBtn.type = "button";
    pdfBtn.className = "btn btn-download";
    pdfBtn.textContent = "Baixar PDF";
    pdfBtn.addEventListener("click", () =>
      downloadFile({ endpoint: "/api/export-pdf", lesson, extension: "pdf", btn: pdfBtn, busyLabel: "Gerando PDF..." })
    );

    const pptxBtn = document.createElement("button");
    pptxBtn.type = "button";
    pptxBtn.className = "btn btn-download";
    pptxBtn.textContent = "Baixar .pptx";
    pptxBtn.addEventListener("click", () =>
      downloadFile({
        endpoint: "/api/export-pptx",
        lesson,
        extension: "pptx",
        btn: pptxBtn,
        busyLabel: "Gerando .pptx...",
      })
    );

    head.appendChild(pdfBtn);
    head.appendChild(pptxBtn);
    deck.appendChild(head);
    deck.appendChild(renderLessonPreview(lesson));

    return deck;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const accessCode = document.getElementById("accessCode").value;
    const language = selectedValue(languageChoices);
    const topic = document.getElementById("topic").value.trim();
    const levelChoice = language === "english" ? selectedValue(levelChoices) : null;

    if (!topic || !accessCode) return;

    generateBtn.disabled = true;
    setStatus("Gerando com a IA... isso pode levar alguns segundos.");
    results.classList.remove("is-visible");

    try {
      const lessons = await fetchLessons({ accessCode, language, topic, levelChoice });

      results.innerHTML = "";
      lessons.forEach((lesson) => results.appendChild(renderDeck(lesson)));
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
