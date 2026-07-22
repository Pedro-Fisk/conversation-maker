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
const levelChoicesEnglish = document.getElementById("levelChoicesEnglish");
const levelChoicesSpanish = document.getElementById("levelChoicesSpanish");
const levelHintEnglish = document.getElementById("levelHintEnglish");
const levelHintSpanish = document.getElementById("levelHintSpanish");
const levelField = document.getElementById("levelField");
const ageChoices = document.getElementById("ageChoices");
const stagesField = document.getElementById("stagesField");
const stageChoices = document.getElementById("stageChoices");
const results = document.getElementById("results");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");
const topicEl = document.getElementById("topic");
const micBtn = document.getElementById("micBtn");
const micHint = document.getElementById("micHint");
const spinnerEl = document.getElementById("spinner");
const genNoteEl = document.getElementById("genNote");
const youtubeEl = document.getElementById("youtubeUrl");
const youtubeCheckEl = document.getElementById("youtubeCheck");
const youtubeWrapEl = document.getElementById("youtubeWrap");
const youtubeLuckyEl = document.getElementById("youtubeLucky");
const extraActivityCheckEl = document.getElementById("extraActivityCheck");
const extraActivityWrapEl = document.getElementById("extraActivityWrap");
const extraActivityEl = document.getElementById("extraActivity");

function extractVideoId(url) {
if (!url) return null;
url = url.trim();
let m = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
if (m) return m[1];
m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
if (m) return m[1];
m = url.match(/\/(?:embed|shorts|v)\/([A-Za-z0-9_-]{11})/);
if (m) return m[1];
if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
return null;
}

function setGenerating(on) {
if (spinnerEl) spinnerEl.classList.toggle("is-hidden", !on);
if (genNoteEl) genNoteEl.classList.toggle("is-hidden", !on);
}

// ---- Código de acesso lembrado no navegador ----
// Pré-preenche com o último código que gerou uma aula com sucesso, para o
// professor não digitar toda vez. Fica só no localStorage deste navegador.
const accessCodeEl = document.getElementById("accessCode");
const teacherNameEl = document.getElementById("teacherName");
try {
const savedCode = localStorage.getItem("cm-access-code");
if (savedCode && accessCodeEl) accessCodeEl.value = savedCode;
const savedName = localStorage.getItem("cm-teacher-name");
if (savedName && teacherNameEl) teacherNameEl.value = savedName;
} catch (e) {}

function rememberAccessCode(code) {
try { localStorage.setItem("cm-access-code", code); } catch (e) {}
}

function rememberTeacherName(name) {
try { localStorage.setItem("cm-teacher-name", name); } catch (e) {}
}

function setStatus(text, isError) {
statusEl.textContent = text || "";
statusEl.classList.toggle("is-error", Boolean(isError));
}

async function fetchLessons({ accessCode, language, topic, levelChoice, ageGroup, useWebSearch, teacherName, stages, videoId, videoSearch, extraActivity }) {
const response = await fetch("/api/generate-lesson", {
method: "POST",
headers: { "content-type": "application/json" },
body: JSON.stringify({ accessCode, language, topic, levelChoice, ageGroup, useWebSearch, teacherName, stages, videoId, videoSearch, extraActivity }),
});
const data = await response.json().catch(() => ({}));
if (!response.ok) {
throw new Error(data.error || `Erro ${response.status} ao gerar a aula.`);
}
return { lessons: data.lessons, resolvedVideoId: data.resolvedVideoId || null };
}

function selectedValue(container) {
const active = container.querySelector(".choice.is-active");
return active ? active.dataset.value : null;
}

