/* DOM wiring for the Conversation Maker form.
*
* /api/generate-lesson already returns the canonical `lesson` shape (see
* the contract at the top of render-slides-html.js) — no client-side
* pagination/slide-plan step needed anymore. Each lesson downloads as a
* real PPTX (/api/export-pptx), rendered server-side onto the real Canva
* template backgrounds.
*
* Geração em lote (nível × faixa etária): o professor marca combinações
* numa matriz, gera a PRIMEIRA, revisa/edita à mão, e então gera as
* demais (sequencial ou em paralelo, escolha dele) usando a primeira aula
* editada como referência estrutural. As aulas aparecem num carrossel
* horizontal, cada uma com seu header "NÍVEL · FAIXA", botões próprios de
* Baixar e Recriar (com feedback livre para a IA), e versionamento local
* com "Reverter para versão anterior". */

(function () {
const form = document.getElementById("form");
const languageChoices = document.getElementById("languageChoices");
const matrixTable = document.getElementById("matrixTable");
const levelHintEnglish = document.getElementById("levelHintEnglish");
const levelHintSpanish = document.getElementById("levelHintSpanish");
const sourceFileEl = document.getElementById("sourceFile");
const sourceStatusEl = document.getElementById("sourceStatus");
const sourceInstructionEl = document.getElementById("sourceInstruction");
const results = document.getElementById("results");
const generateBtn = document.getElementById("generateBtn");
const statusEl = document.getElementById("status");
const topicEl = document.getElementById("topic");

/* A caixa do tópico cresce com o texto. A altura vem de scrollHeight, então
   precisa ser recalculada também quando o valor muda por CÓDIGO (ditado pelo
   microfone, limpar formulário) — nesses casos o evento "input" não dispara. */
function crescerTopico() {
if (!topicEl) return;
topicEl.style.height = "auto";
topicEl.style.height = topicEl.scrollHeight + "px";
}
if (topicEl) {
topicEl.addEventListener("input", crescerTopico);
requestAnimationFrame(crescerTopico);
}
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
const extraLuckyEl = document.getElementById("extraLucky");

// Modais da geração em lote
const recreateModal = document.getElementById("recreateModal");
const recreateFeedbackEl = document.getElementById("recreateFeedback");
const cancelRecreateBtn = document.getElementById("cancelRecreate");
const confirmRecreateBtn = document.getElementById("confirmRecreateBtn");
const batchModeModal = document.getElementById("batchModeModal");
const batchSequentialBtn = document.getElementById("batchSequentialBtn");
const batchParallelBtn = document.getElementById("batchParallelBtn");
const cancelBatchModeBtn = document.getElementById("cancelBatchMode");
const creditModal = document.getElementById("creditModal");
const creditModalText = document.getElementById("creditModalText");
const cancelCreditBtn = document.getElementById("cancelCredit");
const confirmCreditBtn = document.getElementById("confirmCreditBtn");
const creditosPill = document.getElementById("creditosPill");
const creditosNum = document.getElementById("creditosNum");
const menuCreditosNum = document.getElementById("menuCreditosNum");
const creditosCard = document.getElementById("creditosCard");
const cardCreditosNum = document.getElementById("cardCreditosNum");

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

// ---- Sessão do professor (SSO do Fisk Hub) ----
// NÃO existe login aqui: o professor entra UMA vez no Fisk Hub, e o link
// "Conversation Maker" de lá chega com #proftok=<token> na URL (fragmento
// não vai a servidores/logs — mesmo padrão do #dirtok= do Painel da
// Direção). A gente valida o token no fisk-hub-backend (profCheck), guarda
// a sessão neste navegador e tira o token da URL. O token é durável no
// servidor: só morre quando o professor loga de novo no Hub (rotação).
const FISK_HUB_API =
"https://script.google.com/macros/s/AKfycbw13tpIVD3Ji9XhWW1VwDSw8qAZOmtMGPV0FI1rlHpEQ7HABumVpi_aMWQXfo7dwkd1/exec";
const FISK_HUB_HOME = "https://pedro-fisk.github.io/fisk-hub/";

const authGate = document.getElementById("authGate");
const authGateMsg = document.getElementById("authGateMsg");
const profMenu = document.getElementById("profMenu");
const profMenuBtn = document.getElementById("profMenuBtn");
const profMenuPanel = document.getElementById("profMenuPanel");
const loggedNameEl = document.getElementById("loggedName");
const logoutBtn = document.getElementById("logoutBtn");

let profSession = null; // { token, name }
try {
const saved = JSON.parse(localStorage.getItem("cm-prof-session") || "null");
if (saved && saved.token && saved.name) profSession = saved;
} catch (e) {}

function setSession(session) {
profSession = session;
try {
if (session) localStorage.setItem("cm-prof-session", JSON.stringify(session));
else localStorage.removeItem("cm-prof-session");
} catch (e) {}
updateAuthUI();
}

function updateAuthUI() {
const logged = Boolean(profSession);
if (authGate) authGate.classList.toggle("is-hidden", logged);
if (profMenu) profMenu.classList.toggle("is-hidden", !logged);
if (!logged) fecharMenuProf();
if (loggedNameEl && profSession) loggedNameEl.textContent = profSession.name;
if (logged) buscarCreditos(); else { creditos = null; mostrarCreditos(); }
}

/* ---- menu do professor no cabeçalho ---- */
function fecharMenuProf() {
if (!profMenuPanel || !profMenu) return;
profMenuPanel.hidden = true;
profMenu.removeAttribute("data-open");
if (profMenuBtn) profMenuBtn.setAttribute("aria-expanded", "false");
}
function alternarMenuProf() {
if (!profMenuPanel || !profMenu) return;
const abrir = profMenuPanel.hidden;
profMenuPanel.hidden = !abrir;
if (abrir) profMenu.setAttribute("data-open", "1"); else profMenu.removeAttribute("data-open");
if (profMenuBtn) profMenuBtn.setAttribute("aria-expanded", abrir ? "true" : "false");
}
if (profMenuBtn) {
profMenuBtn.addEventListener("click", (e) => { e.stopPropagation(); alternarMenuProf(); });
}
// clicar fora ou apertar Esc fecha — senão o painel fica preso aberto
document.addEventListener("click", (e) => {
if (profMenu && !profMenu.contains(e.target)) fecharMenuProf();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharMenuProf(); });

/* ============ CRÉDITOS DO CONVERSATION MAKER ============
   1 crédito por aula gerada; recriar não custa. O saldo mostrado aqui é
   informativo — quem decide é o servidor, no /api/generate-lesson, porque a
   tela dá para burlar pelo console e cada geração é uma chamada paga. */
let creditos = null;

function mostrarCreditos() {
const tem = typeof creditos === "number";
if (creditosPill) creditosPill.classList.toggle("is-hidden", !tem);
if (creditosNum) creditosNum.textContent = tem ? creditos : "—";
if (menuCreditosNum) menuCreditosNum.textContent = tem ? creditos : "—";
if (cardCreditosNum) cardCreditosNum.textContent = tem ? creditos : "—";
if (creditosCard) {
creditosCard.classList.toggle("is-hidden", !tem);
creditosCard.classList.toggle("is-zero", tem && creditos <= 0);
}
if (creditosPill) {
creditosPill.classList.toggle("is-zero", tem && creditos <= 0);
}
}

async function buscarCreditos() {
if (!profSession) { creditos = null; mostrarCreditos(); return; }
try {
const res = await hubPost({ action: "cmCreditos", token: profSession.token });
creditos = res && res.ok && typeof res.creditos === "number" ? res.creditos : null;
} catch (e) { creditos = null; }
mostrarCreditos();
}

/* Confirmação antes de gastar: o professor vê quanto custa e quanto sobra.
   Devolve Promise<boolean>. */
function confirmarCusto(custo) {
return new Promise((resolve) => {
if (!creditModal || !creditModalText) return resolve(true);
const saldo = typeof creditos === "number" ? creditos : null;
creditModalText.innerHTML =
"Esta ação vai gerar <strong>" + custo + " atividade" + (custo > 1 ? "s" : "") +
"</strong> e custar <strong>" + custo + " crédito" + (custo > 1 ? "s" : "") + "</strong>." +
(saldo !== null
? " Você tem <strong>" + saldo + "</strong> e ficará com <strong>" + (saldo - custo) + "</strong>."
: "") +
"<br><br>Revisar e editar o texto na tela é de graça, e <strong>recriar uma aula não custa crédito</strong>.";
function fechar(valor) {
creditModal.classList.remove("open");
cancelCreditBtn.removeEventListener("click", noCancelar);
confirmCreditBtn.removeEventListener("click", noConfirmar);
creditModal.removeEventListener("click", noFundo);
resolve(valor);
}
function noCancelar() { fechar(false); }
function noConfirmar() { fechar(true); }
function noFundo(e) { if (e.target === creditModal) fechar(false); }
cancelCreditBtn.addEventListener("click", noCancelar);
confirmCreditBtn.addEventListener("click", noConfirmar);
creditModal.addEventListener("click", noFundo);
creditModal.classList.add("open");
});
}

function hubPost(body) {
return fetch(FISK_HUB_API, {
method: "POST",
headers: { "Content-Type": "text/plain;charset=utf-8" },
body: JSON.stringify(body),
}).then((r) => r.json());
}

// Sessão rejeitada pelo servidor (o professor logou de novo no Hub em outro
// lugar e o token daqui rotacionou): mostra a porteira com aviso.
function sessionExpired() {
setSession(null);
if (authGateMsg) authGateMsg.textContent = "Sua sessão expirou. Abra o Fisk Hub, entre novamente e clique em \"Conversation Maker\" por lá.";
if (authGate) authGate.scrollIntoView({ behavior: "smooth", block: "center" });
}

(function initSession() {
// 1) Chegou do Hub com token na URL? Valida, guarda e limpa a URL.
const m = location.hash.match(/#proftok=([^&]+)/);
if (m) {
history.replaceState(null, "", location.pathname + location.search);
const token = decodeURIComponent(m[1]);
hubPost({ action: "profCheck", token })
.then((res) => {
if (res && res.ok && res.prof) {
setSession({ token, name: res.prof.fullName || res.prof.name });
} else if (!profSession) {
sessionExpired();
}
})
.catch(() => { if (!profSession) updateAuthUI(); });
updateAuthUI();
return;
}
// 2) Sem token na URL: usa a sessão salva (revalidando em segundo plano).
updateAuthUI();
if (profSession) {
hubPost({ action: "profCheck", token: profSession.token })
.then((res) => { if (res && !res.ok) sessionExpired(); })
.catch(() => {}); // rede fora do ar: mantém a sessão, o servidor revalida a cada geração
}
})();

if (logoutBtn) logoutBtn.addEventListener("click", () => setSession(null));

function setStatus(text, isError) {
statusEl.textContent = text || "";
statusEl.classList.toggle("is-error", Boolean(isError));
}

// generateOptions: campos extras opcionais — referenceLesson (aula-guia do
// lote), previousLesson + feedback (recriação de uma aula rejeitada).
async function fetchLessons(payload) {
const response = await fetch("/api/generate-lesson", {
method: "POST",
headers: { "content-type": "application/json" },
body: JSON.stringify(payload),
});
const data = await response.json().catch(() => ({}));
if (!response.ok) {
if (response.status === 401) sessionExpired();
// 402 = sem créditos: o servidor manda o saldo real, que pode divergir do
// que a tela mostrava (outra aba, recarga da direção)
if (response.status === 402 && typeof data.creditos === "number") {
creditos = data.creditos; mostrarCreditos();
}
throw new Error(data.error || `Erro ${response.status} ao gerar a aula.`);
}
return { lessons: data.lessons, resolvedVideoId: data.resolvedVideoId || null, creditos: typeof data.creditos === "number" ? data.creditos : null };
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

// ---- Matriz nível × faixa etária ----
// O professor marca quais combinações quer gerar. A ORDEM dos cliques
// importa: a primeira combinação marcada é a que vira a "aula-guia" do
// lote (gerada primeiro, revisada à mão, referência das demais).
const AGE_COLS = [
{ key: "preteens", label: "Pré-adolescentes" },
{ key: "teens", label: "Jovens" },
{ key: "adults", label: "Adultos" },
];

const LEVELS_BY_LANG = {
english: [
{ key: "real_beginners", label: "Real Beginners" },
{ key: "teens", label: "Teens", onlyAge: "preteens" },
{ key: "basic", label: "Basic" },
{ key: "intermediate", label: "Intermediate" },
{ key: "advanced", label: "Advanced" },
],
spanish: [
{ key: "spanish_basic", label: "Básico" },
{ key: "spanish_intermediate", label: "Intermediário" },
{ key: "spanish_advanced", label: "Avançado" },
],
};

// O mapa nível→livros mora SÓ no servidor (BOOKS_BY_LEVEL, em
// lesson-generation.js): escolher o nível já garante a gramática dele no
// Language Game, e o que o professor marca aqui entra a mais. Ter o mapa nos
// dois lados só criaria risco de dessincronizar.

// Combinações selecionadas, em ORDEM de clique: [{ level, age }].
let selectedCombos = [];


function findCombo(level, age) {
return selectedCombos.findIndex((c) => c.level === level && c.age === age);
}

function ageLabelOf(ageKey) {
const col = AGE_COLS.find((a) => a.key === ageKey);
return col ? col.label : ageKey;
}

function levelLabelOf(language, levelKey) {
const row = (LEVELS_BY_LANG[language] || []).find((l) => l.key === levelKey);
return row ? row.label : levelKey;
}

// Redesenha os badges de ordem (1, 2, 3...) em todas as células marcadas.
function refreshMatrixBadges() {
if (!matrixTable) return;
matrixTable.querySelectorAll(".matrix-cell").forEach((cell) => {
const idx = findCombo(cell.dataset.level, cell.dataset.age);
cell.classList.toggle("is-active", idx !== -1);
const badge = cell.querySelector(".matrix-order");
if (badge) badge.textContent = idx === -1 ? "" : String(idx + 1);
});
updateGenerateButton();
}

function updateGenerateButton() {
const n = selectedCombos.length;
if (n > 1) {
generateBtn.textContent = `Gerar primeira aula (1 de ${n}) →`;
} else {
generateBtn.textContent = "Gerar roteiro →";
}
}

function buildMatrix(language) {
if (!matrixTable) return;
matrixTable.innerHTML = "";

const thead = document.createElement("thead");
const headRow = document.createElement("tr");
const corner = document.createElement("th");
corner.className = "matrix-corner";
headRow.appendChild(corner);
AGE_COLS.forEach((age) => {
const th = document.createElement("th");
th.textContent = age.label;
headRow.appendChild(th);
});
thead.appendChild(headRow);
matrixTable.appendChild(thead);

const tbody = document.createElement("tbody");
(LEVELS_BY_LANG[language] || []).forEach((level) => {
const tr = document.createElement("tr");
const th = document.createElement("th");
th.scope = "row";
th.textContent = level.label;
tr.appendChild(th);

AGE_COLS.forEach((age) => {
const td = document.createElement("td");
if (level.onlyAge && level.onlyAge !== age.key) {
// Combinação inexistente no curso (ex.: Teens só existe para
// Pré-adolescentes) — célula desabilitada.
td.className = "matrix-na";
td.textContent = "—";
} else {
const btn = document.createElement("button");
btn.type = "button";
btn.className = "matrix-cell";
btn.dataset.level = level.key;
btn.dataset.age = age.key;
btn.setAttribute("aria-label", `${level.label} · ${age.label}`);
const badge = document.createElement("span");
badge.className = "matrix-order";
btn.appendChild(badge);
const check = document.createElement("span");
check.className = "matrix-check";
check.textContent = "✓";
btn.appendChild(check);
btn.addEventListener("click", () => {
const idx = findCombo(level.key, age.key);
if (idx === -1) selectedCombos.push({ level: level.key, age: age.key });
else selectedCombos.splice(idx, 1);
refreshMatrixBadges();
});
td.appendChild(btn);
}
tr.appendChild(td);
});
tbody.appendChild(tr);
});
matrixTable.appendChild(tbody);
refreshMatrixBadges();
}

function updateLanguageUI(language) {
const isSpanish = language === "spanish";
if (levelHintEnglish) levelHintEnglish.classList.toggle("is-hidden", isSpanish);
if (levelHintSpanish) levelHintSpanish.classList.toggle("is-hidden", !isSpanish);
// Os níveis mudam por idioma, então a matriz é reconstruída e a
// seleção anterior deixa de fazer sentido.
selectedCombos = [];
buildMatrix(language);
}

wireChoiceRow(languageChoices, updateLanguageUI);
updateLanguageUI(selectedValue(languageChoices));

/* ============ ATIVIDADE PRONTA (.pptx) ============
   O texto é extraído aqui no navegador (ver pptx-reader.js) e guardado nesta
   variável; só ele viaja no corpo da requisição. Se a leitura falhar, o
   professor é avisado na hora — e não na hora de gerar, quando já esperou. */
let atividadeBase = null;   // { nomeArquivo, slides, texto, palavras, truncado }

if (sourceFileEl) {
sourceFileEl.addEventListener("change", async () => {
const file = sourceFileEl.files && sourceFileEl.files[0];
atividadeBase = null;
// `required` no HTML bloqueia o submit ANTES do meu guard rodar, então o
// atributo tem de acompanhar o estado: com arquivo, o tópico é opcional.
if (topicEl) topicEl.required = true;
if (!file) { if (sourceStatusEl) sourceStatusEl.textContent = ""; return; }
if (sourceStatusEl) sourceStatusEl.textContent = "⏳ Lendo o arquivo…";
try {
const lido = await pptxLerArquivo(file);
atividadeBase = {
nomeArquivo: file.name,
slides: lido.slides.length,
texto: lido.texto,
palavras: lido.palavras,
truncado: lido.truncado,
};
if (topicEl) topicEl.required = false;   // o tema pode vir do arquivo
if (sourceStatusEl) {
sourceStatusEl.textContent = "✓ " + file.name + " — " + lido.slides.length +
" slide(s), " + lido.palavras + " palavras de texto aproveitadas." +
(lido.truncado ? " (arquivo longo: usei só o começo)" : "") +
" O tópico acima agora é opcional.";
}
} catch (err) {
if (sourceStatusEl) sourceStatusEl.textContent = "⚠️ " + (err.message || "não consegui ler este arquivo");
sourceFileEl.value = "";
}
});
}

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
/* Com "estou com sorte" marcado, a caixa de texto sai de cena: quem delega a
   dinâmica não precisa escrevê-la, e um campo editável ali sugeriria que o
   texto ainda conta. */
if (extraLuckyEl && extraActivityEl) {
  extraLuckyEl.addEventListener("change", () => {
    extraActivityEl.disabled = extraLuckyEl.checked;
    extraActivityEl.style.opacity = extraLuckyEl.checked ? "0.5" : "";
  });
}
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
crescerTopico();
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
crescerTopico();
setRecordingUI(false);
});
})();

