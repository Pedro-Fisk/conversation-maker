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

const CARA_NOVA = !!document.getElementById("previaSlide");   /* novo.html (direção) x index.html (professores) */
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
/* a cara nova é só da direção: a sessão decide a página (o login e a conferência do profCheck passam por aqui) */
if (session && session.token && !!session.direcao !== CARA_NOVA) { location.replace((session.direcao ? "novo.html" : "./") + location.search + location.hash); return; }
try { ajustaModelo(); } catch (e) {}   /* na primeira chamada o painel ainda não existe: o ajustaModelo() do fim corrige */
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
let creditosAnterior = null;

/* Uma volta na moeda quando o saldo muda — vira feedback do gasto, não enfeite.
   Remover a classe e forçar reflow antes de readicionar é o que faz a animação
   reiniciar quando o saldo cai duas vezes seguidas. */
function girarMoedas() {
document.querySelectorAll("svg.moeda").forEach((m) => {
m.classList.remove("girou");
void m.getBoundingClientRect();
m.classList.add("girou");
m.addEventListener("animationend", () => m.classList.remove("girou"), { once: true });
});
}

function mostrarCreditos() {
const tem = typeof creditos === "number";
// só gira quando havia um número antes e ele mudou (não na primeira carga)
if (tem && typeof creditosAnterior === "number" && creditos !== creditosAnterior) girarMoedas();
creditosAnterior = tem ? creditos : null;
if (creditosPill) creditosPill.classList.toggle("is-hidden", !tem);
if (creditosNum) creditosNum.textContent = tem ? creditos : "-";
if (menuCreditosNum) menuCreditosNum.textContent = tem ? creditos : "-";
if (cardCreditosNum) cardCreditosNum.textContent = tem ? creditos : "-";
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
setSession({ token, name: res.prof.fullName || res.prof.name, direcao: res.direcao === true });
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
.then((res) => { if (res && !res.ok) sessionExpired(); else if (res && res.ok && !!res.direcao !== !!profSession.direcao) setSession(Object.assign({}, profSession, { direcao: res.direcao === true })); })
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
/* ═══ O VISUAL DA ATIVIDADE (27/11/2026) ═══ */
const modeloChoices = document.getElementById("modeloChoices");
const visualPedidoEl = document.getElementById("visualPedido");
const visualWrapEl = document.getElementById("visualWrap");
/* SÓ A DIREÇÃO VÊ O MODELO NOVO (Pedro, 27/11/2026): até fevereiro os professores seguem no clássico de sempre; o
   painel "Visual" aparece e vale só para sessão de direção (profCheck devolve direcao). */
function ehDirecao() { return !!(profSession && profSession.direcao); }
function ajustaModelo() {
  const painel = modeloChoices && (modeloChoices.closest(".passo") || modeloChoices.closest(".panel"));
  if (painel) painel.classList.toggle("is-hidden", !ehDirecao());
  if (typeof previaAtualiza === "function") previaAtualiza();
}
function modeloAtual() {
  if (!ehDirecao()) return "classico"; const b = modeloChoices && modeloChoices.querySelector(".choice.is-active"); return b ? b.getAttribute("data-value") : "tema"; }
if (modeloChoices) {
  modeloChoices.addEventListener("click", (e) => {
    const b = e.target.closest(".choice"); if (!b) return;
    modeloChoices.querySelectorAll(".choice").forEach((x) => x.classList.toggle("is-active", x === b));
    if (visualWrapEl) visualWrapEl.classList.toggle("is-hidden", modeloAtual() !== "tema");
    previaAtualiza();
  });
}
ajustaModelo();
/* a prévia do modelo tema: os slides de verdade, com os cliques e o jogo, numa janela por cima */
const HUB_BASE = "https://pedro-fisk.github.io/fisk-hub/";
function abrirPreviaTema(lesson) {
  if (!window.FiskTema) { alert("O desenhista de slides não carregou. Confira a internet e tente de novo."); return; }
  const fundo = document.createElement("div");
  fundo.style.cssText = "position:fixed;inset:0;z-index:9999;background:#0b0e14;display:flex;flex-direction:column";
  fundo.innerHTML = '<div style="flex:1;position:relative" class="pv-palco"></div><div style="height:60px;display:flex;align-items:center;gap:10px;padding:0 16px;background:#111827;color:#fff;font:700 15px system-ui"><button type="button" class="pv-ant">◀</button><button type="button" class="pv-prox">▶</button><span class="pv-n" style="margin-left:8px;opacity:.8"></span><button type="button" class="pv-fecha" style="margin-left:auto">✕ Fechar a prévia</button></div>';
  fundo.querySelectorAll("button").forEach((b) => { b.style.cssText = "font:700 15px system-ui;color:#fff;background:#1f2937;border:1px solid #374151;border-radius:10px;padding:8px 14px;cursor:pointer;" + (b.classList.contains("pv-fecha") ? "margin-left:auto" : ""); });
  document.body.appendChild(fundo);
  const palco = fundo.querySelector(".pv-palco");
  const dados = Object.assign({}, lesson, { coverLevel: lesson.coverLevel, perfil: lesson.ageLabel || "" });
  const deck = window.FiskTema.montar(dados, lesson.design || {}, { base: HUB_BASE });
  let i = 0, etapa = 0;
  const mostra = () => { const s = deck.slides[i]; palco.innerHTML = ""; palco.appendChild(s.el); window.FiskTema.encaixar(s.el, palco); window.FiskTema.mostrar(deck, i, etapa); fundo.querySelector(".pv-n").textContent = "slide " + (i + 1) + " de " + deck.slides.length; };
  const prox = () => { const s = deck.slides[i]; if (etapa < s.etapas) etapa++; else if (i < deck.slides.length - 1) { i++; etapa = 0; } mostra(); };
  const ant = () => { if (etapa > 0) etapa--; else if (i > 0) { i--; etapa = deck.slides[i].etapas; } mostra(); };
  const tecla = (e) => { if (/ArrowRight|ArrowDown|PageDown| /.test(e.key)) { e.preventDefault(); prox(); } else if (/ArrowLeft|ArrowUp|PageUp/.test(e.key)) { e.preventDefault(); ant(); } else if (e.key === "Escape") fecha(); };
  const fecha = () => { document.removeEventListener("keydown", tecla); window.removeEventListener("resize", mostra); fundo.remove(); };
  palco.addEventListener("click", (e) => { if (e.target.closest("[data-carta],.ft-op")) return; prox(); });
  fundo.querySelector(".pv-prox").onclick = prox; fundo.querySelector(".pv-ant").onclick = ant; fundo.querySelector(".pv-fecha").onclick = fecha;
  document.addEventListener("keydown", tecla); window.addEventListener("resize", mostra);
  mostra();
}
/* MOSTRAR NO PORTAL (27/11/2026): no modelo tema a aula não vira .pptx. Ela vai para o Drive, na pasta do professor
   dentro de "Conversation Maker (portal)", em dois arquivos: o .cmjson (conteúdo + visual, é com ele que o Hub toca a
   aula de novo) e o PDF de backup (cada item do jogo em duas páginas). Quem guarda é o backend do Hub (CmPortal.js). */
async function mostrarNoPortal(lesson, btn) {
  if (!window.FiskTema || typeof FISK_HUB_EP === "undefined") { alert("Não consegui falar com o portal. Confira a internet e tente de novo."); return; }
  if (!profSession || !profSession.token) { alert("Entre pelo Fisk Hub antes de salvar no portal."); return; }
  const rotulo = btn.textContent; btn.disabled = true;
  try {
    const dados = Object.assign({}, lesson, { perfil: lesson.ageLabel || "" });
    const deck = window.FiskTema.montar(dados, lesson.design || {}, { base: HUB_BASE });
    window.FiskTema.som = false;   /* o PDF passa pelos acertos do jogo: sem sino */
    const pdf = await window.FiskTema.gerarPdf(deck, (n, t) => { btn.textContent = "Montando o PDF de backup… " + n + "/" + t; });
    window.FiskTema.som = true;
    let b64 = ""; for (let i = 0; i < pdf.length; i += 32768) b64 += String.fromCharCode.apply(null, pdf.subarray(i, i + 32768));
    btn.textContent = "Guardando no portal…";
    const r = await fetch(FISK_HUB_EP, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "cmPublicar", token: profSession.token, titulo: lesson.coverTitle, nivel: lesson.coverLevel, perfil: lesson.ageLabel || "",
        idioma: lesson.language, dados: JSON.stringify({ versao: 1, lesson: lesson, design: lesson.design || null }), pdf: btoa(b64) }) }).then((x) => x.json());
    if (!r || !r.ok) throw new Error((r && (r.error || r.erro)) || "o portal não respondeu");
    btn.textContent = "✓ Salvo no portal: Hub › Conversação › Minhas conversações";
  } catch (err) {
    window.FiskTema.som = true;
    btn.textContent = rotulo; alert("Não consegui salvar no portal: " + (err.message || err));
  } finally { btn.disabled = false; }
}