function selectedValues(container) {
return Array.from(container.querySelectorAll(".choice.is-active")).map((c) => c.dataset.value);
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

// Estágios do curso: diferente das outras choice-rows, aqui o professor
// pode marcar vários botões ao mesmo tempo (ou nenhum) — cada clique só
// alterna o próprio botão, sem desmarcar os outros.
function wireMultiChoiceRow(container) {
container.addEventListener("click", (e) => {
const btn = e.target.closest(".choice");
if (!btn) return;
btn.classList.toggle("is-active");
});
}

// Retorna a linha de níveis (botões) que está ativa para o idioma atual.
// Inglês e espanhol têm conjuntos de níveis diferentes (Basic/Intermediate/
// Advanced vs. Básico B1/Avançado C1), então cada um tem sua própria
// .choice-row — só uma fica visível por vez.
function activeLevelRow(language) {
return language === "spanish" ? levelChoicesSpanish : levelChoicesEnglish;
}

function updateLevelVisibility(language) {
// O campo de nível agora é sempre necessário (inglês e espanhol têm
// níveis), então fica sempre visível — só o conjunto de botões muda.
levelField.classList.add("is-visible");
const isSpanish = language === "spanish";
levelChoicesEnglish.classList.toggle("is-hidden", isSpanish);
levelChoicesSpanish.classList.toggle("is-hidden", !isSpanish);
if (levelHintEnglish) levelHintEnglish.classList.toggle("is-hidden", isSpanish);
if (levelHintSpanish) levelHintSpanish.classList.toggle("is-hidden", !isSpanish);
// Estágios (Essentials/Transitions/Fluency/Focus) são do curso de
// inglês da FISK, sem equivalente em espanhol — o painel só aparece
// quando o idioma escolhido é inglês.
if (stagesField) stagesField.classList.toggle("is-hidden", isSpanish);
}

wireChoiceRow(languageChoices, updateLevelVisibility);
wireChoiceRow(levelChoicesEnglish, (level) => {
  if (level === "teens") {
    // Teens → trava faixa etária em Pré-adolescentes
    const preBtn = ageChoices.querySelector('.choice[data-value="preteens"]');
    if (preBtn && !preBtn.classList.contains("is-active")) preBtn.click();
    ageChoices.querySelectorAll(".choice").forEach((b) => { b.disabled = true; b.style.opacity = "0.5"; b.style.cursor = "default"; });
  } else {
    ageChoices.querySelectorAll(".choice").forEach((b) => { b.disabled = false; b.style.opacity = ""; b.style.cursor = ""; });
  }
});
wireChoiceRow(levelChoicesSpanish, () => {});
wireChoiceRow(ageChoices, () => {});
if (stageChoices) wireMultiChoiceRow(stageChoices);
updateLevelVisibility(selectedValue(languageChoices));

// YouTube checkbox toggle
if (youtubeCheckEl && youtubeWrapEl) {
  youtubeCheckEl.addEventListener("change", () => {
    youtubeWrapEl.classList.toggle("is-hidden", !youtubeCheckEl.checked);
    if (!youtubeCheckEl.checked) {
      if (youtubeEl) youtubeEl.value = "";
      if (youtubeLuckyEl) { youtubeLuckyEl.checked = false; if (youtubeEl) youtubeEl.disabled = false; }
    }
  });
}

// "Estou com sorte" — grays out the URL field when checked
if (youtubeLuckyEl && youtubeEl) {
  youtubeLuckyEl.addEventListener("change", () => {
    youtubeEl.disabled = youtubeLuckyEl.checked;
    if (youtubeLuckyEl.checked) youtubeEl.value = "";
  });
}

// Extra Activity checkbox toggle
if (extraActivityCheckEl && extraActivityWrapEl) {
  extraActivityCheckEl.addEventListener("change", () => {
    extraActivityWrapEl.classList.toggle("is-hidden", !extraActivityCheckEl.checked);
  });
}

// ---- Ditado por voz (Web Speech API) ----
// Deixa o professor falar livremente; o texto reconhecido é anexado à
// caixa de tópico. O conteúdo ditado entra normalmente no envio para a
// IA, pois a API lê o mesmo campo #topic.
(function setupDictation() {
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition || !micBtn) {
// Navegador sem suporte (ex.: Firefox): esconde o botão e avisa.
if (micBtn) micBtn.classList.add("is-hidden");
if (micHint) micHint.textContent = "O ditado por voz não é suportado neste navegador. Use o Chrome ou o Edge para falar em vez de digitar.";
return;
}

const recognition = new SpeechRecognition();
recognition.lang = "pt-BR";
recognition.continuous = true;
recognition.interimResults = true;

let recording = false;
let baseText = ""; // texto já existente na caixa quando começou a gravar
let finalChunk = ""; // trechos já finalizados nesta sessão de gravação

function setRecordingUI(on) {
recording = on;
micBtn.classList.toggle("is-recording", on);
micBtn.setAttribute("aria-label", on ? "Parar ditado" : "Ditar por voz");
micBtn.setAttribute("title", on ? "Clique para parar o ditado" : "Clique para ditar por voz");
micHint.textContent = on ? "Ouvindo... fale à vontade. Clique de novo no microfone para parar." : "";
}

function joinText(a, b) {
if (!a) return b;
if (!b) return a;
return a.replace(/\s+$/, "") + " " + b.replace(/^\s+/, "");
}

micBtn.addEventListener("click", () => {
if (recording) {
recognition.stop();
return;
}
baseText = topicEl.value;
finalChunk = "";
try {
recognition.start();
} catch (err) {
// start() lança se já estiver rodando; ignora com segurança.
}
});

recognition.addEventListener("start", () => setRecordingUI(true));

recognition.addEventListener("result", (event) => {
let interim = "";
for (let i = event.resultIndex; i < event.results.length; i++) {
const transcript = event.results[i][0].transcript;
if (event.results[i].isFinal) {
finalChunk = joinText(finalChunk, transcript.trim());
} else {
interim = joinText(interim, transcript);
}
}
topicEl.value = joinText(joinText(baseText, finalChunk), interim);
});

recognition.addEventListener("error", (event) => {
setRecordingUI(false);
if (event.error === "not-allowed" || event.error === "service-not-allowed") {
micHint.textContent = "Permissão de microfone negada. Libere o acesso ao microfone nas configurações do navegador.";
} else if (event.error === "no-speech") {
micHint.textContent = "Não ouvi nada. Clique no microfone e tente falar novamente.";
} else {
micHint.textContent = "Não foi possível usar o ditado agora. Tente novamente.";
}
});

recognition.addEventListener("end", () => {
// Consolida o texto final na caixa e limpa o estado de gravação.
topicEl.value = joinText(baseText, finalChunk);
setRecordingUI(false);
});
})();

