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
const results = document.getElementById("results");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");
const topicEl = document.getElementById("topic");
const micBtn = document.getElementById("micBtn");
const micHint = document.getElementById("micHint");
const spinnerEl = document.getElementById("spinner");
const genNoteEl = document.getElementById("genNote");

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

async function fetchLessons({ accessCode, language, topic, levelChoice, ageGroup, useWebSearch, teacherName }) {
const response = await fetch("/api/generate-lesson", {
method: "POST",
headers: { "content-type": "application/json" },
body: JSON.stringify({ accessCode, language, topic, levelChoice, ageGroup, useWebSearch, teacherName }),
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
}

wireChoiceRow(languageChoices, updateLevelVisibility);
wireChoiceRow(levelChoicesEnglish, () => {});
wireChoiceRow(levelChoicesSpanish, () => {});
wireChoiceRow(ageChoices, () => {});
updateLevelVisibility(selectedValue(languageChoices));

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

function renderLessonPreview(lesson) {
const sections = document.createElement("div");
sections.className = "slide-list";

const note = document.createElement("p");
note.className = "edit-note";
note.textContent = "✏️ Revise e corrija o texto abaixo à vontade. As alterações entram no .pptx ao baixar.";
sections.appendChild(note);

function addSection(label, buildBody) {
const el = document.createElement("div");
el.className = "slide";
const tag = document.createElement("span");
tag.className = "slide-layout";
tag.textContent = label;
const body = document.createElement("div");
body.className = "slide-body";
buildBody(body);
el.appendChild(tag);
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
});

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
});

// Introdução (1 parágrafo)
addSection("Introdução", (body) => {
body.appendChild(
editField(lesson.introText, (v) => { lesson.introText = v; }, { multiline: true, rows: 4 })
);
});

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

function addQASection(label, list) {
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
});
}

// Language game é múltipla escolha (pergunta + 3 opções, uma marcada como
// certa) em vez de perguntas abertas com respostas-modelo — editor
// separado do addQASection acima.
function addLanguageGameSection(list) {
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
});
}

addQASection("Conversação", lesson.conversation);
addLanguageGameSection(lesson.languageGame);
addQASection("Avaliação", lesson.evaluation);

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
selectChoice(languageChoices, "english");
selectChoice(levelChoicesEnglish, "basic");
selectChoice(levelChoicesSpanish, "spanish_basic");
selectChoice(ageChoices, "adults");
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

if (!topic || !accessCode) return;

generateBtn.disabled = true;
setStatus(language === "spanish" ? "Creando magia de conversación..." : "Making conversation magic...");
setGenerating(true);
results.classList.remove("is-visible");

try {
const lessons = await fetchLessons({ accessCode, language, topic, levelChoice, ageGroup, useWebSearch, teacherName });

// Só memoriza o código depois de uma geração bem-sucedida (ou seja,
// um código que o servidor aceitou).
rememberAccessCode(accessCode);
if (teacherName) rememberTeacherName(teacherName);

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
