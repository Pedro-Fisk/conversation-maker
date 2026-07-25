/* Página "Minhas Aulas" (CHANGES 2.9): lista as atividades que o professor
 * logado já baixou, lendo a aba cm_atividades do fisk-hub-backend (a mesma
 * alimentada pelo backup automático no Drive). "Baixar novamente" aponta
 * para o arquivo já salvo no Drive — só download, nenhuma cópia nova.
 *
 * A sessão é a MESMA do index (localStorage cm-prof-session, herdada do
 * Fisk Hub via #proftok=) — quem chega aqui sem sessão vê a porteira. */

(function () {
const FISK_HUB_API =
"https://script.google.com/macros/s/AKfycbw13tpIVD3Ji9XhWW1VwDSw8qAZOmtMGPV0FI1rlHpEQ7HABumVpi_aMWQXfo7dwkd1/exec";

const authGate = document.getElementById("authGate");
const authGateMsg = document.getElementById("authGateMsg");
const historyPanel = document.getElementById("historyPanel");
const histName = document.getElementById("histName");
const histStatus = document.getElementById("histStatus");
const histList = document.getElementById("histList");

fiskInitThemeToggle("themeToggle", { storageKey: "cm-theme" });

let profSession = null;
try {
const saved = JSON.parse(localStorage.getItem("cm-prof-session") || "null");
if (saved && saved.token && saved.name) profSession = saved;
} catch (e) {}

// Aceita também chegar direto do Hub com #proftok= (mesmo fluxo do index).
const m = location.hash.match(/#proftok=([^&]+)/);
if (m) {
history.replaceState(null, "", location.pathname + location.search);
profSession = { token: decodeURIComponent(m[1]), name: "" };
}

if (!profSession) {
authGate.classList.remove("is-hidden");
return;
}

fetch(FISK_HUB_API, {
method: "POST",
headers: { "Content-Type": "text/plain;charset=utf-8" },
body: JSON.stringify({ action: "cmHistory", token: profSession.token }),
})
.then((r) => r.json())
.then((res) => {
if (!res || !res.ok) {
try { localStorage.removeItem("cm-prof-session"); } catch (e) {}
authGateMsg.textContent = (res && res.error) || "Sua sessão expirou. Entre novamente pelo Fisk Hub.";
authGate.classList.remove("is-hidden");
return;
}
historyPanel.classList.remove("is-hidden");
histName.textContent = profSession.name || "professor(a)";
renderList(res.items || []);
})
.catch(() => {
histStatus.textContent = "Não consegui carregar o histórico agora. Verifique a conexão e recarregue a página.";
historyPanel.classList.remove("is-hidden");
});

function renderList(items) {
if (!items.length) {
histStatus.textContent = "Você ainda não baixou nenhuma atividade. As aulas aparecem aqui depois do primeiro download.";
return;
}
histStatus.textContent = "";
histList.innerHTML = "";
items.forEach((it) => {
const row = document.createElement("div");
row.className = "hist-row";

const info = document.createElement("div");
info.className = "hist-info";

const title = document.createElement("div");
title.className = "hist-topic";
title.textContent = it.topico || it.fileName;
info.appendChild(title);

const sub = document.createElement("div");
sub.className = "hist-sub";
const when = it.t ? new Date(it.t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
sub.textContent = [when, it.idioma, it.nivel && it.faixa ? it.nivel + " · " + it.faixa : it.nivel].filter(Boolean).join("  —  ");
info.appendChild(sub);

row.appendChild(info);

const dl = document.createElement("a");
dl.className = "btn btn-download btn-pptx btn-sm";
dl.textContent = "⬇️ Baixar novamente";
dl.href = "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(it.fileId);
row.appendChild(dl);

histList.appendChild(row);
});
}
})();