function escapeHtml(str) {
const div = document.createElement("div");
div.textContent = str;
return div.innerHTML;
}

// Editable read-out of the lesson content. This is NOT a slide-by-slide
// preview (the real layout only exists in the generated PDF/PPTX, which
// reuses the actual Canva template) — but every field is editable and
// writes straight back into the `lesson` object. Because renderDeck and
// downloadFile share that same object reference, any correction the
// teacher makes here is exactly what gets exported.
function editField(value, onInput, opts) {
opts = opts || {};
const el = document.createElement(opts.multiline ? "textarea" : "input");
if (!opts.multiline) el.type = "text";
el.className = "edit-field";
el.value = value == null ? "" : String(value);
if (opts.multiline) el.rows = opts.rows || 2;
if (opts.placeholder) el.placeholder = opts.placeholder;
if (opts.multiline) {
// Autoajuste de altura conforme o texto cresce.
const grow = () => {
el.style.height = "auto";
el.style.height = el.scrollHeight + "px";
};
el.addEventListener("input", grow);
requestAnimationFrame(grow);
}
el.addEventListener("input", () => onInput(el.value));
return el;
}

// Mapeia a chave de seção (a mesma que /api/regenerate-section espera) ao
// campo correspondente no objeto `lesson`. Usado tanto para montar o corpo
// do pedido quanto para saber onde encaixar a resposta de volta.
const SECTION_FIELD = {
objectives: "objectives",
vocabulary: "vocabulary",
introText: "introText",
conversation: "conversation",
languageGame: "languageGame",
evaluation: "evaluation",
};

// Substitui o CONTEÚDO de um array no lugar (em vez de trocar a
// referência) — importante porque addQASection/addLanguageGameSection
// recebem o array por parâmetro (list = lesson.conversation, etc.) e essa
// referência precisa continuar apontando pros dados novos depois de
// regenerar, senão o refresh() re-renderiza os dados antigos.
function replaceArrayInPlace(arr, newItems) {
arr.splice(0, arr.length, ...(newItems || []));
}

