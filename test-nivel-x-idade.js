/* Garante que DIFICULDADE LINGUÍSTICA e EXIGÊNCIA COGNITIVA continuem sendo
 * dois eixos separados no prompt.
 *
 * Em 04/08/2026 professores relataram que as aulas de Avançado ficavam
 * filosóficas demais para turmas de 13-14 anos. A causa: o nível Avançado
 * pedia "critical thinking e raciocínio hipotético" para todo mundo, e a
 * faixa etária viajava só como rótulo, sem instrução nenhuma. Inglês certo,
 * pergunta impossível.
 *
 * O risco de regressão é real e silencioso: basta alguém "melhorar" o texto
 * do nível Avançado e reintroduzir a abstração ali, e o problema volta sem
 * quebrar nada. Este teste falha nesse caso.
 *
 *     node test-nivel-x-idade.js
 */
const { buildUserPrompt, AGE_GUIDANCE, LEVEL_GUIDANCE } = require("./lesson-generation");

let ok = 0, falhou = 0;
function t(nome, cond) {
  console.log(cond ? "✓" : "✗", nome);
  cond ? ok++ : falhou++;
}
const prompt = (ageGroup, level = "advanced") =>
  buildUserPrompt({ language: "en", topic: "Freedom and responsibility", level, ageGroup, sources: [] });

// ── o nível descreve o INGLÊS, não o pensamento
const todas = ["adults", "teens", "preteens"].map((f) => prompt(f));
t("o pedido de raciocínio hipotético saiu do NÍVEL",
  todas.every((p) => !/invite critical thinking, comparison or hypothetical reasoning/.test(p)));
t("Avançado continua exigindo inglês mais rico que o Intermediário",
  todas.every((p) => /richer than Intermediate/.test(p)));

/* ── TETO CEFR (04/08/2026) ────────────────────────────────────────────
   Antes só Real Beginners e Teens declaravam a faixa do Quadro Europeu; os
   níveis adultos traziam só o nome. E "Advanced", sozinho, o modelo lê como
   C1/C2 — enquanto o Avançado desta escola é Fluency/In Focus, ou seja B1
   indo a B2. Sem teto explícito, a aula sai escrita para um aluno que não
   existe aqui. */
t("Avançado declara o teto B2 e proíbe C1",
  /B1 moving into B2/.test(LEVEL_GUIDANCE.advanced.prompt) &&
  /NEVER C1/.test(LEVEL_GUIDANCE.advanced.prompt));
t("Avançado diz que é o topo DESTA escola, não da escala",
  /top of THIS school's track/.test(LEVEL_GUIDANCE.advanced.prompt));
t("Avançado barra vocabulário raro/literário/acadêmico",
  /Do NOT use rare, literary, academic/.test(LEVEL_GUIDANCE.advanced.prompt));
t("Intermediário tem teto B1", /never above B1/.test(LEVEL_GUIDANCE.intermediate.prompt));
t("Básico tem teto A2", /never above A2/.test(LEVEL_GUIDANCE.basic.prompt));
t("TODO nível declara uma faixa CEFR",
  Object.entries(LEVEL_GUIDANCE).every(([, v]) => /CEFR/.test(v.prompt)));
t("os três de espanhol também têm âncora",
  ["spanish_basic", "spanish_intermediate", "spanish_advanced"]
    .every((k) => /CEFR/.test(LEVEL_GUIDANCE[k].prompt)));
t("espanhol avançado também barra C1", /NEVER C1/.test(LEVEL_GUIDANCE.spanish_advanced.prompt));

// ── a idade decide a abstração
t("as três faixas têm instrução de raciocínio",
  ["adults", "teens", "preteens"].every((f) => !!AGE_GUIDANCE[f].thinking));
t("adulto pode abstrair", /can handle abstraction/.test(prompt("adults")));
t("jovem recebe o freio (13-16)", prompt("teens").includes("13-16"));
t("pré-adolescente recebe o freio (10-12)", prompt("preteens").includes("10-12"));
t("o freio NÃO vale para adulto", !/trolley-problem/.test(prompt("adults")));

// ── e o tema continua sendo do professor, em todas
t("o tema do professor nunca é trocado",
  todas.every((p) => /Topic: Freedom and responsibility/.test(p) && /does not change/.test(p)));
t("nada de infantilizar", todas.every((p) => /never make the content childish/.test(p)));

// ── vale também na regeneração de uma seção só
t("o nível Avançado não menciona mais 'hypothetical reasoning'",
  !/hypothetical reasoning/.test(LEVEL_GUIDANCE.advanced.prompt));

console.log("\n" + ok + " passaram, " + falhou + " falharam");
process.exit(falhou ? 1 : 0);