function escapeHtml(str) {
const div = document.createElement("div");
div.textContent = str;
return div.innerHTML;
}

// Editable read-out of the lesson content. This is NOT a slide-by-slide
// preview (the real layout only exists in the generated PPTX, which
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

/**
 * Recalcula a altura das caixas de texto dentro de `raiz`.
 * Necessário porque a altura vem de `scrollHeight`, que é ZERO enquanto o bloco
 * está recolhido (display:none) — os blocos agora nascem recolhidos, então sem
 * este reajuste a caixa abre com o texto cortado. Chamar sempre que um bloco
 * passa de recolhido para expandido.
 */
function reajustarCaixas(raiz) {
if (!raiz) return;
raiz.querySelectorAll("textarea.edit-field").forEach((t) => {
t.style.height = "auto";
t.style.height = t.scrollHeight + "px";
});
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
profToken: profSession ? profSession.token : null,
language: lesson.language,
topic: lesson._genTopic || lesson.topic,
level: lesson.levelKey,
ageGroup: lesson._genAgeGroup,
useWebSearch: lesson._genUseWebSearch,
teacherName: profSession ? profSession.name : "",
section: sectionKey,
}),
});
const data = await response.json().catch(() => ({}));
if (!response.ok) {
if (response.status === 401) sessionExpired();
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
note.textContent = "✏️ Os blocos começam recolhidos — clique no título de um deles (ou em \"Expandir tudo\") para revisar e corrigir o texto à vontade. As alterações entram no .pptx ao baixar. Não gostou de uma seção inteira? Use \"🔄 Gerar de novo\" para pedir só aquela parte de novo pra IA, sem mexer no resto.";
sections.appendChild(note);

// Cada bloco já colapsa sozinho (clique na faixa do rótulo), mas são 8 blocos
// por aula: recolher um por um só para ver a estrutura não é viável. Este
// controle fecha ou abre todos de uma vez. A aula continua abrindo EXPANDIDA,
// porque esta tela existe para revisar o texto.
const barra = document.createElement("div");
barra.className = "slide-list-bar";
const alternarTudo = document.createElement("button");
alternarTudo.type = "button";
alternarTudo.className = "btn-collapse-all";
barra.appendChild(alternarTudo);
sections.appendChild(barra);

function blocosAbertos() {
return sections.querySelectorAll(".slide:not(.is-collapsed)").length;
}

// O rótulo tem de contar a verdade mesmo depois de colapsar blocos na mão.
function sincronizarAlternarTudo() {
const total = sections.querySelectorAll(".slide").length;
barra.classList.toggle("is-hidden", total === 0);
const abertos = blocosAbertos();
alternarTudo.textContent = abertos ? "⌃ Recolher tudo" : "⌄ Expandir tudo";
alternarTudo.title = abertos
? "Fecha todos os blocos — mostra só a estrutura da aula"
: "Abre todos os blocos para revisar o texto";
// o carrossel precisa reajustar a própria altura à nova altura desta aula
document.dispatchEvent(new CustomEvent("cm:alturaMudou"));
}

alternarTudo.addEventListener("click", () => {
const fechar = blocosAbertos() > 0;
sections.querySelectorAll(".slide").forEach((s) => s.classList.toggle("is-collapsed", fechar));
if (!fechar) reajustarCaixas(sections);   // abriu tudo: remedir as caixas
sincronizarAlternarTudo();
});

function addSection(label, buildBody, opts) {
opts = opts || {};
const el = document.createElement("div");
// Começa RECOLHIDO: a aula tem 8 blocos e abria como uma coluna quilométrica.
// Assim a primeira coisa que o professor vê é a estrutura da aula, e ele abre
// o bloco que quer revisar (ou "Expandir tudo").
el.className = "slide is-collapsed";

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
// abriu: as caixas foram medidas com o bloco escondido (scrollHeight 0),
// então a altura só pode ser calculada agora
if (!el.classList.contains("is-collapsed")) reajustarCaixas(el);
sincronizarAlternarTudo();
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

// O vídeo é escolhido por heurística ("Estou com sorte") ou colado à mão, e
// pode simplesmente não servir. Remover zera o _videoId DESTA aula, que é o
// que o pptx-builder consulta para montar o slide — some da tela e do arquivo.
// As outras aulas do lote não são afetadas: cada uma tem seu próprio objeto.
const remover = document.createElement("button");
remover.type = "button";
remover.className = "btn-regen";
remover.style.marginTop = "0.75rem";
remover.textContent = "🗑 Remover o vídeo desta aula";
remover.title = "Tira o slide do vídeo desta aula, inclusive do .pptx ao baixar. As outras aulas do lote não mudam.";
remover.addEventListener("click", () => {
lesson._videoId = null;
const bloco = body.closest(".slide");
if (bloco) bloco.remove();
sincronizarAlternarTudo();
});
body.appendChild(remover);
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

sincronizarAlternarTudo();   // só agora dá para saber quantos blocos a aula tem
return sections;
}

async function downloadFile({ endpoint, lesson, extension, btn, busyLabel, meta }) {
const originalLabel = btn ? btn.textContent : "";
if (btn) {
btn.disabled = true;
btn.textContent = busyLabel;
}
try {
const response = await fetch(endpoint, {
method: "POST",
headers: { "content-type": "application/json" },
body: JSON.stringify({ lesson, meta: meta || undefined }),
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
throw err;
} finally {
if (btn) {
btn.disabled = false;
btn.textContent = originalLabel;
}
}
}

// ---- Estado do lote (carrossel) ----
// batch.slots: um slot por combinação nível×faixa, na ordem de seleção.
// Cada slot guarda TODAS as versões da aula (versioning local): recriar
// empilha uma versão nova; "Reverter" volta o ponteiro `active` — só a
// versão ativa é exibida, editada e exportada. No download, o log do
// diretor registra qual versão virou a definitiva.
let batch = null;

function slotLabel(slot) {
return `${levelLabelOf(batch.language, slot.combo.level).toUpperCase()} · ${ageLabelOf(slot.combo.age).toUpperCase()}`;
}

function activeLesson(slot) {
return slot.versions[slot.active] || null;
}

// Cópia da aula sem as chaves internas (_gen*, _videoId) para viajar no
// corpo da requisição como referência/versão anterior.
function lessonForPrompt(lesson) {
if (!lesson) return null;
const out = {};
Object.keys(lesson).forEach((k) => {
if (k.charAt(0) !== "_") out[k] = lesson[k];
});
return JSON.parse(JSON.stringify(out));
}

// Parâmetros comuns do formulário congelados no momento da primeira
// geração — as aulas seguintes do lote usam exatamente estes, mesmo que o
// professor mexa no formulário nesse meio tempo.
function stampLesson(lesson, params, resolvedVideoId) {
lesson._genTopic = params.topic;
lesson._genAgeGroup = lesson.ageKey || params.ageGroup;
lesson._genUseWebSearch = params.useWebSearch;
lesson._videoId = resolvedVideoId || null;
}


async function generateForCombo(combo, extras) {
const p = batch.params;
const payload = {
// Token lido na hora da chamada: se a sessão expirou e o professor
// logou de novo no meio do lote, as próximas aulas já usam o token novo.
profToken: profSession ? profSession.token : null,
language: batch.language,
topic: p.topic,
levelChoice: combo.level,
ageGroup: combo.age,
useWebSearch: p.useWebSearch,
teacherName: p.teacherName,
// O vídeo é resolvido UMA vez (na primeira aula) e reaproveitado
// pelas demais — sem nova busca, todas apontam pro mesmo vídeo.
videoId: batch.videoId,
videoSearch: false,
extraActivity: p.extraActivity,
sourceActivity: p.sourceActivity,
};
if (extras) Object.assign(payload, extras);
const { lessons, resolvedVideoId } = await fetchLessons(payload);
const lesson = lessons[0];
// grava os estágios REALMENTE usados nesta aula (podem diferir entre aulas
// do mesmo lote) — é o que vai para o histórico e para o log do diretor
stampLesson(lesson, { ...p, ageGroup: combo.age }, resolvedVideoId || batch.videoId);
return lesson;
}

// ---- Modal de recriação (feedback livre) ----
let recreateTarget = null;

function openRecreateModal(slot) {
recreateTarget = slot;
if (recreateFeedbackEl) recreateFeedbackEl.value = "";
if (recreateModal) recreateModal.classList.add("open");
if (recreateFeedbackEl) setTimeout(() => recreateFeedbackEl.focus(), 50);
}

function closeRecreateModal() {
recreateTarget = null;
if (recreateModal) recreateModal.classList.remove("open");
}

if (cancelRecreateBtn) cancelRecreateBtn.addEventListener("click", closeRecreateModal);
if (recreateModal) recreateModal.addEventListener("click", (e) => {
if (e.target === recreateModal) closeRecreateModal();
});

if (confirmRecreateBtn) confirmRecreateBtn.addEventListener("click", async () => {
const slot = recreateTarget;
const feedback = recreateFeedbackEl ? recreateFeedbackEl.value.trim() : "";
if (!slot) return;
if (!feedback) {
recreateFeedbackEl.placeholder = "Escreva o que você quer mudar antes de recriar...";
recreateFeedbackEl.focus();
return;
}
closeRecreateModal();
setSlotBusy(slot, "Recriando esta aula...");
try {
const lesson = await generateForCombo(slot.combo, {
previousLesson: lessonForPrompt(activeLesson(slot)),
feedback,
});
slot.versions.push(lesson);
slot.active = slot.versions.length - 1;
slot.recreations += 1;
} catch (err) {
alert(err.message || "Não foi possível recriar esta aula. Tente novamente.");
} finally {
setSlotBusy(slot, null);
renderSlot(slot);
}
});

// ---- Modal de modo do lote (sequencial × simultâneo) ----
function openBatchModeModal() {
if (batchModeModal) batchModeModal.classList.add("open");
}
function closeBatchModeModal() {
if (batchModeModal) batchModeModal.classList.remove("open");
}
if (cancelBatchModeBtn) cancelBatchModeBtn.addEventListener("click", closeBatchModeModal);
if (batchModeModal) batchModeModal.addEventListener("click", (e) => {
if (e.target === batchModeModal) closeBatchModeModal();
});
if (batchSequentialBtn) batchSequentialBtn.addEventListener("click", () => { closeBatchModeModal(); generateRemaining("sequential"); });
if (batchParallelBtn) batchParallelBtn.addEventListener("click", () => { closeBatchModeModal(); generateRemaining("parallel"); });

async function generateRemaining(mode) {
if (!batch || batch.generatingRest) return;
batch.generatingRest = true;
// A aula-guia é a versão ATIVA da primeira aula no momento do clique —
// com todas as edições manuais do professor.
const reference = lessonForPrompt(activeLesson(batch.slots[0]));
const pendingSlots = batch.slots.filter((s) => s.versions.length === 0);
renderBatchBar();
setGenerating(true);

async function generateSlot(slot) {
setSlotBusy(slot, "Gerando esta aula...");
try {
const lesson = await generateForCombo(slot.combo, { referenceLesson: reference });
slot.versions.push(lesson);
slot.active = 0;
slot.error = null;
} catch (err) {
slot.error = err.message || "Não foi possível gerar esta aula.";
} finally {
setSlotBusy(slot, null);
renderSlot(slot);
renderBatchBar();
}
}

if (mode === "sequential") {
for (const slot of pendingSlots) {
await generateSlot(slot);
}
} else {
await Promise.all(pendingSlots.map((slot) => generateSlot(slot)));
}

batch.generatingRest = false;
setGenerating(false);
renderBatchBar();
}

// ---- Renderização do carrossel ----
function setSlotBusy(slot, message) {
slot.busy = message || null;
renderSlot(slot);
}

function renderSlot(slot) {
if (!slot.slideEl) return;
const body = slot.slideEl.querySelector(".car-slide-body");
body.innerHTML = "";

if (slot.busy) {
body.appendChild(slotMessage("⏳ " + slot.busy, false));
return;
}

const lesson = activeLesson(slot);
if (!lesson) {
if (slot.error) {
const msg = slotMessage("⚠️ " + slot.error, true);
const retry = document.createElement("button");
retry.type = "button";
retry.className = "btn btn-gold btn-sm";
retry.textContent = "Tentar de novo";
retry.addEventListener("click", async () => {
slot.error = null;
setSlotBusy(slot, "Gerando esta aula...");
try {
const reference = lessonForPrompt(activeLesson(batch.slots[0]));
const l = await generateForCombo(slot.combo, { referenceLesson: reference });
slot.versions.push(l);
slot.active = 0;
} catch (err) {
slot.error = err.message || "Não foi possível gerar esta aula.";
} finally {
setSlotBusy(slot, null);
renderBatchBar();
}
});
msg.appendChild(retry);
body.appendChild(msg);
} else {
body.appendChild(slotMessage("🕐 Aguardando geração — clique em \"Gerar as demais\" abaixo do carrossel.", false));
}
return;
}

body.appendChild(renderDeck(slot, lesson));
}

function slotMessage(text, isError) {
const div = document.createElement("div");
div.className = "car-slide-msg" + (isError ? " is-error" : "");
const p = document.createElement("p");
p.textContent = text;
div.appendChild(p);
return div;
}

function renderDeck(slot, lesson) {
const deck = document.createElement("div");
deck.className = "deck";

const head = document.createElement("div");
head.className = "deck-head";
head.innerHTML = `<h3>${escapeHtml(lesson.coverTitle)}</h3><span>${escapeHtml(lesson.coverLevel)}${lesson.ageLabel ? " · " + escapeHtml(lesson.ageLabel) : ""}</span>`;

const foot = document.createElement("div");
foot.className = "deck-foot";

const footLabel = document.createElement("span");
footLabel.className = "deck-foot-label";
footLabel.textContent = "Tudo revisado? Ações desta aula:";
foot.appendChild(footLabel);

// "Reverter": só aparece depois de pelo menos uma recriação. Alterna
// entre a versão anterior e a mais recente — só a versão ativa é
// exportada no download (individual ou "Baixar Tudo").
if (slot.versions.length > 1) {
const revertBtn = document.createElement("button");
revertBtn.type = "button";
revertBtn.className = "btn btn-ghost btn-sm btn-revert";
if (slot.active === slot.versions.length - 1) {
revertBtn.textContent = "↩️ Reverter para versão anterior";
revertBtn.addEventListener("click", () => {
slot.active = Math.max(0, slot.active - 1);
renderSlot(slot);
});
} else {
revertBtn.textContent = "↪️ Voltar para a versão mais recente";
revertBtn.addEventListener("click", () => {
slot.active = slot.versions.length - 1;
renderSlot(slot);
});
}
foot.appendChild(revertBtn);
}

// "Recriar": regenera SÓ esta aula, nunca as demais — sempre passando
// pelo modal de feedback (o texto do professor entra no prompt da IA).
const recreateBtn = document.createElement("button");
recreateBtn.type = "button";
recreateBtn.className = "btn btn-ghost btn-sm btn-recreate";
recreateBtn.textContent = "🔄 Recriar";
recreateBtn.title = "Não gostou? A IA gera esta aula de novo levando seu feedback em conta.";
recreateBtn.addEventListener("click", () => openRecreateModal(slot));
foot.appendChild(recreateBtn);

const pptxBtn = document.createElement("button");
pptxBtn.type = "button";
pptxBtn.className = "btn btn-download btn-pptx";
pptxBtn.textContent = "⬇️ Baixar";
pptxBtn.addEventListener("click", () =>
downloadFile({
endpoint: "/api/export-pptx",
lesson: activeLesson(slot),
extension: "pptx",
btn: pptxBtn,
busyLabel: "Gerando .pptx...",
meta: downloadMeta(slot),
}).catch(() => {})
);
foot.appendChild(pptxBtn);

deck.appendChild(head);
deck.appendChild(renderLessonPreview(lesson));
deck.appendChild(foot);

return deck;
}

function downloadMeta(slot) {
return {
teacherName: batch.params.teacherName,
// Token para o backup automático no Drive (validado server-side lá).
profToken: profSession ? profSession.token : null,
event: "download",
recreations: slot.recreations,
versionInfo: slot.versions.length > 1
? `versão final: ${slot.active + 1}/${slot.versions.length} (${slot.recreations} recriação(ões))`
: "",
};
}

function renderBatch() {
results.innerHTML = "";

const carousel = document.createElement("div");
carousel.className = "carousel";

const prev = document.createElement("button");
prev.type = "button";
prev.className = "car-arrow car-prev";
prev.innerHTML = "&#10094;";
prev.setAttribute("aria-label", "Aula anterior");

const next = document.createElement("button");
next.type = "button";
next.className = "car-arrow car-next";
next.innerHTML = "&#10095;";
next.setAttribute("aria-label", "Próxima aula");

// Header destacado, em letras grandes: o professor identifica de imediato
// qual aula está vendo (evita confundir uma atividade com outra na hora de
// corrigir). Fica FORA do track porque a aula é comprida e a barra precisa
// acompanhar o rolar da página — e `position: sticky` não funciona dentro de
// um ancestral com overflow, que é o caso do .car-track.
const badge = document.createElement("div");
badge.className = "car-badge";

const track = document.createElement("div");
track.className = "car-track";

batch.slots.forEach((slot) => {
const slide = document.createElement("div");
slide.className = "car-slide";

const slideBody = document.createElement("div");
slideBody.className = "car-slide-body";
slide.appendChild(slideBody);

track.appendChild(slide);
slot.slideEl = slide;
renderSlot(slot);
});

const single = batch.slots.length === 1;
prev.classList.toggle("is-hidden", single);
next.classList.toggle("is-hidden", single);

function slideStep() {
const s = track.querySelector(".car-slide");
return s ? s.getBoundingClientRect().width : track.clientWidth;
}
prev.addEventListener("click", () => track.scrollBy({ left: -slideStep(), behavior: "smooth" }));
next.addEventListener("click", () => track.scrollBy({ left: slideStep(), behavior: "smooth" }));

// Setas desabilitadas nas pontas: no começo não há "anterior", no fim não há
// "próxima". Medido pelo scroll real (com folga de subpixel, senão a última
// posição nunca fecha a conta e a seta fica habilitada sem ter para onde ir).
function atualizarSetas() {
const maximo = track.scrollWidth - track.clientWidth;
const folga = 2;
prev.disabled = track.scrollLeft <= folga;
next.disabled = track.scrollLeft >= maximo - folga;
}

// Qual slide está visível: o de centro mais próximo do centro do track.
// Medido pelas posições renderizadas, então não depende do gap entre slides.
function slotVisivel() {
const slides = Array.prototype.slice.call(track.querySelectorAll(".car-slide"));
if (!slides.length) return null;
const r = track.getBoundingClientRect();
const centro = r.left + r.width / 2;
let melhor = 0, menorDist = Infinity;
slides.forEach((s, i) => {
const sr = s.getBoundingClientRect();
const d = Math.abs(sr.left + sr.width / 2 - centro);
if (d < menorDist) { menorDist = d; melhor = i; }
});
return batch.slots[melhor] || null;
}
/* O track é flex: sem intervenção, TODOS os slides ficam com a altura do mais
   alto. Expandir tudo na aula 1 e deslizar para a aula 2 (recolhida) deixava um
   vazio enorme e o botão de baixar fora de vista. Aqui a altura passa a seguir
   a aula visível — e muda junto quando o professor abre ou fecha um bloco. */
function ajustarAlturaTrack() {
const slot = slotVisivel();
const el = slot && slot.slideEl;
if (!el) return;
const altura = el.scrollHeight;
// Zero significa que ainda não dá para medir — o #results nasce em
// display:none e só fica visível no fim do renderBatch. Gravar 0 aqui deixava
// o carrossel EM BRANCO até um resize (o professor precisava dar zoom para a
// aula aparecer). Na dúvida, não mexe na altura.
if (altura > 0) track.style.height = altura + "px";
}

function atualizarCarrossel() {
const slot = slotVisivel();
if (slot) badge.textContent = slotLabel(slot);
atualizarSetas();
ajustarAlturaTrack();
}
// disparado por renderLessonPreview sempre que um bloco abre ou fecha
document.addEventListener("cm:alturaMudou", ajustarAlturaTrack);
// rede de segurança: qualquer mudança de tamanho de um slide reajusta o track
// (fontes e imagens que terminam de carregar, conteúdo que muda de altura).
if (typeof ResizeObserver === "function") {
const observador = new ResizeObserver(() => ajustarAlturaTrack());
batch.slots.forEach((s) => { if (s.slideEl) observador.observe(s.slideEl); });
}
track.addEventListener("scroll", atualizarCarrossel, { passive: true });
// redimensionar muda a largura dos slides e, com ela, o fim do carrossel
window.addEventListener("resize", atualizarCarrossel);

// As setas ficam numa "trilha" grudada na metade da tela: sem isso elas são
// absolutas dentro do carrossel (top: 50%) e, numa aula comprida, param a
// milhares de pixels do campo de visão. A trilha tem altura 0 e z-index
// menor que o do cabeçalho, para as setas não passarem por cima dele.
const trilha = document.createElement("div");
trilha.className = "car-rail";
trilha.appendChild(prev);
trilha.appendChild(next);

carousel.appendChild(badge);
carousel.appendChild(trilha);
carousel.appendChild(track);
results.appendChild(carousel);
atualizarCarrossel();

// Barra global FIXA abaixo do carrossel — não muda ao deslizar slides.
const bar = document.createElement("div");
bar.className = "batch-bar";
results.appendChild(bar);
batch.barEl = bar;
renderBatchBar();

results.classList.add("is-visible");
// só agora as medidas valem: antes disso o #results estava em display:none
requestAnimationFrame(ajustarAlturaTrack);
results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderBatchBar() {
if (!batch || !batch.barEl) return;
const bar = batch.barEl;
bar.innerHTML = "";

const pending = batch.slots.filter((s) => s.versions.length === 0 && !s.busy);
const ready = batch.slots.filter((s) => s.versions.length > 0);

if (pending.length > 0 && !batch.generatingRest) {
const note = document.createElement("span");
note.className = "batch-bar-note";
note.textContent = "Revise e edite a primeira aula à vontade — as demais vão seguir a estrutura dela.";
bar.appendChild(note);

const genRestBtn = document.createElement("button");
genRestBtn.type = "button";
genRestBtn.className = "btn btn-gold";
genRestBtn.textContent = `✨ Gerar as demais (${pending.length})`;
genRestBtn.addEventListener("click", openBatchModeModal);
bar.appendChild(genRestBtn);
} else if (batch.generatingRest) {
const note = document.createElement("span");
note.className = "batch-bar-note";
note.textContent = "⏳ Gerando as demais aulas... pode acompanhar no carrossel.";
bar.appendChild(note);
}

// "Baixar Tudo (N)": todas de uma vez, sempre a versão ATIVA de cada
// aula. Só faz sentido com mais de uma aula gerada.
if (ready.length > 1) {
const allBtn = document.createElement("button");
allBtn.type = "button";
allBtn.className = "btn btn-download btn-pptx";
allBtn.textContent = `⬇️ Baixar Tudo (${ready.length})`;
allBtn.addEventListener("click", async () => {
allBtn.disabled = true;
const original = allBtn.textContent;
try {
for (let i = 0; i < ready.length; i++) {
allBtn.textContent = `Gerando ${i + 1}/${ready.length}...`;
await downloadFile({
endpoint: "/api/export-pptx",
lesson: activeLesson(ready[i]),
extension: "pptx",
btn: null,
busyLabel: "",
meta: downloadMeta(ready[i]),
});
}
} catch (err) {
// downloadFile já alertou; interrompe a sequência.
} finally {
allBtn.disabled = false;
allBtn.textContent = original;
}
});
bar.appendChild(allBtn);
}
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
crescerTopico();
const webSearchEl = document.getElementById("webSearch");
if (webSearchEl) webSearchEl.checked = false;
if (youtubeCheckEl) { youtubeCheckEl.checked = false; }
if (youtubeWrapEl) youtubeWrapEl.classList.add("is-hidden");
if (youtubeLuckyEl) { youtubeLuckyEl.checked = false; }
if (youtubeEl) { youtubeEl.value = ""; youtubeEl.disabled = false; }
if (extraActivityCheckEl) { extraActivityCheckEl.checked = false; }
if (extraActivityWrapEl) extraActivityWrapEl.classList.add("is-hidden");
if (extraActivityEl) { extraActivityEl.value = ""; extraActivityEl.disabled = false; extraActivityEl.style.opacity = ""; }
if (extraLuckyEl) extraLuckyEl.checked = false;
selectChoice(languageChoices, "english");
selectedCombos = [];
refreshMatrixBadges();
batch = null;
results.classList.remove("is-visible");
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

const language = selectedValue(languageChoices);
const topic = topicEl.value.trim();
const webSearchEl = document.getElementById("webSearch");
const useWebSearch = Boolean(webSearchEl && webSearchEl.checked);
const videoSearch = !!(youtubeLuckyEl && youtubeLuckyEl.checked && youtubeCheckEl && youtubeCheckEl.checked);
const videoId = (youtubeCheckEl && youtubeCheckEl.checked && !videoSearch) ? extractVideoId(youtubeEl ? youtubeEl.value : "") : null;
/* A instrução da dinâmica é texto livre para o servidor, então "estou com
   sorte" não precisa de campo novo na API: manda-se o pedido escrito. */
const SORTE_DINAMICA = "Proponha VOCÊ a dinâmica, a partir do tema e do nível da turma: " +
  "escolha o formato que melhor servir (debate, entrevista em duplas, jogo, corrida pela sala, " +
  "rodada de perguntas, dramatização) e escreva instruções claras e curtas para o professor conduzir.";
const extraLigado = extraActivityCheckEl && extraActivityCheckEl.checked;
const extraSorte = extraLigado && extraLuckyEl && extraLuckyEl.checked;
const extraActivity = extraSorte ? SORTE_DINAMICA
  : (extraLigado && extraActivityEl && extraActivityEl.value.trim() ? extraActivityEl.value.trim() : null);

// Sem tópico só passa quando há atividade subida — aí o tema vem dela.
if (!topic && !atividadeBase) {
setStatus("Escreva o tópico da aula, ou suba uma atividade pronta para basear a aula nela.", true);
return;
}

if (!profSession) {
setStatus("Entre pelo Fisk Hub antes de gerar — clique em \"Conversation Maker\" por lá.", true);
if (authGate) authGate.scrollIntoView({ behavior: "smooth", block: "center" });
return;
}

if (selectedCombos.length === 0) {
setStatus("Marque ao menos uma combinação de nível × faixa etária na tabela.", true);
return;
}

const combos = selectedCombos.slice();

// Créditos: 1 por aula. Bloqueia antes de qualquer trabalho e confirma o gasto.
// O servidor cobra de novo — aqui é só para o professor não descobrir o limite
// depois de esperar a geração.
if (typeof creditos === "number" && creditos < combos.length) {
setStatus(creditos === 0
? "Seus créditos acabaram. Eles voltam no dia 1º; se precisar antes, fale com a direção."
: "Você tem " + creditos + " crédito(s) e marcou " + combos.length + " combinação(ões). Marque menos ou fale com a direção.", true);
return;
}
if (!(await confirmarCusto(combos.length))) return;

generateBtn.disabled = true;
setStatus(language === "spanish" ? "Creando magia de conversación..." : "Making conversation magic...");
setGenerating(true);
results.classList.remove("is-visible");

try {
// Etapa 1: gera SÓ a primeira combinação. O professor revisa/edita e
// depois clica em "Gerar as demais" — que usam a primeira aula editada
// como referência estrutural.
// Lote com níveis diferentes: não existe escolha de estágio que sirva para
// todos, então cada aula usa os livros do próprio nível (o painel manual
// está escondido nesse caso).

// Atividade pronta subida pelo professor: o texto extraído + o que ele pediu
// para fazer com ela. Vai junto em TODAS as aulas do lote.
const sourceActivity = atividadeBase ? {
texto: atividadeBase.texto,
arquivo: atividadeBase.nomeArquivo,
instrucao: (sourceInstructionEl && sourceInstructionEl.value.trim()) || "",
} : null;

batch = {
language,
videoId: null,
params: { topic, useWebSearch, teacherName: profSession.name, extraActivity, sourceActivity },
slots: combos.map((combo) => ({ combo, versions: [], active: 0, recreations: 0, busy: null, error: null, slideEl: null })),
generatingRest: false,
barEl: null,
};

const first = batch.slots[0];
const payload = {
profToken: profSession.token,
language,
topic,
levelChoice: first.combo.level,
ageGroup: first.combo.age,
useWebSearch,
teacherName: profSession.name,
videoId,
videoSearch,
extraActivity,
sourceActivity,
};
const { lessons, resolvedVideoId, creditos: saldo } = await fetchLessons(payload);
if (typeof saldo === "number") { creditos = saldo; mostrarCreditos(); }

batch.videoId = resolvedVideoId || videoId || null;
const lesson = lessons[0];
stampLesson(lesson, { topic, ageGroup: first.combo.age, useWebSearch }, batch.videoId);
first.versions.push(lesson);
first.active = 0;

renderBatch();
setStatus("");
} catch (err) {
batch = null;
setStatus(err.message || "Não foi possível gerar a aula.", true);
} finally {
generateBtn.disabled = false;
setGenerating(false);
}
});
})();