async function regenerateSection({ lesson, sectionKey, btn, onDone }) {
const originalLabel = btn.textContent;
btn.disabled = true;
btn.textContent = "Gerando...";
try {
const response = await fetch("/api/regenerate-section", {
method: "POST",
headers: { "content-type": "application/json" },
body: JSON.stringify({
accessCode: accessCodeEl.value,
language: lesson.language,
topic: lesson._genTopic || lesson.topic,
level: lesson.levelKey,
ageGroup: lesson._genAgeGroup,
useWebSearch: lesson._genUseWebSearch,
stages: lesson._genStages,
teacherName: teacherNameEl ? teacherNameEl.value.trim() : "",
section: sectionKey,
}),
});
const data = await response.json().catch(() => ({}));
if (!response.ok) {
throw new Error(data.error || `Erro ${response.status} ao regenerar esta seção.`);
}
const field = SECTION_FIELD[sectionKey];
if (Array.isArray(lesson[field])) {
replaceArrayInPlace(lesson[field], data[field]);
} else {
lesson[field] = data[field];
}
onDone();
} catch (err) {
alert(err.message || "Não foi possível regenerar esta seção. Tente novamente.");
} finally {
btn.disabled = false;
btn.textContent = originalLabel;
}
}

function renderLessonPreview(lesson) {
const sections = document.createElement("div");
sections.className = "slide-list";

const note = document.createElement("p");
note.className = "edit-note";
note.textContent = "✏️ Revise e corrija o texto abaixo à vontade. As alterações entram no .pptx ao baixar. Não gostou de uma seção inteira? Use \"🔄 Gerar de novo\" para pedir só aquela parte de novo pra IA, sem mexer no resto.";
sections.appendChild(note);

function addSection(label, buildBody, opts) {
opts = opts || {};
const el = document.createElement("div");
el.className = "slide";

const tagRow = document.createElement("div");
tagRow.className = "slide-tag-row";
const tag = document.createElement("span");
tag.className = "slide-layout";
tag.textContent = label;
tagRow.appendChild(tag);

const body = document.createElement("div");
body.className = "slide-body";

function refresh() {
body.innerHTML = "";
buildBody(body);
}

if (opts.sectionKey) {
const regenBtn = document.createElement("button");
regenBtn.type = "button";
regenBtn.className = "btn-regen";
regenBtn.textContent = "🔄 Gerar de novo";
regenBtn.title = `Pede pra IA uma nova versão só de "${label}", sem mexer no resto da aula`;
regenBtn.addEventListener("click", () =>
regenerateSection({ lesson, sectionKey: opts.sectionKey, btn: regenBtn, onDone: refresh })
);
tagRow.appendChild(regenBtn);
}

// Botão de colapsar/expandir
const chevron = document.createElement("span");
chevron.className = "slide-chevron";
chevron.setAttribute("aria-hidden", "true");
tagRow.appendChild(chevron);

tagRow.style.cursor = "pointer";
tagRow.addEventListener("click", (e) => {
if (e.target.closest(".btn-regen")) return;
el.classList.toggle("is-collapsed");
});

refresh();
el.appendChild(tagRow);
el.appendChild(body);
sections.appendChild(el);
}

// Título da capa
addSection("Título da capa", (body) => {
body.appendChild(
editField(lesson.coverTitle, (v) => { lesson.coverTitle = v; }, { placeholder: "título da aula" })
);
});

// Objetivos (3)
addSection("Objetivos", (body) => {
lesson.objectives.forEach((o, i) => {
body.appendChild(
editField(o, (v) => { lesson.objectives[i] = v; }, { multiline: true, rows: 1 })
);
});
}, { sectionKey: "objectives" });

// Vocabulário (8) — palavra + tradução
addSection("Vocabulário", (body) => {
lesson.vocabulary.forEach((w, i) => {
const row = document.createElement("div");
row.className = "edit-vocab-row";
row.appendChild(editField(w.word, (v) => { lesson.vocabulary[i].word = v; }, { placeholder: "palavra" }));
row.appendChild(
editField(w.translation, (v) => { lesson.vocabulary[i].translation = v; }, { placeholder: "tradução" })
);
body.appendChild(row);
});
}, { sectionKey: "vocabulary" });

// Introdução (1 parágrafo)
addSection("Introdução", (body) => {
body.appendChild(
editField(lesson.introText, (v) => { lesson.introText = v; }, { multiline: true, rows: 4 })
);
}, { sectionKey: "introText" });

// Slide de atividade extra (só aparece quando o professor preencheu o campo)
if (lesson.extraActivityTitle) {
addSection("Atividade Extra", (body) => {
const titleEl = document.createElement("p");
titleEl.style.cssText = "font-weight:800;font-size:1rem;margin:0 0 0.5rem;";
titleEl.textContent = lesson.extraActivityTitle;
body.appendChild(
editField(lesson.extraActivityTitle, (v) => { lesson.extraActivityTitle = v; }, { placeholder: "título da atividade" })
);
const instrLabel = document.createElement("span");
instrLabel.className = "edit-label";
instrLabel.textContent = "Instruções";
body.appendChild(instrLabel);
body.appendChild(
editField(lesson.extraActivityInstructions, (v) => { lesson.extraActivityInstructions = v; }, { multiline: true, rows: 4 })
);
});
}

// Slide de vídeo (só aparece quando o professor colou um link do YouTube)
if (lesson._videoId) {
addSection("Vídeo do YouTube", (body) => {
const wrapper = document.createElement("div");
wrapper.style.cssText = "position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;";
const iframe = document.createElement("iframe");
iframe.src = `https://www.youtube.com/embed/${lesson._videoId}`;
iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
iframe.allowFullscreen = true;
iframe.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:8px;";
iframe.title = "Vídeo da aula";
wrapper.appendChild(iframe);
body.appendChild(wrapper);
});
}

// Blocos de perguntas com 0-2 respostas-modelo cada (o número e o estilo
// variam por nível — ver a orientação MODEL ANSWERS em
// api/generate-lesson.js: nem toda pergunta ganha modelo, e quando ganha
// costuma ser só um começo de frase, não uma resposta pronta). O professor
// pode adicionar ou remover modelos livremente aqui.
const MAX_MODEL_ANSWERS = 2;

function renderAnswers(container, list, i) {
container.innerHTML = "";
const item = list[i];
const answers = Array.isArray(item.modelAnswers) ? item.modelAnswers : (item.modelAnswers = []);

if (answers.length === 0) {
const hint = document.createElement("span");
hint.className = "edit-answer-hint";
hint.textContent = "Pergunta aberta — sem resposta-modelo.";
container.appendChild(hint);
}

answers.forEach((ans, a) => {
const row = document.createElement("div");
row.className = "edit-answer-row";
row.appendChild(
editField(ans, (v) => { answers[a] = v; }, { multiline: true, rows: 1, placeholder: "resposta-modelo (ex.: \"I think that...\")" })
);
const removeBtn = document.createElement("button");
removeBtn.type = "button";
removeBtn.className = "edit-answer-remove";
removeBtn.textContent = "×";
removeBtn.setAttribute("aria-label", "Remover esta resposta-modelo");
removeBtn.addEventListener("click", () => {
answers.splice(a, 1);
renderAnswers(container, list, i);
});
row.appendChild(removeBtn);
container.appendChild(row);
});

if (answers.length < MAX_MODEL_ANSWERS) {
const addBtn = document.createElement("button");
addBtn.type = "button";
addBtn.className = "edit-answer-add";
addBtn.textContent = "+ Adicionar resposta-modelo";
addBtn.addEventListener("click", () => {
answers.push("");
renderAnswers(container, list, i);
});
container.appendChild(addBtn);
}
}

function addQASection(label, list, sectionKey) {
addSection(label, (body) => {
list.forEach((q, i) => {
const card = document.createElement("div");
card.className = "edit-qa";

const num = document.createElement("span");
num.className = "edit-qa-num";
num.textContent = "Pergunta " + (i + 1);
card.appendChild(num);

card.appendChild(
editField(q.question, (v) => { list[i].question = v; }, { multiline: true, rows: 1 })
);

const ansLabel = document.createElement("span");
ansLabel.className = "edit-label";
ansLabel.textContent = "Respostas-modelo";
card.appendChild(ansLabel);

const answersContainer = document.createElement("div");
answersContainer.className = "edit-answers-list";
card.appendChild(answersContainer);
renderAnswers(answersContainer, list, i);

body.appendChild(card);
});
}, { sectionKey });
}

// Language game é múltipla escolha (pergunta + 3 opções, uma marcada como
// certa) em vez de perguntas abertas com respostas-modelo — editor
// separado do addQASection acima.
function addLanguageGameSection(list, sectionKey) {
addSection("Language Game", (body) => {
list.forEach((q, i) => {
const card = document.createElement("div");
card.className = "edit-qa";

const num = document.createElement("span");
num.className = "edit-qa-num";
num.textContent = "Pergunta " + (i + 1);
card.appendChild(num);

card.appendChild(
editField(q.question, (v) => { list[i].question = v; }, { multiline: true, rows: 1 })
);

const optLabel = document.createElement("span");
optLabel.className = "edit-label";
optLabel.textContent = "Opções (marque a correta)";
card.appendChild(optLabel);

const options = Array.isArray(q.options) ? q.options : (q.options = ["", "", ""]);
while (options.length < 3) options.push("");
if (list[i].correctIndex == null) list[i].correctIndex = 0;
const radioName = "lg-correct-" + i + "-" + Math.random().toString(36).slice(2, 8);

const optionsContainer = document.createElement("div");
optionsContainer.className = "edit-mc-list";
options.slice(0, 3).forEach((opt, oi) => {
const row = document.createElement("label");
row.className = "edit-mc-row";

const radio = document.createElement("input");
radio.type = "radio";
radio.name = radioName;
radio.checked = list[i].correctIndex === oi;
radio.setAttribute("aria-label", "Marcar como resposta correta");
radio.addEventListener("change", () => { list[i].correctIndex = oi; });
row.appendChild(radio);

row.appendChild(
editField(opt, (v) => { list[i].options[oi] = v; }, {
multiline: true,
rows: 1,
placeholder: "opção " + String.fromCharCode(65 + oi),
})
);

optionsContainer.appendChild(row);
});
card.appendChild(optionsContainer);

body.appendChild(card);
});
}, { sectionKey });
}

addQASection("Conversação", lesson.conversation, "conversation");
addLanguageGameSection(lesson.languageGame, "languageGame");
addQASection("Avaliação", lesson.evaluation, "evaluation");

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

const pptxBtn = document.createElement("button");
pptxBtn.type = "button";
pptxBtn.className = "btn btn-download btn-pptx";
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

// Botões de download ficam no rodapé do deck: o professor revisa o
// conteúdo primeiro e encontra os botões no fim, depois de editar.
const foot = document.createElement("div");
foot.className = "deck-foot";
const footLabel = document.createElement("span");
footLabel.className = "deck-foot-label";
footLabel.textContent = "Tudo revisado? Baixe a versão final:";
foot.appendChild(footLabel);
foot.appendChild(pptxBtn);

deck.appendChild(head);
deck.appendChild(renderLessonPreview(lesson));
deck.appendChild(foot);

return deck;
}

