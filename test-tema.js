/* O MODELO "TEMA" (27/11/2026): o adendo do pedido à IA e o saneamento da resposta, sem chamar a IA.
   node test-tema.js */
const G = require("./lesson-generation.js");
let ok = 0, falhas = 0;
const t = (n, c, x) => { if (c) ok++; else { falhas++; console.log("  ✗ " + n + (x ? " → " + x : "")); } };
const ad = G.temaInstrucoes({ level: "advanced", visual: "roxo e preto, com abóboras" });
t("Advanced pede 12 perguntas", /exactly 12 items/.test(ad));
t("e agrupa de 4 em 4", /4 per slide/.test(ad));
t("Basic pede 8", /exactly 8 items/.test(G.temaInstrucoes({ level: "basic" })));
t("o pedido de visual do professor vai junto e manda mais", /roxo e preto/.test(ad) && /follow it over your own idea/.test(ad));
t("lista as fontes permitidas", /Fredoka/.test(ad) && /Playfair Display/.test(ad));
t("pede jogos variados", /at least 3 different types/.test(ad) && /true_false/.test(ad));
const d = G.sanearDesign({ escuro: true, palette: { fundo: "#1a1033", prim: "rosa", txt: "#fdf2ff" }, fontes: { titulo: "Comic Sans", corpo: "Rubik" }, fundo: "chuva", heroi: "Video Game", icones: ["Joystick!", "", "palm tree", 3] });
t("cor inválida vira a reserva", d.paleta.prim === "#1e3a5f" && d.paleta.fundo === "#1a1033");
t("fonte fora da lista vira Poppins; a da lista fica", d.fontes.titulo === "Poppins" && d.fontes.corpo === "Rubik");
t("fundo desconhecido vira bolhas", d.fundo === "bolhas");
t("nomes de ícone viram kebab-case", d.heroi === "video-game" && d.icones[0] === "joystick" && d.icones[1] === "palm-tree" && d.icones.length === 3, JSON.stringify(d.icones));
const j = G.sanearJogoTema([{ type: "true_false", question: "x", options: ["True", "False", "Maybe"], correctIndex: 1 }, { type: "inventado", question: "y", options: ["a"], correctIndex: 7 }]);
t("verdadeiro ou falso fica com 2 opções", j[0].options.length === 2 && j[0].correctIndex === 1);
t("tipo desconhecido vira múltipla escolha com 3 opções e índice válido", j[1].type === "multiple_choice" && j[1].options.length === 3 && j[1].correctIndex === 0);
console.log("");
if (falhas) { console.log("✗ " + falhas + " falha(s), " + ok + " ok"); process.exit(1); }
console.log("✓ " + ok + " regras do modelo tema");