/* para os testes de bancada abrirem a prévia sem gerar uma aula (não muda nada na tela) */
window.__cmPrevia = abrirPreviaTema;
window.__cmModelo = modeloAtual;

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
// 502 = a geração falhou e o servidor estornou: o saldo que volta aqui já
// é o restaurado, e sem isto a moeda ficaria mostrando o número debitado.
if ((response.status === 402 || response.status === 502) && typeof data.creditos === "number") {
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
generateBtn.textContent = CARA_NOVA ? `✨ Gerar a 1ª aula (1 de ${n})` : `Gerar primeira aula (1 de ${n}) →`;
} else {
generateBtn.textContent = CARA_NOVA ? "✨ Gerar minha atividade" : "Gerar roteiro →";
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
/* os ícones da cara nova (27/11/2026), como no mockup */
const EMOJI_FAIXA = { preteens: "🧒 ", teens: "🧑 ", adults: "👔 " };
const EMOJI_NIVEL = { real_beginners: "🐣 ", teens: "⭐ ", basic: "🌱 ", intermediate: "🚀 ", advanced: "🏆 ", spanish_basic: "🌱 ", spanish_intermediate: "🚀 ", spanish_advanced: "🏆 " };
AGE_COLS.forEach((age) => {
const th = document.createElement("th");
th.textContent = (CARA_NOVA ? EMOJI_FAIXA[age.key] || "" : "") + age.label;
headRow.appendChild(th);
});
thead.appendChild(headRow);
matrixTable.appendChild(thead);

const tbody = document.createElement("tbody");
(LEVELS_BY_LANG[language] || []).forEach((level) => {
const tr = document.createElement("tr");
const th = document.createElement("th");
th.scope = "row";
th.textContent = (CARA_NOVA ? EMOJI_NIVEL[level.key] || "" : "") + level.label;
tr.appendChild(th);

AGE_COLS.forEach((age) => {
const td = document.createElement("td");
if (level.onlyAge && level.onlyAge !== age.key) {
// Combinação inexistente no curso (ex.: Teens só existe para
// Pré-adolescentes) — célula desabilitada.
td.className = "matrix-na";
td.textContent = "-";
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
if (typeof previaAtualiza === "function") previaAtualiza();
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
/* regenerar o jogo mantém quantas perguntas ele tem */
nJogo: (lesson.languageGame && lesson.languageGame.length) || lesson.nJogo || 6,
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

// Título como o professor vê na tela: com o emoji na frente, igual à capa do
// .pptx. No objeto `lesson` os dois seguem separados (ver lesson-data.js).
function tituloComEmoji(lesson) {
return (lesson.coverEmoji ? lesson.coverEmoji + " " : "") + (lesson.coverTitle || "");
}

/* O cabeçalho da aula fica FORA do bloco editável, então editar o título ali
   dentro não o repintaria sozinho. O cabeçalho certo é achado subindo a partir
   do PRÓPRIO campo editado: num lote, um seletor global pegaria o cabeçalho da
   primeira aula do carrossel e renomearia a aula errada. */
function atualizarCabecalho(campo, lesson) {
const deck = campo && campo.closest ? campo.closest(".deck") : null;
const h3 = deck ? deck.querySelector(".deck-head h3") : null;
if (h3) h3.textContent = tituloComEmoji(lesson);
}

function renderLessonPreview(lesson) {
const sections = document.createElement("div");
sections.className = "slide-list";

const note = document.createElement("p");
note.className = "edit-note";
note.textContent = "✏️ Os blocos começam recolhidos. Clique no título de um deles (ou em \"Expandir tudo\") para revisar e corrigir o texto à vontade. As alterações entram no .pptx ao baixar. Não gostou de uma seção inteira? Use \"🔄 Gerar de novo\" para pedir só aquela parte de novo pra IA, sem mexer no resto.";
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
? "Fecha todos os blocos, mostra só a estrutura da aula"
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

// Título da capa. O emoji do tema é campo SEPARADO, e não parte do título,
// porque o nome do arquivo baixado é montado a partir do título — assim ele
// continua sem emoji. Aqui os dois aparecem lado a lado para o professor
// trocar o emoji que a IA escolheu.
addSection("Título da capa", (body) => {
const linha = document.createElement("div");
linha.className = "edit-title-row";
const emoji = editField(lesson.coverEmoji || "", (v) => {
lesson.coverEmoji = v.trim();
atualizarCabecalho(linha, lesson);
}, { placeholder: "🙂" });
emoji.classList.add("edit-field-emoji");
emoji.title = "Emoji do tema, aparece na capa e nos divisores. Pode apagar se não quiser nenhum.";
emoji.setAttribute("aria-label", "Emoji do tema da aula");
linha.appendChild(emoji);
linha.appendChild(
editField(lesson.coverTitle, (v) => { lesson.coverTitle = v; atualizarCabecalho(linha, lesson); }, { placeholder: "título da aula" })
);
body.appendChild(linha);
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
hint.textContent = "Pergunta aberta, sem resposta-modelo.";
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
if (!lesson.semJogo) addLanguageGameSection(lesson.languageGame, "languageGame");
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
/* SEM JOGO (o interruptor "Jogo no final" desligado): a aula clássica perde o divisor e as 4 páginas do jogo
   (slide-layouts.js, layoutsDaAula) e a do tema simplesmente não tem itens de jogo (o desenhista do portal pula) */
if (batch && batch.params && batch.params.semJogo) { lesson.semJogo = true; lesson.languageGame = []; }
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
modelo: p.modelo,
visual: p.visual,
design: p.design,
nJogo: p.nJogo,
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
body.appendChild(slotMessage("🕐 Aguardando geração, clique em \"Gerar as demais\" abaixo do carrossel.", false));
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
head.dataset.lessonHead = "1";
head.innerHTML = `<h3>${escapeHtml(tituloComEmoji(lesson))}</h3><span>${escapeHtml(lesson.coverLevel)}${lesson.ageLabel ? " · " + escapeHtml(lesson.ageLabel) : ""}</span>`;

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
if (lesson.modelo === "tema") {
  const verBtn = document.createElement("button");
  verBtn.type = "button";
  verBtn.className = "btn btn-download";
  verBtn.textContent = "👁 Ver os slides";
  verBtn.addEventListener("click", () => abrirPreviaTema(activeLesson(slot)));
  foot.appendChild(verBtn);
  const portalBtn = document.createElement("button");
  portalBtn.type = "button";
  portalBtn.className = "btn btn-download btn-generate";
  portalBtn.textContent = "💾 Salvar no portal";
  portalBtn.addEventListener("click", () => mostrarNoPortal(activeLesson(slot), portalBtn));
  foot.appendChild(portalBtn);
} else {
  foot.appendChild(pptxBtn);
}

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
note.textContent = "Revise e edite a primeira aula à vontade. As demais vão seguir a estrutura dela.";
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

/* ══ A PRÉVIA DA CAPA (passo 6, Pedro 27/11/2026) ════════════════════════════════════════════════════════════════
   No visual do tema: assim que o tema está escrito, um pedido pequeno (api/design-preview, não gasta crédito) traz só
   a receita do visual, e o desenhista do portal (FiskTema) desenha a capa aqui. A geração leva essa MESMA receita.
   No modelo clássico: a capa do template de sempre, com o tema. O título final é o que a IA escrever. */
/* var, não const: o ajustaModelo() roda no carregamento ANTES desta linha e chama previaAtualiza */
var gameCheckEl = document.getElementById("gameCheck");
/* QUANTAS PERGUNTAS NO JOGO (Pedro, 27/11/2026): padrão 6, de 1 a 20 (o servidor confere de novo: lesson-generation.js, jogoN) */
var jogoQtdEl = document.getElementById("jogoQtd");
function jogoQtd() { const n = parseInt(jogoQtdEl && jogoQtdEl.value, 10); return n >= 1 ? Math.min(20, n) : 6; }
if (jogoQtdEl) jogoQtdEl.addEventListener("change", () => { jogoQtdEl.value = jogoQtd(); });
if (gameCheckEl && document.getElementById("jogoQtdLinha")) {
  const mostraQtd = () => (document.getElementById("jogoQtdLinha").style.display = gameCheckEl.checked ? "" : "none");
  gameCheckEl.addEventListener("change", mostraQtd); mostraQtd();
}
var previa = { design: null, chave: "", vez: 0, t: null };
function previaEls() { return { box: document.getElementById("previaSlide"), nome: document.getElementById("previaNome"), sub: document.getElementById("previaSub"), pal: document.getElementById("previaPaleta"), outro: document.getElementById("previaOutro") }; }
function tituloDaPrevia(t) { t = String(t || "").trim().split(/[.:;\n]|, (?=[a-zà-ú])/)[0].trim(); if (t.length > 60) t = t.slice(0, 57).replace(/\s+\S*$/, "") + "…"; return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Sua atividade"; }
function comboDaPrevia() { const c = selectedCombos[0]; const lang = selectedValue(languageChoices) || "english"; return { level: c ? c.level : (lang === "spanish" ? "spanish_basic" : "basic"), age: c ? c.age : "teens", lang }; }
function previaDesenha() {
  const e = previaEls(); if (!e.box) return;
  const c = comboDaPrevia(), titulo = tituloDaPrevia(topicEl.value);
  const nivel = levelLabelOf(c.lang, c.level), perfil = ageLabelOf(c.age);
  if (modeloAtual() !== "tema") {
    e.box.innerHTML = '<div class="pv-classica"><span class="pv-k">' + (c.lang === "spanish" ? "CONVERSACIÓN" : "CONVERSATION") + '</span><b></b><i></i></div>';
    e.box.querySelector("b").textContent = titulo; e.box.querySelector("i").textContent = nivel;
    e.nome.textContent = "Modelo clássico"; e.sub.textContent = "O layout de sempre da Fisk, em PowerPoint."; e.pal.innerHTML = ""; if (e.outro) e.outro.hidden = true; return;
  }
  if (e.outro) e.outro.hidden = false;
  if (!previa.design) {
    e.box.innerHTML = '<div class="pv-espera">' + (topicEl.value.trim() ? '<span class="pv-gira"></span>Preparando a capa…' : '✍️ Escreva o tema no passo 1 e a capa aparece aqui.') + '</div>';
    e.nome.textContent = "Visual do tema"; e.sub.textContent = "Cores, fontes e ícones escolhidos para o assunto."; e.pal.innerHTML = ""; return;
  }
  const d = previa.design;
  e.nome.textContent = d.nome || "Visual do tema";
  e.sub.textContent = "Fontes " + d.fontes.titulo + " e " + d.fontes.corpo + " · fundo com " + d.fundo + ".";
  e.pal.innerHTML = ["fundo", "fundo2", "prim", "sec", "dest"].map((k) => '<i style="background:' + d.paleta[k] + '"></i>').join("");
  try {
    const deck = window.FiskTema.montar({ coverTitle: titulo, coverLevel: nivel, perfil, language: c.lang, topic: topicEl.value.trim(), objectives: [], vocabulary: [], introText: "", conversation: [], languageGame: [], evaluation: [] }, d, { base: HUB_BASE });
    const el = deck.slides[0].el; el.style.pointerEvents = "none";
    e.box.innerHTML = ""; e.box.appendChild(el); window.FiskTema.encaixar(el, e.box); requestAnimationFrame(() => window.FiskTema.encaixar(el, e.box));
  } catch (err) { e.box.innerHTML = '<div class="pv-espera">Não consegui desenhar a capa aqui, mas o visual vai junto na geração.</div>'; }
}
function previaPede(forcar) {
  const topic = topicEl.value.trim();
  if (modeloAtual() !== "tema" || !topic || !profSession || !window.FiskTema) { previaDesenha(); return; }
  const c = comboDaPrevia(), visual = (visualPedidoEl && visualPedidoEl.value.trim()) || "";
  const chave = [topic, c.lang, visual].join("|");
  if (!forcar && chave === previa.chave && previa.design) { previaDesenha(); return; }
  previa.chave = chave; previa.design = null; previaDesenha();
  const vez = ++previa.vez;
  fetch("/api/design-preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profToken: profSession.token, topic, language: c.lang, level: c.level, visual }) })
    .then((r) => r.json()).then((j) => {
      if (vez !== previa.vez) return;
      if (!j || !j.ok || !j.design) throw new Error((j && j.error) || "sem visual");
      previa.design = j.design; previaDesenha();
    }).catch((err) => { if (vez !== previa.vez) return; previa.chave = ""; const e = previaEls(); if (e.box) e.box.innerHTML = '<div class="pv-espera">' + String(err.message || "Não consegui preparar a prévia.") + ' <button type="button" class="pv-tenta" id="previaTenta">Tentar de novo</button></div>'; const b = document.getElementById("previaTenta"); if (b) b.onclick = () => previaPede(true); });
}
/* o tema muda: espera a pessoa parar de digitar; o resto (idioma, turma, modelo) só redesenha */
function previaAtualiza() { if (!previa) return; clearTimeout(previa.t); previa.t = setTimeout(() => previaPede(false), 900); }
topicEl.addEventListener("input", () => { clearTimeout(previa.t); previa.t = setTimeout(() => previaPede(false), 1600); });
if (visualPedidoEl) visualPedidoEl.addEventListener("change", () => previaPede(false));
if (languageChoices) languageChoices.addEventListener("click", () => setTimeout(previaAtualiza, 0));
document.getElementById("previaOutro") && document.getElementById("previaOutro").addEventListener("click", () => previaPede(true));
document.getElementById("previaAjustar") && document.getElementById("previaAjustar").addEventListener("click", () => { if (visualPedidoEl) { visualPedidoEl.scrollIntoView({ behavior: "smooth", block: "center" }); visualPedidoEl.focus(); } });
/* as sugestões de tema do passo 1 */
document.querySelectorAll("[data-ideia]").forEach((b) => b.addEventListener("click", () => { topicEl.value = b.getAttribute("data-ideia"); crescerTopico && crescerTopico(); topicEl.focus(); previaPede(false); }));
window.addEventListener("resize", () => { const e = previaEls(); const el = e.box && e.box.firstElementChild; if (el && window.FiskTema && el.classList && !el.classList.contains("pv-espera") && !el.classList.contains("pv-classica")) window.FiskTema.encaixar(el, e.box); });
previaDesenha();

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
if (gameCheckEl) gameCheckEl.checked = true;
previa.design = null; previa.chave = "";
selectChoice(languageChoices, "english");
selectedCombos = [];
refreshMatrixBadges();
previaAtualiza();
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

if (!topic) {
setStatus("Escreva o tópico da aula.", true);
return;
}

if (!profSession) {
setStatus("Entre pelo Fisk Hub antes de gerar, clique em \"Conversation Maker\" por lá.", true);
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

batch = {
language,
videoId: null,
params: { topic, useWebSearch, teacherName: profSession.name, extraActivity, modelo: modeloAtual(), visual: (visualPedidoEl && visualPedidoEl.value.trim()) || null,
  /* o jogo é opcional (27/11/2026) e o visual que o professor viu na prévia vai junto: a aula sai com a mesma cara */
  semJogo: !(gameCheckEl ? gameCheckEl.checked : true), nJogo: jogoQtd(), design: modeloAtual() === "tema" && previa && previa.design ? previa.design : null },
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
modelo: batch.params.modelo,
visual: batch.params.visual,
design: batch.params.design,
nJogo: batch.params.nJogo,
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