// ---- Modo escuro ----
fiskInitThemeToggle("themeToggle", { storageKey: "cm-theme" });

// ---- Limpar formulário (com confirmação) ----
function selectChoice(container, value) {
const btn = container.querySelector(`.choice[data-value="${value}"]`);
if (btn) btn.click();
}

function clearForm() {
topicEl.value = "";
const webSearchEl = document.getElementById("webSearch");
if (webSearchEl) webSearchEl.checked = false;
if (youtubeCheckEl) { youtubeCheckEl.checked = false; }
if (youtubeWrapEl) youtubeWrapEl.classList.add("is-hidden");
if (youtubeLuckyEl) { youtubeLuckyEl.checked = false; }
if (youtubeEl) { youtubeEl.value = ""; youtubeEl.disabled = false; }
if (extraActivityCheckEl) { extraActivityCheckEl.checked = false; }
if (extraActivityWrapEl) extraActivityWrapEl.classList.add("is-hidden");
if (extraActivityEl) extraActivityEl.value = "";
selectChoice(languageChoices, "english");
selectChoice(levelChoicesEnglish, "basic");
selectChoice(levelChoicesSpanish, "spanish_basic");
selectChoice(ageChoices, "adults");
if (stageChoices) stageChoices.querySelectorAll(".choice.is-active").forEach((b) => b.classList.remove("is-active"));
results.classList.remove("is-visible", "multi");
results.innerHTML = "";
setStatus("");
}

fiskInitClearConfirm({
triggerId: "clearBtn",
modalId: "confirmClear",
confirmId: "confirmClearBtn",
cancelId: "cancelClear",
onConfirm: clearForm,
});

// ---- Avisa antes de fechar/recarregar a aba se houver dados preenchidos ----
function hasUnsavedWork() {
return Boolean(topicEl.value.trim()) || results.classList.contains("is-visible");
}
fiskInitBeforeUnloadGuard(hasUnsavedWork);

form.addEventListener("submit", async (e) => {
e.preventDefault();

const accessCode = accessCodeEl.value;
const language = selectedValue(languageChoices);
const topic = topicEl.value.trim();
const levelChoice = selectedValue(activeLevelRow(language));
const ageGroup = selectedValue(ageChoices);
const webSearchEl = document.getElementById("webSearch");
const useWebSearch = Boolean(webSearchEl && webSearchEl.checked);
const teacherName = teacherNameEl ? teacherNameEl.value.trim() : "";
const stages = language === "english" && stageChoices ? selectedValues(stageChoices) : [];
const videoSearch = !!(youtubeLuckyEl && youtubeLuckyEl.checked && youtubeCheckEl && youtubeCheckEl.checked);
const videoId = (youtubeCheckEl && youtubeCheckEl.checked && !videoSearch) ? extractVideoId(youtubeEl ? youtubeEl.value : "") : null;
const extraActivity = (extraActivityCheckEl && extraActivityCheckEl.checked && extraActivityEl && extraActivityEl.value.trim()) ? extraActivityEl.value.trim() : null;

if (!topic || !accessCode || !teacherName) return;

generateBtn.disabled = true;
setStatus(language === "spanish" ? "Creando magia de conversación..." : "Making conversation magic...");
setGenerating(true);
results.classList.remove("is-visible");

try {
const { lessons, resolvedVideoId } = await fetchLessons({ accessCode, language, topic, levelChoice, ageGroup, useWebSearch, teacherName, stages, videoId, videoSearch, extraActivity });

// Só memoriza o código depois de uma geração bem-sucedida (ou seja,
// um código que o servidor aceitou).
rememberAccessCode(accessCode);
if (teacherName) rememberTeacherName(teacherName);

// Guarda os parâmetros exatos usados nesta geração em cada lesson — o
// botão "🔄 Gerar de novo" de cada seção precisa deles depois para
// chamar /api/regenerate-section com o mesmo tópico/nível/idade/estágios,
// mesmo que o professor já tenha mudado algo no formulário nesse meio
// tempo. lesson.topic pode ter sido encurtado pela IA (ex.: "Japan"), por
// isso guardamos o texto ORIGINAL digitado em _genTopic separadamente.
const finalVideoId = resolvedVideoId || videoId || null;
lessons.forEach((lesson) => {
lesson._genTopic = topic;
lesson._genAgeGroup = ageGroup;
lesson._genUseWebSearch = useWebSearch;
lesson._genStages = stages;
lesson._videoId = finalVideoId;
});

results.innerHTML = "";
lessons.forEach((lesson) => results.appendChild(renderDeck(lesson)));
// Mais de um nível: decks lado a lado (desktop) / carrossel (mobile).
results.classList.toggle("multi", lessons.length > 1);
results.classList.add("is-visible");
results.scrollIntoView({ behavior: "smooth", block: "start" });
setStatus("");
} catch (err) {
setStatus(err.message || "Não foi possível gerar a aula.", true);
} finally {
generateBtn.disabled = false;
setGenerating(false);
}
});
})();
